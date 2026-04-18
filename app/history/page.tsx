"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MoreMenu from "@/components/MoreMenu";
import WorksheetDocument from "@/components/worksheet/WorksheetDocument";
import { buildShareUrlFromHistory } from "@/lib/community-share";
import { printElementInNewWindow } from "@/lib/print-window";
import { getStoredSimilarHistory, toWorksheetProblem, type StoredSimilarHistoryItem } from "@/lib/similar-history";
import { buildSimilarProblemUrl } from "@/lib/similar-problem";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";
import { type WorksheetLayoutStyle } from "@/lib/worksheet";

type ServerHistoryItem = {
  id: number;
  action_type: "read" | "solve";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
};

type DisplayHistoryItem =
  | {
      key: string;
      kind: "history";
      createdAt: string;
      label: string;
      historyCode: string;
      problemText: string;
      solveResult: string | null;
      source: ServerHistoryItem;
    }
  | {
      key: string;
      kind: "similar";
      createdAt: string;
      label: string;
      historyCode: string;
      problemText: string;
      solveResult: string;
      source: StoredSimilarHistoryItem;
    };

type FilterType = "all" | "read" | "solve" | "similar";

const BOOKMARK_KEY = "suddak_history_bookmarks_v2";
const REVIEW_KEY = "suddak_history_review_notes_v2";

function getSavedStringArray(key: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value));
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resolveHistoryCode(item: ServerHistoryItem | StoredSimilarHistoryItem) {
  if ("action_type" in item) {
    return `H-${item.id}`;
  }

  return item.sourceHistoryId ? `H-${item.sourceHistoryId}` : item.id.slice(-6).toUpperCase();
}

