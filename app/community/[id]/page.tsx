"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";

type CommunityPost = {
  id: string | number;
  user_id: string;
  post_type: "free" | "problem";
  history_id: number | null;
  title: string;
  content: string;
  recognized_text: string | null;
  solve_result: string | null;
  image_url: string | null;
  is_public: boolean;
  is_notice: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author_name: string | null;
};

type CommunityComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
};

/* # 1. 날짜 포맷 */
function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = String(params?.id || "");

  /* # 2. 상태값 */
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [viewerLiked, setViewerLiked] = useState(false);

  const [commentInput, setCommentInput] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const [commentLoading, setCommentLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  /* # 3. 초기화 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  /* # 4. 세션 읽기 */
  const getAuthHeader = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return undefined;

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const fetchSessionUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setCurrentUserId(session?.user?.id ?? null);
  };

  /* # 5. 게시글 불러오기 */
  const fetchPost = async () => {
    try {
      setLoading(true);
      setMessage("");

      const headers = await getAuthHeader();

      const res = await fetch(`/api/community/${postId}`, {
        cache: "no-store",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        setPost(null);
        setMessage(data?.error || "게시글을 불러오지 못했습니다.");
        return;
      }

      setPost(data.post);
      setViewerIsAdmin(Boolean(data.viewer_is_admin));
      setViewerLiked(Boolean(data.viewer_liked));
      setCurrentUserId(data.current_user_id ?? null);
    } catch {
      setPost(null);
      setMessage("게시글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* # 6. 댓글 불러오기 */
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/community/${postId}/comments`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) return;

      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      //
    }
  };

  useEffect(() => {
    if (!mounted || !postId) return;
    fetchSessionUser();
    fetchPost();
    fetchComments();
  }, [mounted, postId]);

  /* # 7. 댓글 구조 */
  const topLevelComments = useMemo(
    () => comments.filter((comment) => !comment.parent_comment_id),
    [comments]
  );

  const getReplies = (parentId: string) =>
    comments.filter((comment) => comment.parent_comment_id === parentId);

  /* # 8. 좋아요 */
  const handleLikeToggle = async () => {
    if (!post) return;

    try {
      setLikeLoading(true);

      const headers = await getAuthHeader();
      if (!headers) {
        alert("로그인 후 좋아요를 누를 수 있어.");
        return;
      }

      const res = await fetch(`/api/community/${post.id}/like`, {
        method: "POST",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "좋아요 처리에 실패했습니다.");
        return;
      }

      setViewerLiked(Boolean(data.liked));
      setPost((prev) =>
        prev
          ? {
              ...prev,
              like_count: data.like_count ?? prev.like_count,
            }
          : prev
      );
    } finally {
      setLikeLoading(false);
    }
  };

  /* # 9. 댓글 작성 */
  const handleCommentSubmit = async () => {
    if (!post || !commentInput.trim()) return;

    try {
      setCommentLoading(true);

      const headers = await getAuthHeader();
      if (!headers) {
        alert("로그인 후 댓글을 작성할 수 있어.");
        return;
      }

      const res = await fetch(`/api/community/${post.id}/comments`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "댓글 작성에 실패했습니다.");
        return;
      }

      setCommentInput("");
      await fetchComments();
      setPost((prev) =>
        prev ? { ...prev, comment_count: (prev.comment_count ?? 0) + 1 } : prev
      );
    } finally {
      setCommentLoading(false);
    }
  };

  /* # 10. 대댓글 작성 */
  const handleReplySubmit = async (parentId: string) => {
    if (!post || !replyInput.trim()) return;

    try {
      setReplyLoading(true);

      const headers = await getAuthHeader();
      if (!headers) {
        alert("로그인 후 대댓글을 작성할 수 있어.");
        return;
      }

      const res = await fetch(`/api/community/${post.id}/comments`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyInput.trim(),
          parent_comment_id: parentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "대댓글 작성에 실패했습니다.");
        return;
      }

      setReplyInput("");
      setReplyingToId(null);
      await fetchComments();
      setPost((prev) =>
        prev ? { ...prev, comment_count: (prev.comment_count ?? 0) + 1 } : prev
      );
    } finally {
      setReplyLoading(false);
    }
  };

  /* # 11. 댓글 삭제 */
  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    if (!confirm("댓글을 삭제할까?")) return;

    try {
      setDeleteCommentId(commentId);

      const headers = await getAuthHeader();
      if (!headers) {
        alert("로그인 후 삭제할 수 있어.");
        return;
      }

      const beforeCount = comments.filter(
        (comment) => comment.id === commentId || comment.parent_comment_id === commentId
      ).length;

      const res = await fetch(`/api/community/${post.id}/comments/${commentId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "댓글 삭제에 실패했습니다.");
        return;
      }

      await fetchComments();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: Math.max((prev.comment_count ?? 0) - beforeCount, 0),
            }
          : prev
      );
    } finally {
      setDeleteCommentId(null);
    }
  };

  /* # 12. 게시글 삭제 */
  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm("관리자 권한으로 이 게시글을 삭제할까?")) return;

    try {
      setDeleteLoading(true);

      const headers = await getAuthHeader();
      if (!headers) {
        alert("로그인 후 삭제할 수 있어.");
        return;
      }

      const res = await fetch(`/api/community/${post.id}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "게시글 삭제에 실패했습니다.");
        return;
      }

      alert(data?.message || "게시글이 삭제되었습니다.");
      router.push("/community");
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
      {/* # 13. 상단 헤더 */}
      <header
        className="suddak-card"
        style={{
          position: "sticky",
          top: 14,
          zIndex: 20,
          padding: "14px 16px",
          marginBottom: "18px",
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/community"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "15px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--card)",
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="수딱 로고"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: "clamp(1.55rem, 4vw, 2.3rem)",
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.95,
                }}
              >
                게시글 상세
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                좋아요 · 댓글 · 대댓글 지원
              </div>
            </div>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              width: "min(100%, 420px)",
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={() => router.back()}
            >
              뒤로가기
            </button>
            <Link href="/" className="suddak-btn suddak-btn-ghost">
              홈
            </Link>
            <Link href="/community" className="suddak-btn suddak-btn-ghost">
              커뮤니티
            </Link>
            <div style={{ minWidth: "120px", flex: "1 1 120px" }}>
              <ThemeToggleButton mobileFull={false} />
            </div>
            <MoreMenu
              isDark={isDark}
              onToggleTheme={() => setIsDark(getStoredTheme() === "dark")}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>
      </header>

      {/* # 14. 로딩 / 에러 */}
      {loading ? (
        <SectionCard title="게시글" description="불러오는 중이야.">
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)" }}>
            불러오는 중...
          </div>
        </SectionCard>
      ) : !post ? (
        <SectionCard title="게시글" description="상세 정보를 확인할 수 없어.">
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)", lineHeight: 1.8 }}>
            {message || "게시글을 찾을 수 없습니다."}
          </div>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gap: "18px" }}>
          {/* # 15. 본문 */}
          <SectionCard
            title={post.title}
            description="게시글 본문과 작성 정보야."
            rightSlot={
              <span className="suddak-badge">
                {post.is_notice ? "공지" : post.post_type === "problem" ? "문제글" : "자유글"}
              </span>
            }
          >
            <div style={{ display: "grid", gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: "14px",
                  color: "var(--muted)",
                  fontWeight: 700,
                }}
              >
                <Link href={`/profile/${post.user_id}`} style={{ color: "var(--primary)", fontWeight: 800 }}>
                  {post.author_name || "작성자"}
                </Link>
                <span>·</span>
                <span>{formatDateTime(post.created_at)}</span>
                <span>·</span>
                <span>좋아요 {post.like_count ?? 0}</span>
                <span>·</span>
                <span>댓글 {post.comment_count ?? 0}</span>
              </div>

              <div className="suddak-card-soft" style={{ padding: "16px" }}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, wordBreak: "break-word" }}>
                  {post.content || "본문 내용이 없습니다."}
                </div>
              </div>

              {post.post_type === "problem" && (
                <div style={{ display: "grid", gap: "12px" }}>
                  {post.recognized_text && (
                    <div className="suddak-card" style={{ padding: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)", marginBottom: "8px" }}>
                        인식된 문제
                      </div>
                      <MarkdownMathBlock content={post.recognized_text} isDark={isDark} />
                    </div>
                  )}

                  {post.solve_result && (
                    <div className="suddak-card" style={{ padding: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)", marginBottom: "8px" }}>
                        풀이 결과
                      </div>
                      <MarkdownMathBlock content={post.solve_result} isDark={isDark} />
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className={`suddak-btn ${viewerLiked ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                >
                  {likeLoading ? "처리 중..." : viewerLiked ? `좋아요 취소 (${post.like_count ?? 0})` : `좋아요 (${post.like_count ?? 0})`}
                </button>

                {viewerIsAdmin && (
                  <button
                    type="button"
                    className="suddak-btn suddak-btn-ghost"
                    onClick={handleDeletePost}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "삭제 중..." : "관리자 삭제"}
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* # 16. 댓글 작성 */}
          <SectionCard
            title="댓글"
            description="댓글과 대댓글을 통해 풀이 방식이나 질문을 나눌 수 있어."
          >
            <div style={{ display: "grid", gap: "14px" }}>
              <textarea
                className="suddak-textarea"
                placeholder="댓글을 입력해줘"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="suddak-btn suddak-btn-primary"
                  onClick={handleCommentSubmit}
                  disabled={!commentInput.trim() || commentLoading}
                >
                  {commentLoading ? "댓글 작성 중..." : "댓글 작성"}
                </button>
              </div>

              {/* # 17. 댓글 목록 */}
              <div style={{ display: "grid", gap: "12px" }}>
                {topLevelComments.length === 0 ? (
                  <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                    아직 댓글이 없습니다.
                  </div>
                ) : (
                  topLevelComments.map((comment) => {
                    const replies = getReplies(comment.id);
                    const canDeleteComment =
                      viewerIsAdmin || (currentUserId && currentUserId === comment.user_id);

                    return (
                      <div key={comment.id} className="suddak-card-soft" style={{ padding: "14px" }}>
                        <div style={{ display: "grid", gap: "10px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                alignItems: "center",
                                fontSize: "13px",
                                color: "var(--muted)",
                                fontWeight: 700,
                              }}
                            >
                              <span style={{ color: "var(--primary)", fontWeight: 800 }}>
                                {comment.author_name || "작성자"}
                              </span>
                              <span>·</span>
                              <span>{formatDateTime(comment.created_at)}</span>
                            </div>

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="suddak-btn suddak-btn-ghost"
                                onClick={() =>
                                  setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                                }
                              >
                                답글
                              </button>

                              {canDeleteComment && (
                                <button
                                  type="button"
                                  className="suddak-btn suddak-btn-ghost"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deleteCommentId === comment.id}
                                >
                                  {deleteCommentId === comment.id ? "삭제 중..." : "삭제"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, wordBreak: "break-word" }}>
                            {comment.content}
                          </div>

                          {/* # 18. 대댓글 입력 */}
                          {replyingToId === comment.id && (
                            <div className="suddak-card" style={{ padding: "12px" }}>
                              <div style={{ display: "grid", gap: "10px" }}>
                                <textarea
                                  className="suddak-textarea"
                                  placeholder="대댓글을 입력해줘"
                                  value={replyInput}
                                  onChange={(e) => setReplyInput(e.target.value)}
                                />

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                    gap: "10px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="suddak-btn suddak-btn-primary"
                                    onClick={() => handleReplySubmit(comment.id)}
                                    disabled={!replyInput.trim() || replyLoading}
                                  >
                                    {replyLoading ? "대댓글 작성 중..." : "대댓글 등록"}
                                  </button>

                                  <button
                                    type="button"
                                    className="suddak-btn suddak-btn-ghost"
                                    onClick={() => {
                                      setReplyingToId(null);
                                      setReplyInput("");
                                    }}
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* # 19. 대댓글 목록 */}
                          {replies.length > 0 && (
                            <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
                              {replies.map((reply) => {
                                const canDeleteReply =
                                  viewerIsAdmin || (currentUserId && currentUserId === reply.user_id);

                                return (
                                  <div
                                    key={reply.id}
                                    className="suddak-card"
                                    style={{
                                      padding: "12px 14px",
                                      marginLeft: "18px",
                                      borderLeft: "3px solid var(--primary)",
                                    }}
                                  >
                                    <div style={{ display: "grid", gap: "8px" }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: "10px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "8px",
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                            fontSize: "13px",
                                            color: "var(--muted)",
                                            fontWeight: 700,
                                          }}
                                        >
                                          <span style={{ color: "var(--primary)", fontWeight: 800 }}>
                                            {reply.author_name || "작성자"}
                                          </span>
                                          <span>·</span>
                                          <span>{formatDateTime(reply.created_at)}</span>
                                        </div>

                                        {canDeleteReply && (
                                          <button
                                            type="button"
                                            className="suddak-btn suddak-btn-ghost"
                                            onClick={() => handleDeleteComment(reply.id)}
                                            disabled={deleteCommentId === reply.id}
                                          >
                                            {deleteCommentId === reply.id ? "삭제 중..." : "삭제"}
                                          </button>
                                        )}
                                      </div>

                                      <div
                                        style={{
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.75,
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {reply.content}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </SectionCard>

          {/* # 20. 하단 이동 */}
          <SectionCard title="이동" description="다른 페이지로 바로 이동할 수 있어.">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "10px",
              }}
            >
              <Link href="/community" className="suddak-btn suddak-btn-ghost">
                커뮤니티 목록
              </Link>
              <Link href={`/profile/${post.user_id}`} className="suddak-btn suddak-btn-ghost">
                작성자 프로필
              </Link>
              <Link href="/community/write" className="suddak-btn suddak-btn-primary">
                새 글 작성
              </Link>
            </div>
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}