"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";
import { buildShareUrlFromHistory } from "@/lib/community-share";
import { buildSimilarProblemUrl } from "@/lib/similar-problem";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";

type HistoryItem = {
  id: number;
  action_type: "read" | "solve";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
};

type FilterType = "all" | "read" | "solve";

/* # 1. 로컬 저장 키 */
const BOOKMARK_KEY = "suddak_history_bookmarks";
const REVIEW_KEY = "suddak_history_review_notes";

/* # 2. 로컬 북마크 읽기 */
function getSavedBookmarks(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

/* # 3. 로컬 오답노트 읽기 */
function getSavedReviewNotes(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

/* # 4. 날짜 포맷 */
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

export default function HistoryPage() {
  /* # 5. 상태값 */
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState("불러오는 중...");
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showReviewOnly, setShowReviewOnly] = useState(false);

  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [reviewNotes, setReviewNotes] = useState<number[]>([]);

  /* # 6. 초기 마운트 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setBookmarks(getSavedBookmarks());
    setReviewNotes(getSavedReviewNotes());
    setMounted(true);
  }, []);

  /* # 7. 기록 로딩 */
  useEffect(() => {
    if (!mounted) return;

    const load = async () => {
      setLoading(true);
      setMessage("불러오는 중...");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setItems([]);
          setMessage("로그인이 필요합니다.");
          return;
        }

        const res = await fetch("/api/history", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setItems([]);
          setMessage(data?.error || "기록을 불러오지 못했습니다.");
          return;
        }

        setItems(data.items || []);
        setMessage(data.items?.length ? "" : "아직 기록이 없습니다.");
      } catch {
        setItems([]);
        setMessage("기록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mounted]);

  /* # 8. 북마크 저장 */
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, mounted]);

  /* # 9. 오답노트 저장 */
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewNotes));
  }, [reviewNotes, mounted]);

  /* # 10. 토글 핸들러 */
  const toggleBookmark = (id: number) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleReview = (id: number) => {
    setReviewNotes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  /* # 11. 필터링 결과 */
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filterType !== "all" && item.action_type !== filterType) return false;
      if (showBookmarksOnly && !bookmarks.includes(item.id)) return false;
      if (showReviewOnly && !reviewNotes.includes(item.id)) return false;

      if (!keyword) return true;

      const target = [
        item.recognized_text || "",
        item.solve_result || "",
        item.action_type || "",
      ]
        .join(" ")
        .toLowerCase();

      return target.includes(keyword);
    });
  }, [items, filterType, search, showBookmarksOnly, showReviewOnly, bookmarks, reviewNotes]);

  /* # 12. 통계 */
  const stat = useMemo(() => {
    return {
      total: items.length,
      read: items.filter((item) => item.action_type === "read").length,
      solve: items.filter((item) => item.action_type === "solve").length,
      bookmarks: bookmarks.length,
      review: reviewNotes.length,
    };
  }, [items, bookmarks, reviewNotes]);

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
                내 기록
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                History · 문제 읽기와 풀이 기록
              </div>
            </div>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              width: "min(100%, 340px)",
              marginLeft: "auto",
            }}
          >
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
              onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>
      </header>

      {/* # 14. 상단 요약 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>전체 기록</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.total}
          </div>
        </div>

        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>문제 읽기</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.read}
          </div>
        </div>

        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>풀이 생성</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.solve}
          </div>
        </div>

        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>북마크</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.bookmarks}
          </div>
        </div>

        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>오답노트</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
            {stat.review}
          </div>
        </div>
      </section>

      {/* # 15. 필터 */}
      <SectionCard
        title="기록 필터"
        description="유형별로 걸러 보고, 북마크나 오답노트만 따로 확인할 수 있어."
        style={{ marginBottom: "18px" }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <input
            className="suddak-input"
            placeholder="인식 내용, 풀이 내용 검색"
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              <option value="all">전체</option>
              <option value="read">문제 읽기만</option>
              <option value="solve">풀이 생성만</option>
            </select>

            <label
              className="suddak-card-soft"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={showBookmarksOnly}
                onChange={(e) => setShowBookmarksOnly(e.target.checked)}
              />
              북마크만 보기
            </label>

            <label
              className="suddak-card-soft"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={showReviewOnly}
                onChange={(e) => setShowReviewOnly(e.target.checked)}
              />
              오답노트만 보기
            </label>
          </div>
        </div>
      </SectionCard>

      {/* # 16. 기록 목록 */}
      <SectionCard
        title="기록 목록"
        description="필요한 기록은 북마크하거나, 오답노트로 따로 표시해 둘 수 있어."
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
        ) : filteredItems.length === 0 ? (
          <div
            className="suddak-card-soft"
            style={{
              padding: "18px",
              color: "var(--muted)",
              lineHeight: 1.8,
            }}
          >
            {message || "조건에 맞는 기록이 없습니다."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {filteredItems.map((item) => {
              const bookmarked = bookmarks.includes(item.id);
              const reviewed = reviewNotes.includes(item.id);

              return (
                <article
                  key={item.id}
                  className="suddak-card-soft"
                  style={{
                    padding: "16px",
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  {/* # 16-1. 상단 정보 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span className="suddak-badge">
                        {item.action_type === "read" ? "문제 읽기" : "풀이 생성"}
                      </span>

                      {bookmarked && <span className="suddak-badge">북마크</span>}
                      {reviewed && <span className="suddak-badge">오답노트</span>}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  {/* # 16-2. 문제 내용 */}
                  {item.recognized_text && (
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
                        content={item.recognized_text}
                        isDark={isDark}
                      />
                    </div>
                  )}

                  {/* # 16-3. 풀이 내용 */}
                  {item.solve_result && (
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
                        content={item.solve_result}
                        isDark={isDark}
                      />
                    </div>
                  )}

                  {/* # 16-4. 액션 버튼 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      className={`suddak-btn ${bookmarked ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                      onClick={() => toggleBookmark(item.id)}
                    >
                      {bookmarked ? "북마크 해제" : "북마크"}
                    </button>

                    <button
                      type="button"
                      className={`suddak-btn ${reviewed ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                      onClick={() => toggleReview(item.id)}
                    >
                      {reviewed ? "오답노트 해제" : "오답노트"}
                    </button>

                    <Link
                      href={buildSimilarProblemUrl({
                        historyId: item.id,
                        source: "history",
                      })}
                      className="suddak-btn suddak-btn-ghost"
                    >
                      유사문제 생성 Beta
                    </Link>

                    <Link
                      href={buildShareUrlFromHistory(item)}
                      className="suddak-btn suddak-btn-ghost"
                    >
                      커뮤니티 공유
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