function LayoutStyleSelector({
  value,
  onChange,
}: {
  value: WorksheetLayoutStyle;
  onChange: (next: WorksheetLayoutStyle) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>출력 레이아웃</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`suddak-btn ${value === "suneung" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
          onClick={() => onChange("suneung")}
        >
          수능형
        </button>
        <button
          type="button"
          className={`suddak-btn ${value === "naesin" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
          onClick={() => onChange("naesin")}
        >
          내신형
        </button>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [serverItems, setServerItems] = useState<ServerHistoryItem[]>([]);
  const [similarItems, setSimilarItems] = useState<StoredSimilarHistoryItem[]>([]);
  const [message, setMessage] = useState("불러오는 중...");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<WorksheetLayoutStyle>("suneung");

  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [reviewNotes, setReviewNotes] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const printRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setBookmarks(getSavedStringArray(BOOKMARK_KEY));
    setReviewNotes(getSavedStringArray(REVIEW_KEY));
    setSimilarItems(getStoredSimilarHistory());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleFocus = () => {
      setSimilarItems(getStoredSimilarHistory());
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewNotes));
  }, [reviewNotes, mounted]);

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
          setServerItems([]);
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
          setServerItems([]);
          setMessage(data?.error || "히스토리를 불러오지 못했습니다.");
          return;
        }

        setServerItems((data.items ?? []) as ServerHistoryItem[]);
        setMessage("");
      } catch {
        setServerItems([]);
        setMessage("히스토리를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [mounted]);

  const items = useMemo<DisplayHistoryItem[]>(() => {
    const mappedServerItems = serverItems
      .filter((item) => item.recognized_text?.trim())
      .map<DisplayHistoryItem>((item) => ({
        key: `history-${item.id}`,
        kind: "history",
        createdAt: item.created_at,
        historyCode: resolveHistoryCode(item),
        label: item.action_type === "solve" ? "풀이 기록" : "문제 인식",
        problemText: item.recognized_text?.trim() || "",
        solveResult: item.solve_result,
        source: item,
      }));

    const mappedSimilarItems = similarItems.map<DisplayHistoryItem>((item) => ({
      key: item.id,
      kind: "similar",
      createdAt: item.createdAt,
      historyCode: resolveHistoryCode(item),
      label: "유사문제",
      problemText: item.problem,
      solveResult: item.solution,
      source: item,
    }));

    return [...mappedSimilarItems, ...mappedServerItems].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [serverItems, similarItems]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filterType !== "all") {
        if (filterType === "similar" && item.kind !== "similar") return false;
        if (filterType === "read" && !(item.kind === "history" && item.source.action_type === "read")) return false;
        if (filterType === "solve" && !(item.kind === "history" && item.source.action_type === "solve")) return false;
      }

      if (showBookmarksOnly && !bookmarks.includes(item.key)) return false;
      if (showReviewOnly && !reviewNotes.includes(item.key)) return false;

      if (!keyword) return true;

      const target = [item.label, item.historyCode, item.problemText, item.solveResult || ""].join(" ").toLowerCase();
      return target.includes(keyword);
    });
  }, [items, filterType, search, showBookmarksOnly, showReviewOnly, bookmarks, reviewNotes]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.includes(item.key)),
    [items, selectedKeys],
  );

  const worksheetProblems = useMemo(
    () =>
      selectedItems.map((item) =>
        item.kind === "similar"
          ? toWorksheetProblem(item.source)
          : {
              id: item.key,
              title: item.source.action_type === "solve" ? "풀이에 사용된 원본 문제" : "인식된 원본 문제",
              problem: item.problemText,
              historyCode: item.historyCode,
              sourceLabel: item.label,
            },
      ),
    [selectedItems],
  );

  const stat = useMemo(
    () => ({
      total: items.length,
      read: items.filter((item) => item.kind === "history" && item.source.action_type === "read").length,
      solve: items.filter((item) => item.kind === "history" && item.source.action_type === "solve").length,
      similar: items.filter((item) => item.kind === "similar").length,
      selected: selectedKeys.length,
    }),
    [items, selectedKeys.length],
  );

  const toggleBookmark = (key: string) => {
    setBookmarks((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  };

  const toggleReview = (key: string) => {
    setReviewNotes((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  };

  const toggleSelection = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  };

  const handleSelectFiltered = () => {
    setSelectedKeys(filteredItems.map((item) => item.key));
  };

  const handleClearSelection = () => {
    setSelectedKeys([]);
  };

  const handlePrint = async () => {
    if (!printRootRef.current || worksheetProblems.length === 0) {
      setMessage("먼저 출력할 문제를 하나 이상 선택해 주세요.");
      return;
    }

    try {
      setPrinting(true);
      await printElementInNewWindow(printRootRef.current, "수학 문제지 인쇄");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인쇄 창을 열지 못했습니다.");
    } finally {
      setPrinting(false);
    }
  };

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
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
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                borderRadius: "15px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--card)",
                flexShrink: 0,
              }}
            >
              <Image src="/logo.png" alt="수딱 로고" fill sizes="48px" style={{ objectFit: "cover" }} />
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
                히스토리
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--primary)", marginTop: "4px" }}>
                인식 기록과 유사문제를 한 번에 관리
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
              themeLabel={isDark ? "라이트모드" : "다크모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>전체</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>{stat.total}</div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>인식</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>{stat.read}</div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>풀이</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>{stat.solve}</div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>유사문제</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>{stat.similar}</div>
        </div>
        <div className="suddak-card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>선택</div>
          <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>{stat.selected}</div>
        </div>
      </section>

      <SectionCard
        title="출력 준비"
        description="히스토리와 유사문제를 골라 한 번에 인쇄하거나 PDF로 저장할 수 있습니다."
        style={{ marginBottom: "18px" }}
      >
        <div style={{ display: "grid", gap: "14px" }}>
          <LayoutStyleSelector value={layoutStyle} onChange={setLayoutStyle} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            <button type="button" className="suddak-btn suddak-btn-ghost" onClick={handleSelectFiltered}>
              현재 목록 전체 선택
            </button>
            <button type="button" className="suddak-btn suddak-btn-ghost" onClick={handleClearSelection}>
              선택 해제
            </button>
            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={() => void handlePrint()}
              disabled={printing || worksheetProblems.length === 0}
            >
              {printing ? "출력 준비 중..." : "프린트 / PDF 저장"}
            </button>
          </div>

          <div className="suddak-card-soft" style={{ padding: "12px 14px", color: "var(--muted)", lineHeight: 1.7 }}>
            브라우저 인쇄 창에서 실제 프린트와 PDF 저장을 모두 할 수 있습니다. 선택한 레이아웃이 인쇄에 그대로 반영됩니다.
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="필터"
        description="유형별로 모아 보고, 북마크와 복습 표시, 코드 검색으로 빠르게 추릴 수 있습니다."
        style={{ marginBottom: "18px" }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <input
            className="suddak-input"
            placeholder="문제 내용, 풀이 내용, 히스토리 코드 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
            <select className="suddak-select" value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)}>
              <option value="all">전체</option>
              <option value="read">문제 인식</option>
              <option value="solve">풀이 기록</option>
              <option value="similar">유사문제</option>
            </select>

            <label
              className="suddak-card-soft"
              style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}
            >
              <input type="checkbox" checked={showBookmarksOnly} onChange={(e) => setShowBookmarksOnly(e.target.checked)} />
              북마크만 보기
            </label>

            <label
              className="suddak-card-soft"
              style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}
            >
              <input type="checkbox" checked={showReviewOnly} onChange={(e) => setShowReviewOnly(e.target.checked)} />
              복습만 보기
            </label>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="기록 목록" description="체크박스로 여러 문제를 골라 출력 목록에 바로 담을 수 있습니다.">
        {loading ? (
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)" }}>
            불러오는 중...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)", lineHeight: 1.8 }}>
            {message || "조건에 맞는 기록이 없습니다."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {filteredItems.map((item) => {
              const bookmarked = bookmarks.includes(item.key);
              const reviewed = reviewNotes.includes(item.key);
              const selected = selectedKeys.includes(item.key);

              return (
                <article key={item.key} className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleSelection(item.key)} />
                      선택
                    </label>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <span className="suddak-badge">{item.label}</span>
                      {item.kind === "similar" ? <span className="suddak-badge">local history</span> : null}
                      <span className="suddak-badge">{item.historyCode}</span>
                      {bookmarked ? <span className="suddak-badge">북마크</span> : null}
                      {reviewed ? <span className="suddak-badge">복습</span> : null}
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 700 }}>{formatDate(item.createdAt)}</div>
                  </div>

                  <div className="suddak-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)", marginBottom: "8px" }}>
                      {item.kind === "similar" ? "유사문제" : "인식된 문제"}
                    </div>
                    <div style={{ marginBottom: "10px", fontSize: "13px", fontWeight: 900, color: "var(--primary)" }}>{item.historyCode}</div>
                    <MarkdownMathBlock content={item.problemText} isDark={isDark} />
                  </div>

                  {item.kind === "history" && item.solveResult ? (
                    <div className="suddak-card" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)", marginBottom: "8px" }}>
                        풀이 결과
                      </div>
                      <MarkdownMathBlock content={item.solveResult} isDark={isDark} />
                    </div>
                  ) : null}

                  {item.kind === "similar" ? (
                    <div className="suddak-card" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)", marginBottom: "8px" }}>
                        생성 풀이
                      </div>
                      <MarkdownMathBlock content={item.solveResult} isDark={isDark} />
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                    <button
                      type="button"
                      className={`suddak-btn ${bookmarked ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                      onClick={() => toggleBookmark(item.key)}
                    >
                      {bookmarked ? "북마크 해제" : "북마크"}
                    </button>

                    <button
                      type="button"
                      className={`suddak-btn ${reviewed ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                      onClick={() => toggleReview(item.key)}
                    >
                      {reviewed ? "복습 해제" : "복습"}
                    </button>

                    {item.kind === "history" ? (
                      <>
                        <Link
                          href={buildSimilarProblemUrl({
                            historyId: item.source.id,
                            source: "history",
                          })}
                          className="suddak-btn suddak-btn-ghost"
                        >
                          유사문제 생성
                        </Link>

                        <Link href={buildShareUrlFromHistory(item.source)} className="suddak-btn suddak-btn-ghost">
                          커뮤니티 공유
                        </Link>
                      </>
                    ) : (
                      <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => toggleSelection(item.key)}>
                        {selected ? "선택 해제" : "출력 목록에 추가"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      {worksheetProblems.length > 0 ? (
        <div ref={printRootRef} className="worksheet-print-stage" aria-hidden="true">
          <WorksheetDocument
            title={layoutStyle === "suneung" ? "수능형 문제지" : "내신형 문제지"}
            subtitle={`선택한 ${worksheetProblems.length}개 문제를 한 번에 출력합니다.`}
            problems={worksheetProblems}
            layoutStyle={layoutStyle}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}

