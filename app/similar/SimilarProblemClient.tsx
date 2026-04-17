"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MoreMenu from "@/components/MoreMenu";

type SimilarProblemClientProps = {
  historyId: number | null;
  source: string | null;
};

type SimilarSourceItem = {
  id: number;
  actionType: "read" | "solve";
  recognizedText: string;
  solveResult: string;
  createdAt: string;
};

type SimilarResult = {
  title: string;
  problem: string;
  answer: string;
  solution: string;
  variationNote: string;
  warning: string;
};

export default function SimilarProblemClient({
  historyId,
  source,
}: SimilarProblemClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [sourceItem, setSourceItem] = useState<SimilarSourceItem | null>(null);
  const [result, setResult] = useState<SimilarResult | null>(null);

  const sourceLabel = useMemo(() => {
    if (source === "history") return "풀이 기록에서 가져온 베타 진입";
    if (source === "solve") return "풀이 결과 화면에서 가져온 베타 진입";
    return "유사문제 생성기 베타";
  }, [source]);

  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const load = async () => {
      setLoading(true);
      setMessage("");
      setResult(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setIsLoggedIn(Boolean(session?.access_token));

        if (!session?.access_token) {
          setIsAdmin(false);
          setSourceItem(null);
          setMessage("로그인 후 베타 페이지와 준비 상태를 확인할 수 있어.");
          return;
        }

        const usageRes = await fetch("/api/usage", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const usageData = await usageRes.json();

        if (usageRes.ok) {
          setIsAdmin(Boolean(usageData.isAdmin));
        } else {
          setIsAdmin(false);
        }

        if (!historyId) {
          setSourceItem(null);
          setMessage("연결된 풀이 기록이 없어. 풀이 결과나 기록 화면에서 다시 들어와 줘.");
          return;
        }

        const sourceRes = await fetch(`/api/similar?historyId=${historyId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const sourceData = await sourceRes.json();

        if (!sourceRes.ok) {
          setSourceItem(null);
          setMessage(sourceData?.error || "원본 문제를 불러오지 못했어.");
          return;
        }

        setSourceItem(sourceData.item ?? null);
        if (!usageData?.isAdmin) {
          setMessage("유사문제 생성기는 현재 베타 준비 중이며, 관리자 계정만 테스트할 수 있어.");
        }
      } catch {
        setSourceItem(null);
        setIsAdmin(false);
        setMessage("베타 페이지를 준비하는 중 오류가 발생했어.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [historyId, mounted]);

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      setMessage("로그인 후 유사문제 생성기 베타 페이지를 이용할 수 있어.");
      return;
    }

    if (!historyId) {
      setMessage("원본 풀이 기록이 없어 유사문제를 만들 수 없어.");
      return;
    }

    if (!isAdmin) {
      setMessage("유사문제 생성기는 현재 베타 준비 중입니다. 지금은 관리자 테스트 계정만 사용할 수 있어.");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("로그인 세션을 다시 확인해 줘.");
        return;
      }

      const res = await fetch("/api/similar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ historyId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "유사문제 생성에 실패했어.");
        return;
      }

      setResult(data.result ?? null);
      setMessage("베타 유사문제를 생성했어. 품질은 아직 테스트 단계라 한 번 더 검토해 줘.");
    } catch {
      setMessage("유사문제 생성 중 오류가 발생했어.");
    } finally {
      setGenerating(false);
    }
  };

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <div style={{ display: "grid", gap: "18px" }}>
        <header
          className="suddak-card"
          style={{
            position: "sticky",
            top: 14,
            zIndex: 20,
            padding: "14px 16px",
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
            <div style={{ display: "grid", gap: "8px" }}>
              <Link href="/" style={{ fontWeight: 800, color: "var(--primary)" }}>
                수딱으로 돌아가기
              </Link>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="suddak-badge">유사문제 생성기</span>
                <span className="suddak-badge">Beta</span>
                {!isAdmin && <span className="suddak-badge">준비 중</span>}
              </div>
            </div>

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
                onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
                themeLabel={isDark ? "주간모드" : "야간모드"}
                redirectAfterLogout="/login"
              />
            </div>
          </div>
        </header>

        <section className="suddak-card" style={{ padding: "24px" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="suddak-badge">Beta Access</span>
                <span className="suddak-badge">{isAdmin ? "관리자 테스트 가능" : "일반 공개 전"}</span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2rem, 4vw, 3.2rem)",
                  fontWeight: 950,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                }}
              >
                유사문제 생성기 베타
              </h1>

              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                원본 문제를 바탕으로 비슷한 유형의 연습문제를 빠르게 만들어 두는 실험 단계야.
                지금은 기능 자리와 흐름을 먼저 열어두고, 관리자 계정만 실제 생성 테스트를 진행해.
              </p>
            </div>

            <div
              className="suddak-card-soft"
              style={{
                padding: "16px",
                display: "grid",
                gap: "10px",
                borderColor: isAdmin ? "var(--success-border)" : "var(--border)",
                background: isAdmin ? "var(--success-soft)" : "var(--soft)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>
                현재 상태
              </div>
              <div style={{ fontWeight: 900 }}>
                {isAdmin
                  ? "관리자 계정이라 베타 생성 버튼을 실제로 사용할 수 있어."
                  : "일반 계정은 기능 화면만 먼저 볼 수 있고, 실제 생성은 아직 열려 있지 않아."}
              </div>
              <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>{sourceLabel}</div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`suddak-btn ${isAdmin ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                onClick={handleGenerate}
                disabled={generating || loading || !sourceItem}
              >
                {generating ? "유사문제 생성 중..." : isAdmin ? "유사문제 생성 실행" : "유사문제 생성 Beta"}
              </button>

              <Link href="/history" className="suddak-btn suddak-btn-ghost">
                기록으로 돌아가기
              </Link>
            </div>
          </div>
        </section>

        {message && (
          <div
            className="suddak-card"
            style={{
              padding: "14px 16px",
              borderColor: "var(--border)",
              background: "var(--card)",
              lineHeight: 1.7,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          <SectionCard
            title="원본 문제"
            description={
              loading
                ? "연결된 풀이 기록을 불러오는 중이야."
                : "유사문제 생성의 기준이 되는 원본 문제와 풀이 기록이야."
            }
          >
            {sourceItem ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <div className="suddak-card-soft" style={{ padding: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span className="suddak-badge">기록 #{sourceItem.id}</span>
                    <span className="suddak-badge">
                      {sourceItem.actionType === "solve" ? "풀이 기록" : "문제 읽기 기록"}
                    </span>
                  </div>
                  <MarkdownMathBlock content={sourceItem.recognizedText} isDark={isDark} />
                </div>

                {sourceItem.solveResult && (
                  <div className="suddak-card-soft" style={{ padding: "14px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color: "var(--muted)",
                        marginBottom: "8px",
                      }}
                    >
                      기존 풀이 참고
                    </div>
                    <MarkdownMathBlock content={sourceItem.solveResult} isDark={isDark} />
                  </div>
                )}
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                연결된 원본 문제를 아직 불러오지 못했어.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="베타 생성 결과"
            description="생성 결과는 아직 실험 단계라 참고용으로 먼저 확인하는 흐름이야."
          >
            {result ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <div
                  className="suddak-card-soft"
                  style={{
                    padding: "16px",
                    border: "1px solid var(--primary)",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--card)), var(--card))",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900 }}>
                    생성 제목
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "1.05rem", fontWeight: 900 }}>
                    {result.title}
                  </div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    유사문제
                  </div>
                  <MarkdownMathBlock content={result.problem} isDark={isDark} />
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    정답과 짧은 풀이
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--muted)",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        정답
                      </div>
                      <MarkdownMathBlock content={result.answer || "아직 없음"} isDark={isDark} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--muted)",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        풀이
                      </div>
                      <MarkdownMathBlock content={result.solution || "아직 없음"} isDark={isDark} />
                    </div>
                  </div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    변형 포인트
                  </div>
                  <div style={{ lineHeight: 1.8 }}>{result.variationNote || "아직 없음"}</div>
                </div>

                <div
                  className="suddak-card-soft"
                  style={{
                    padding: "14px",
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                    lineHeight: 1.7,
                  }}
                >
                  {result.warning}
                </div>
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                {isAdmin
                  ? "관리자 계정으로 생성 실행을 누르면 베타 결과가 여기 표시돼."
                  : "일반 계정은 이 영역을 미리 볼 수 있지만, 실제 생성 결과는 아직 관리자 테스트 중이야."}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
