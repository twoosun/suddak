"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import SuddakCommunityHeader from "@/components/suddak-community-header";
import { getStoredTheme } from "@/lib/theme";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CommunityPost = {
  id: string;
  user_id: string;
  post_type: "free" | "problem";
  history_id: number | null;
  title: string;
  content: string;
  recognized_text: string | null;
  solve_result: string | null;
  image_url: string | null;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
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
  author_avatar_url: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function MarkdownMath({
  children,
  isDark,
}: {
  children: string;
  isDark: boolean;
}) {
  return (
    <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = String(params.id);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  const theme = useMemo(
    () => ({
      bg: isDark
        ? "linear-gradient(180deg, #0b1220 0%, #111827 50%, #0f172a 100%)"
        : "linear-gradient(180deg, #f8faff 0%, #f4f6fb 50%, #f7f8fc 100%)",
      card: isDark ? "#111827" : "#ffffff",
      cardBorder: isDark ? "#253041" : "#e5e7eb",
      text: isDark ? "#f9fafb" : "#111827",
      subText: isDark ? "#cbd5e1" : "#6b7280",
      softCard: isDark ? "#0f172a" : "#f8fafc",
      inputBg: isDark ? "#0b1220" : "#ffffff",
      inputBorder: isDark ? "#374151" : "#d1d5db",
      softBorder: isDark ? "#334155" : "#e5e7eb",
      shadow: isDark
        ? "0 8px 30px rgba(0, 0, 0, 0.35)"
        : "0 8px 30px rgba(15, 23, 42, 0.05)",
      primary: "#3157c8",
      problemBox: isDark ? "rgba(16, 185, 129, 0.08)" : "#ecfdf5",
      problemBorder: isDark ? "#14532d" : "#bbf7d0",
    }),
    [isDark]
  );

  const isOwner = !!post && !!currentUserId && post.user_id === currentUserId;

  const topLevelComments = useMemo(
    () => comments.filter((comment) => !comment.parent_comment_id),
    [comments]
  );

  const getReplies = (parentId: string) =>
    comments.filter((comment) => comment.parent_comment_id === parentId);

  const fetchSessionUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setCurrentUserId(session?.user?.id ?? null);
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await fetch(`/api/community/${postId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorText(data?.error || "게시글을 불러오지 못했습니다.");
        setPost(null);
        return;
      }

      setPost(data.post);
    } catch (error) {
      console.error(error);
      setErrorText("게시글을 불러오지 못했습니다.");
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/community/${postId}/comments`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) return;
      setComments(data.comments ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!postId) return;
    fetchSessionUser();
    fetchPost();
    fetchComments();
  }, [postId]);

  const handleLikeToggle = async () => {
    try {
      setLikeLoading(true);
      setMessageText("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageText("좋아요를 누르려면 로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/community/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageText(data?.error || "좋아요 처리에 실패했습니다.");
        return;
      }

      setMessageText(data?.message || "");
      setPost((prev) =>
        prev
          ? {
              ...prev,
              like_count: data.like_count ?? prev.like_count,
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      setMessageText("좋아요 처리 중 오류가 발생했습니다.");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = commentInput.trim();
    if (!trimmed) return;

    try {
      setCommentLoading(true);
      setMessageText("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageText("댓글 작성에는 로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/community/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageText(data?.error || "댓글 작성에 실패했습니다.");
        return;
      }

      setCommentInput("");
      setMessageText(data?.message || "댓글이 작성되었습니다.");

      await fetchComments();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: prev.comment_count + 1,
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      setMessageText("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleReplySubmit = async (parentCommentId: string) => {
    const trimmed = replyInput.trim();
    if (!trimmed) return;

    try {
      setReplyLoading(true);
      setMessageText("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageText("대댓글 작성에는 로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/community/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: trimmed,
          parent_comment_id: parentCommentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageText(data?.error || "대댓글 작성에 실패했습니다.");
        return;
      }

      setReplyInput("");
      setReplyingToId(null);
      setMessageText(data?.message || "대댓글이 작성되었습니다.");

      await fetchComments();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: prev.comment_count + 1,
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      setMessageText("대댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    const ok = window.confirm("이 게시글을 삭제할까요?");
    if (!ok) return;

    try {
      setDeleteLoading(true);
      setMessageText("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageText("삭제하려면 로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/community/${post.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageText(data?.error || "삭제에 실패했습니다.");
        return;
      }

      router.push("/community");
    } catch (error) {
      console.error(error);
      setMessageText("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <SuddakCommunityHeader current="community" />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px 48px" }}>
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "24px",
              padding: "24px",
              color: theme.subText,
              boxShadow: theme.shadow,
            }}
          >
            불러오는 중...
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <SuddakCommunityHeader current="community" />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px 48px" }}>
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "24px",
              padding: "24px",
              boxShadow: theme.shadow,
            }}
          >
            <p style={{ margin: 0, color: "#ef4444" }}>{errorText || "게시글을 찾을 수 없습니다."}</p>
            <Link
              href="/community"
              style={{
                display: "inline-block",
                marginTop: "16px",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                backgroundColor: theme.softCard,
                fontWeight: 800,
              }}
            >
              목록으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <SuddakCommunityHeader current="community" />

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/community"
            style={{
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: "999px",
              border: `1px solid ${theme.inputBorder}`,
              color: theme.text,
              backgroundColor: theme.softCard,
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            ← 목록으로
          </Link>

          <span
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 800,
              backgroundColor:
                post.post_type === "problem"
                  ? isDark
                    ? "#052e16"
                    : "#dcfce7"
                  : isDark
                  ? "#082f49"
                  : "#e0f2fe",
              color:
                post.post_type === "problem"
                  ? isDark
                    ? "#86efac"
                    : "#15803d"
                  : isDark
                  ? "#7dd3fc"
                  : "#0369a1",
            }}
          >
            {post.post_type === "problem" ? "문제글" : "자유글"}
          </span>
        </div>

        <article
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: "24px",
            padding: "24px",
            boxShadow: theme.shadow,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            {post.title}
          </h1>

          <div style={{ marginTop: "10px", fontSize: "14px", color: theme.subText }}>
            작성자 {post.author_name ?? "익명"}
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: theme.subText }}>
            <span>{formatDateTime(post.created_at)}</span>
            <span>좋아요 {post.like_count}</span>
            <span>댓글 {post.comment_count}</span>
          </div>

          <div style={{ marginTop: "22px" }}>
            <MarkdownMath isDark={isDark}>{post.content}</MarkdownMath>
          </div>

          {post.post_type === "problem" && (
            <div
              style={{
                marginTop: "28px",
                padding: "18px",
                borderRadius: "20px",
                border: `1px solid ${theme.problemBorder}`,
                backgroundColor: theme.problemBox,
              }}
            >
              {post.recognized_text ? (
                <div style={{ marginBottom: "18px" }}>
                  <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 800 }}>
                    인식된 문제
                  </h2>
                  <div
                    style={{
                      borderRadius: "16px",
                      padding: "14px",
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <MarkdownMath isDark={isDark}>{post.recognized_text}</MarkdownMath>
                  </div>
                </div>
              ) : null}

              {post.solve_result ? (
                <div style={{ marginBottom: post.image_url || post.history_id ? "18px" : 0 }}>
                  <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 800 }}>
                    풀이 결과
                  </h2>
                  <div
                    style={{
                      borderRadius: "16px",
                      padding: "14px",
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                    }}
                  >
                    <MarkdownMath isDark={isDark}>{post.solve_result}</MarkdownMath>
                  </div>
                </div>
              ) : null}

              {post.image_url ? (
                <div style={{ marginBottom: post.history_id ? "18px" : 0 }}>
                  <h2 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 800 }}>
                    문제 이미지
                  </h2>
                  <img
                    src={post.image_url}
                    alt="문제 이미지"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "420px",
                      objectFit: "contain",
                      borderRadius: "16px",
                      border: `1px solid ${theme.cardBorder}`,
                      backgroundColor: theme.card,
                    }}
                  />
                </div>
              ) : null}

              {post.history_id ? (
                <p style={{ margin: 0, fontSize: "12px", color: theme.subText }}>
                  연결된 history ID: {post.history_id}
                </p>
              ) : null}
            </div>
          )}

          <div style={{ marginTop: "22px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={likeLoading}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "12px 16px",
                borderRadius: "16px",
                backgroundColor: theme.primary,
                color: "#fff",
                fontWeight: 800,
                fontSize: "14px",
                opacity: likeLoading ? 0.7 : 1,
              }}
            >
              {likeLoading ? "처리 중..." : "좋아요"}
            </button>

            {isOwner ? (
              <>
                <Link
                  href={`/community/${post.id}/edit`}
                  style={{
                    textDecoration: "none",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.softCard,
                    color: theme.text,
                    fontWeight: 800,
                    fontSize: "14px",
                  }}
                >
                  수정
                </Link>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{
                    cursor: "pointer",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    border: isDark ? "1px solid rgba(248,113,113,0.3)" : "1px solid #fecaca",
                    backgroundColor: isDark ? "rgba(127,29,29,0.15)" : "#fff5f5",
                    color: isDark ? "#fca5a5" : "#dc2626",
                    fontWeight: 800,
                    fontSize: "14px",
                    opacity: deleteLoading ? 0.7 : 1,
                  }}
                >
                  {deleteLoading ? "삭제 중..." : "삭제"}
                </button>
              </>
            ) : null}
          </div>

          {messageText ? (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.softCard,
                color: theme.subText,
                fontSize: "14px",
              }}
            >
              {messageText}
            </div>
          ) : null}
        </article>

        <section
          style={{
            marginTop: "20px",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: "24px",
            padding: "24px",
            boxShadow: theme.shadow,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900 }}>댓글</h2>

          <form onSubmit={handleCommentSubmit} style={{ marginTop: "16px" }}>
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="댓글을 입력하세요"
              rows={4}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={commentLoading}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "12px 16px",
                  borderRadius: "16px",
                  backgroundColor: theme.primary,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "14px",
                  opacity: commentLoading ? 0.7 : 1,
                }}
              >
                {commentLoading ? "작성 중..." : "댓글 작성"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: "22px", display: "grid", gap: "14px" }}>
            {topLevelComments.length === 0 ? (
              <div
                style={{
                  borderRadius: "16px",
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.softCard,
                  padding: "16px",
                  color: theme.subText,
                  fontSize: "14px",
                }}
              >
                아직 댓글이 없습니다.
              </div>
            ) : (
              topLevelComments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    borderRadius: "18px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.softCard,
                    padding: "16px",
                  }}
                >
                  <div style={{ marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px", color: theme.subText }}>
                    <span>{comment.author_name ?? "익명"}</span>
                    <span>•</span>
                    <span>{formatDateTime(comment.created_at)}</span>
                  </div>

                  <MarkdownMath isDark={isDark}>{comment.content}</MarkdownMath>

                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                      }
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.card,
                        color: theme.text,
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {replyingToId === comment.id ? "취소" : "답글"}
                    </button>
                  </div>

                  {replyingToId === comment.id ? (
                    <div
                      style={{
                        marginTop: "12px",
                        borderRadius: "16px",
                        backgroundColor: theme.card,
                        border: `1px solid ${theme.cardBorder}`,
                        padding: "14px",
                      }}
                    >
                      <textarea
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="대댓글을 입력하세요"
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: "16px",
                          border: `1px solid ${theme.inputBorder}`,
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          fontSize: "14px",
                          outline: "none",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyInput("");
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "10px 14px",
                            borderRadius: "14px",
                            border: `1px solid ${theme.inputBorder}`,
                            backgroundColor: theme.softCard,
                            color: theme.text,
                            fontWeight: 800,
                            fontSize: "13px",
                          }}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={replyLoading}
                          style={{
                            border: "none",
                            cursor: "pointer",
                            padding: "10px 14px",
                            borderRadius: "14px",
                            backgroundColor: theme.primary,
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "13px",
                            opacity: replyLoading ? 0.7 : 1,
                          }}
                        >
                          {replyLoading ? "작성 중..." : "답글 작성"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {getReplies(comment.id).length > 0 ? (
                    <div
                      style={{
                        marginTop: "14px",
                        paddingLeft: "14px",
                        borderLeft: `2px solid ${theme.softBorder}`,
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      {getReplies(comment.id).map((reply) => (
                        <div
                          key={reply.id}
                          style={{
                            borderRadius: "16px",
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.cardBorder}`,
                            padding: "14px",
                          }}
                        >
                          <div style={{ marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "12px", color: theme.subText }}>
                            <span>{reply.author_name ?? "익명"}</span>
                            <span>•</span>
                            <span>{formatDateTime(reply.created_at)}</span>
                          </div>
                          <MarkdownMath isDark={isDark}>{reply.content}</MarkdownMath>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}