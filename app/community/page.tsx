"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import NotificationBellPopup from "@/components/NotificationBellPopup";

import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MoreMenu from "@/components/MoreMenu";

type CommunityPost = {
  id: number | string;
  user_id: string;
  post_type: "free" | "problem";
  title: string;
  content: string | null;
  recognized_text: string | null;
  solve_result: string | null;
  like_count: number;
  comment_count: number;
  is_notice?: boolean;
  created_at: string;
  author_name?: string | null;
};

type PostFilter = "all" | "free" | "problem";

/* # 1. 날짜 포맷 */
function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function CommunityPage() {
  /* # 2. 상태값 */
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("불러오는 중...");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PostFilter>("all");

  /* # 3. 초기화 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  /* # 4. 게시글 로딩 */
  useEffect(() => {
    if (!mounted) return;

    const loadPosts = async () => {
      setLoading(true);
      setMessage("불러오는 중...");

      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "30");
        if (filter !== "all") params.set("postType", filter);
        if (search.trim()) params.set("search", search.trim());

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/community?${params.toString()}`, {
          headers,
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setPosts([]);
          setMessage(data?.error || "게시글을 불러오지 못했습니다.");
          return;
        }

        const nextPosts = Array.isArray(data.posts) ? data.posts : [];
        setPosts(nextPosts);
        setMessage(nextPosts.length ? "" : "아직 게시글이 없습니다.");
      } catch {
        setPosts([]);
        setMessage("게시글을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [mounted, search, filter]);

  /* # 5. 통계 */
  const stat = useMemo(() => {
    return {
      total: posts.length,
      free: posts.filter((post) => post.post_type === "free").length,
      problem: posts.filter((post) => post.post_type === "problem").length,
    };
  }, [posts]);

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
      {/* # 6. 상단 헤더 */}
      <header
        className="suddak-card community-page-header"
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
            href="/"
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
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.95,
                }}
              >
                커뮤니티
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                목록 · 제목 / 작성자 / 시간 / 좋아요 / 댓글
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

            <Link href="/community/write" className="suddak-btn suddak-btn-primary">
              글쓰기
            </Link>
<NotificationBellPopup isDark={isDark} />
            <div style={{ minWidth: "120px", flex: "1 1 120px" }}>
              <ThemeToggleButton mobileFull={false} />
            </div>
            <MoreMenu
              isDark={isDark}
              onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>
      </header>

      {/* # 7. 상단 요약 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>전체 게시글</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.total}
          </div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>자유글</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.free}
          </div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>문제글</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.problem}
          </div>
        </div>
      </section>

      {/* # 8. 검색 / 필터 */}
      <SectionCard
        title="게시글 찾기"
        description="제목, 내용, 문제 텍스트까지 검색 가능해."
        style={{ marginBottom: "18px" }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <input
            className="suddak-input"
            placeholder="제목, 작성자, 내용 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
            }}
          >
            <select
              className="suddak-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as PostFilter)}
            >
              <option value="all">전체 글</option>
              <option value="free">자유글만</option>
              <option value="problem">문제글만</option>
            </select>

            <Link href="/community/write" className="suddak-btn suddak-btn-primary">
              새 글 작성하기
            </Link>

          </div>
        </div>
      </SectionCard>

      {/* # 9. 게시글 목록 */}
      <SectionCard
        title="게시글 목록"
        description="목록에서는 핵심 정보만 간단히 보이고, 상세로 들어가면 댓글과 대댓글까지 볼 수 있어."
      >
        {loading ? (
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)" }}>
            불러오는 중...
          </div>
        ) : posts.length === 0 ? (
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)", lineHeight: 1.8 }}>
            {message || "아직 게시글이 없습니다."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {posts.map((post) => (
              <article
                key={post.id}
                className="suddak-card-soft"
                style={{
                  padding: "14px 16px",
                }}
              >
                <Link
                  href={`/community/${post.id}`}
                  style={{
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="suddak-badge">
                      {post.is_notice ? "공지" : post.post_type === "problem" ? "문제글" : "자유글"}
                    </span>

                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 900,
                        letterSpacing: "-0.03em",
                        lineHeight: 1.35,
                        wordBreak: "break-word",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {post.title}
                    </div>
                  </div>

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
                    <span>{post.author_name || "작성자"}</span>
                    <span>·</span>
                    <span>{formatDate(post.created_at)}</span>
                    <span>·</span>
                    <span>좋아요 {post.like_count ?? 0}</span>
                    <span>·</span>
                    <span>댓글 {post.comment_count ?? 0}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
