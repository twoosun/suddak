"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";
import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import {
  buildExportFilename,
  downloadBlob,
  parseContentDispositionFilename,
  type SimilarExportFormat,
  type SimilarExportMode,
  type SimilarExportPayload,
} from "@/lib/similar-export";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";

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

type ExportFeedback = {
  tone: "info" | "success" | "error";
  text: string;
};

async function requestExportFile(
  accessToken: string,
  format: SimilarExportFormat,
  payload: SimilarExportPayload,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/similar/export", {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      format,
      payload,
    }),
  });

  if (!response.ok) {
    let errorMessage = "export 요청에 실패했습니다.";

    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) {
        errorMessage = data.error;
      }
    } catch {}

    throw new Error(errorMessage);
  }

  return {
    blob: await response.blob(),
    filename:
      parseContentDispositionFilename(response.headers.get("content-disposition")) ??
      buildExportFilename(payload.meta.examTitle || payload.title, payload.mode, format),
  };
}

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
  const [exporting, setExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<SimilarExportFormat | null>(null);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback | null>(null);
  const [exportMode, setExportMode] = useState<SimilarExportMode>("problem-only");
  const [includeOriginalProblem, setIncludeOriginalProblem] = useState(false);
  const [sheetSchool, setSheetSchool] = useState("");
  const [sheetGrade, setSheetGrade] = useState("");
  const [sheetStudentName, setSheetStudentName] = useState("");
  const [sheetExamTitle, setSheetExamTitle] = useState("");
  const [sheetExamDate, setSheetExamDate] = useState("");
  const [sheetRound, setSheetRound] = useState("");
  const [message, setMessage] = useState("");
  const [sourceItem, setSourceItem] = useState<SimilarSourceItem | null>(null);
  const [result, setResult] = useState<SimilarResult | null>(null);

  const sourceLabel = useMemo(() => {
    if (source === "history") return "히스토리에서 가져온 문제를 바탕으로 생성합니다.";
    if (source === "solve") return "풀이 결과 화면에서 가져온 문제를 바탕으로 생성합니다.";
    return "유사문제 생성 화면입니다.";
  }, [source]);

  const exportPayload = useMemo<SimilarExportPayload | null>(() => {
    if (!result) return null;

    return {
      title: result.title,
      warning: result.warning,
      sourceProblem: sourceItem?.recognizedText ?? "",
      problem: result.problem,
      answer: result.answer,
      solution: result.solution,
      variationNote: result.variationNote,
      includeOriginalProblem,
      mode: exportMode,
      solutionStyle: "typeset",
      meta: {
        school: sheetSchool.trim(),
        grade: sheetGrade.trim(),
        studentName: sheetStudentName.trim(),
        examTitle: sheetExamTitle.trim(),
        examDate: sheetExamDate.trim(),
        round: sheetRound.trim(),
      },
    };
  }, [
    exportMode,
    includeOriginalProblem,
    result,
    sheetExamDate,
    sheetExamTitle,
    sheetGrade,
    sheetRound,
    sheetSchool,
    sheetStudentName,
    sourceItem?.recognizedText,
  ]);

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
          setMessage("로그인 후 이용할 수 있습니다.");
          return;
        }

        const usageRes = await fetch("/api/usage", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const usageData = await usageRes.json();
        setIsAdmin(Boolean(usageData?.isAdmin));

        if (!historyId) {
          setSourceItem(null);
          setMessage("유효한 히스토리 항목이 없습니다.");
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
          setMessage(sourceData?.error || "원본 문제를 불러오지 못했습니다.");
          return;
        }

        setSourceItem(sourceData.item ?? null);

        if (!usageData?.isAdmin) {
          setMessage("현재는 관리자 계정에서만 유사문제 생성을 테스트할 수 있습니다.");
        }
      } catch {
        setSourceItem(null);
        setIsAdmin(false);
        setMessage("페이지를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [historyId, mounted]);

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      setMessage("로그인 후 이용해 주세요.");
      return;
    }

    if (!historyId) {
      setMessage("유효한 원본 문제 기록이 없습니다.");
      return;
    }

    if (!isAdmin) {
      setMessage("현재는 관리자 계정만 유사문제 생성을 테스트할 수 있습니다.");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("세션을 다시 확인해 주세요.");
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
        setMessage(data?.error || "유사문제 생성에 실패했습니다.");
        return;
      }

      setResult(data.result ?? null);
      setMessage("유사문제를 생성했습니다. 아래에서 내용을 확인하고 export할 수 있습니다.");
    } catch {
      setMessage("유사문제 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: SimilarExportFormat) => {
    if (!exportPayload) {
      setMessage("먼저 유사문제를 생성한 뒤 export를 시도해 주세요.");
      return;
    }

    try {
      setExporting(true);
      setExportTarget(format);
      const pendingText =
        format === "pdf"
          ? "PDF export 요청을 보냈고, 서버가 문서를 생성하는 중입니다."
          : "DOCX export 요청을 보냈고, 서버가 문서를 생성하는 중입니다.";
      setMessage(pendingText);
      setExportFeedback({
        tone: "info",
        text: pendingText,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("세션을 다시 확인해 주세요.");
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 90000);

      const { blob, filename } = await requestExportFile(
        session.access_token,
        format,
        exportPayload,
        controller.signal,
      ).finally(() => {
        window.clearTimeout(timeoutId);
      });

      downloadBlob(blob, filename);
      const successText =
        format === "pdf"
          ? `PDF를 서버에서 생성했고 다운로드를 시작했습니다. 파일명: ${filename}`
          : `DOCX를 서버에서 생성했고 다운로드를 시작했습니다. 파일명: ${filename}`;
      setMessage(successText);
      setExportFeedback({
        tone: "success",
        text: successText,
      });
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === "AbortError"
          ? "export 생성 시간이 너무 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요."
          : error instanceof Error
            ? error.message
            : "export 중 오류가 발생했습니다.";
      setMessage(errorMessage);
      setExportFeedback({
        tone: "error",
        text: errorMessage,
      });
    } finally {
      setExporting(false);
      setExportTarget(null);
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
                홈으로 돌아가기
              </Link>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="suddak-badge">유사문제 생성기</span>
                <span className="suddak-badge">Beta</span>
                {!isAdmin && <span className="suddak-badge">관리자 테스트 전용</span>}
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
                <span className="suddak-badge">{isAdmin ? "관리자 테스트 가능" : "일반 계정"}</span>
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
                유사문제 생성기
              </h1>

              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                원본 문제를 바탕으로 유사문제를 생성하고, export 전용 API로 PDF와 DOCX를 내려받을 수
                있습니다.
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
              <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>현재 상태</div>
              <div style={{ fontWeight: 900 }}>
                {isAdmin
                  ? "관리자 계정으로 생성과 export 테스트가 가능합니다."
                  : "일반 계정은 화면 확인만 가능하고 생성 기능은 제한됩니다."}
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
                {generating ? "유사문제 생성 중..." : isAdmin ? "유사문제 생성" : "Beta 준비중"}
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
              loading ? "히스토리에서 원본 문제를 불러오는 중입니다." : "유사문제의 기반이 되는 원본 문제입니다."
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
                원본 문제를 아직 불러오지 못했습니다.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="생성 결과"
            description="생성된 유사문제를 검토하고 export 모드와 시험지 메타데이터를 설정할 수 있습니다."
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
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900 }}>생성 제목</div>
                  <div style={{ marginTop: "6px", fontSize: "1.05rem", fontWeight: 900 }}>{result.title}</div>
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
                    정답과 풀이
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
                      <MarkdownMathBlock content={result.answer || "없음"} isDark={isDark} />
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
                      <MarkdownMathBlock content={result.solution || "없음"} isDark={isDark} />
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
                  <div style={{ lineHeight: 1.8 }}>{result.variationNote || "없음"}</div>
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

                <div className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "14px" }}>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>출력 모드</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={`suddak-btn ${
                          exportMode === "problem-only" ? "suddak-btn-primary" : "suddak-btn-ghost"
                        }`}
                        onClick={() => setExportMode("problem-only")}
                        disabled={exporting}
                      >
                        문제만
                      </button>
                      <button
                        type="button"
                        className={`suddak-btn ${
                          exportMode === "problem-with-solution"
                            ? "suddak-btn-primary"
                            : "suddak-btn-ghost"
                        }`}
                        onClick={() => setExportMode("problem-with-solution")}
                        disabled={exporting}
                      >
                        문제 + 풀이
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>
                      문서 메타데이터
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      <input
                        className="suddak-input"
                        placeholder="학교"
                        value={sheetSchool}
                        onChange={(e) => setSheetSchool(e.target.value)}
                        disabled={exporting}
                      />
                      <input
                        className="suddak-input"
                        placeholder="학년"
                        value={sheetGrade}
                        onChange={(e) => setSheetGrade(e.target.value)}
                        disabled={exporting}
                      />
                      <input
                        className="suddak-input"
                        placeholder="이름"
                        value={sheetStudentName}
                        onChange={(e) => setSheetStudentName(e.target.value)}
                        disabled={exporting}
                      />
                      <input
                        className="suddak-input"
                        placeholder="시험지 제목"
                        value={sheetExamTitle}
                        onChange={(e) => setSheetExamTitle(e.target.value)}
                        disabled={exporting}
                      />
                      <input
                        className="suddak-input"
                        placeholder="날짜"
                        value={sheetExamDate}
                        onChange={(e) => setSheetExamDate(e.target.value)}
                        disabled={exporting}
                      />
                      <input
                        className="suddak-input"
                        placeholder="회차"
                        value={sheetRound}
                        onChange={(e) => setSheetRound(e.target.value)}
                        disabled={exporting}
                      />
                    </div>
                  </div>

                  <label
                    className="suddak-card-soft"
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeOriginalProblem}
                      onChange={(e) => setIncludeOriginalProblem(e.target.checked)}
                      disabled={exporting || !sourceItem?.recognizedText}
                    />
                    <span style={{ fontWeight: 800 }}>원본 문제 섹션 포함</span>
                  </label>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="suddak-btn suddak-btn-primary"
                      onClick={() => void handleExport("pdf")}
                      disabled={exporting}
                    >
                      {exporting && exportTarget === "pdf" ? "PDF 생성 중..." : "PDF 다운로드"}
                    </button>
                    <button
                      type="button"
                      className="suddak-btn suddak-btn-ghost"
                      onClick={() => void handleExport("docx")}
                      disabled={exporting}
                    >
                      {exporting && exportTarget === "docx" ? "DOCX 생성 중..." : "DOCX 다운로드"}
                    </button>
                  </div>

                  <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.7 }}>
                    export는 브라우저에서 직접 문서를 만들지 않고, 서버 API가 전용 시험지 템플릿을 렌더한 뒤
                    PDF와 DOCX 파일을 내려줍니다.
                  </div>
                  {(exporting || exportFeedback) && (
                    <div
                      className="suddak-card-soft"
                      style={{
                        padding: "12px 14px",
                        borderColor:
                          exportFeedback?.tone === "error"
                            ? "#ef4444"
                            : exportFeedback?.tone === "success"
                              ? "#22c55e"
                              : "var(--primary)",
                        background:
                          exportFeedback?.tone === "error"
                            ? "color-mix(in srgb, #ef4444 10%, var(--card))"
                            : exportFeedback?.tone === "success"
                              ? "color-mix(in srgb, #22c55e 10%, var(--card))"
                              : "color-mix(in srgb, var(--primary) 8%, var(--card))",
                        fontSize: "13px",
                        fontWeight: 700,
                        lineHeight: 1.7,
                      }}
                    >
                      {exportFeedback?.text}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                {isAdmin
                  ? "유사문제를 생성하면 이 영역에 결과와 export 컨트롤이 나타납니다."
                  : "일반 계정은 현재 결과 생성 기능이 비활성화되어 있습니다."}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
