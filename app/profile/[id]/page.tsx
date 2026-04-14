"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";

type CommunityPost = {
  id: number;
  title: string;
  content: string | null;
  post_type: "free" | "problem";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
  user_id: string;
  author_name?: string | null;
};

/* # 1. 날짜 포맷 */
function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* # 2. 텍스트 줄이기 */
function clampText(text: string, max = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max) + "...";
}

export default function ProfilePage() {
  const params = useParams();
  const profileId = String(params?.id || "");

  /* # 3. 상태값 */
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [message, setMessage] = useState("불러오는 중...");
  const [loading, setLoading] = useState(true);

  /* # 4. 초기 마운트 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  /* # 5. 작성글 로딩 */
  useEffect(() => {
    if (!mounted || !profileId) return;

    const loadProfilePosts = async () => {
      setLoading(true);
      setMessage("불러오는 중...");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/community", {
          headers,
        });

        const data = await res.json();

        if (!res.ok) {
          setPosts([]);
          setMessage(data?.error || "프로필 정보를 불러오지 못했습니다.");
          return;
        }

       const items: CommunityPost[] = Array.isArray(data.posts) ? data.posts : [];
const ownedPosts = items
  .filter((item: CommunityPost) => String(item.user_id) === profileId)
  .sort(
    (a: CommunityPost, b: CommunityPost) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

        setPosts(ownedPosts);
        setMessage(ownedPosts.length ? "" : "아직 작성한 게시글이 없습니다.");
      } catch {
        setPosts([]);
        setMessage("프로필 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadProfilePosts();
  }, [mounted, profileId]);

  /* # 6. 프로필 요약 */
  const profileSummary = useMemo(() => {
    const firstPost = posts[0];

    return {
      displayName: firstPost?.author_name || "작성자",
      total: posts.length,
      free: posts.filter((post) => post.post_type === "free").length,
      problem: posts.filter((post) => post.post_type === "problem").length,
      intro:
        posts.length > 0
          ? "수딱 커뮤니티에서 활동 중인 사용자야. 작성한 게시글들을 아래에서 확인할 수 있어."
          : "아직 공개된 활동 기록이 많지 않아.",
    };
  }, [posts]);

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
      {/* # 7. 상단 헤더 */}
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
                프로필
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                Community Profile · 작성글 모아보기
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
            <Link href="/" className="suddak-btn suddak-btn-ghost">
              홈
            </Link>
            <Link href="/history" className="suddak-btn suddak-btn-ghost">
              기록
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

      {/* # 8. 프로필 요약 카드 */}
      <SectionCard
        title={profileSummary.displayName}
        description={profileSummary.intro}
        style={{ marginBottom: "18px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          <div className="suddak-card-soft" style={{ padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>전체 게시글</div>
            <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
              {profileSummary.total}
            </div>
          </div>

          <div className="suddak-card-soft" style={{ padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>문제글</div>
            <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
              {profileSummary.problem}
            </div>
          </div>

          <div className="suddak-card-soft" style={{ padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>자유글</div>
            <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
              {profileSummary.free}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* # 9. 작성글 목록 */}
      <SectionCard
        title="작성글"
        description="이 사용자가 작성한 최근 게시글 목록이야."
      >
        {loading ? (
          <div
            className="suddak-card-soft"
            style={{
              padding: "18px",
              color: "var(--muted)",
            }}
          >
            불러오는 중...
          </div>
        ) : posts.length === 0 ? (
          <div
            className="suddak-card-soft"
            style={{
              padding: "18px",
              color: "var(--muted)",
              lineHeight: 1.8,
            }}
          >
            {message || "아직 작성한 게시글이 없습니다."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {posts.map((post) => (
              <article
                key={post.id}
                className="suddak-card-soft"
                style={{
                  padding: "16px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                {/* # 9-1. 상단 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span className="suddak-badge">
                        {post.post_type === "problem" ? "문제글" : "자유글"}
                      </span>
                    </div>

                    <Link
                      href={`/community/${post.id}`}
                      style={{
                        fontSize: "20px",
                        fontWeight: 950,
                        letterSpacing: "-0.03em",
                        lineHeight: 1.35,
                        display: "block",
                        wordBreak: "break-word",
                      }}
                    >
                      {post.title}
                    </Link>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      {formatDate(post.created_at)}
                    </div>
                  </div>

                  <Link
                    href={`/community/${post.id}`}
                    className="suddak-btn suddak-btn-ghost"
                  >
                    게시글 보기
                  </Link>
                </div>

                {/* # 9-2. 본문 */}
                {post.content && (
                  <div
                    className="suddak-card"
                    style={{
                      padding: "14px",
                      fontSize: "15px",
                      lineHeight: 1.75,
                    }}
                  >
                    {clampText(post.content, 220)}
                  </div>
                )}

                {/* # 9-3. 문제글 미리보기 */}
                {post.post_type === "problem" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {post.recognized_text && (
                      <div className="suddak-card" style={{ padding: "14px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 900,
                            color: "var(--muted)",
                            marginBottom: "8px",
                          }}
                        >
                          인식된 문제
                        </div>
                        <MarkdownMathBlock
                          content={clampText(post.recognized_text, 180)}
                          isDark={isDark}
                        />
                      </div>
                    )}

                    {post.solve_result && (
                      <div className="suddak-card" style={{ padding: "14px" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 900,
                            color: "var(--muted)",
                            marginBottom: "8px",
                          }}
                        >
                          풀이 결과
                        </div>
                        <MarkdownMathBlock
                          content={clampText(post.solve_result, 180)}
                          isDark={isDark}
                        />
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}