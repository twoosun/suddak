"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";
import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import SimilarExportDocument from "@/components/similar/SimilarExportDocument";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import {
  buildExportFilename,
  dataUrlToUint8Array,
  downloadBlob,
  parseContentDispositionFilename,
  type SimilarExportFormat,
  type SimilarExportMode,
  type SimilarExportPayload,
} from "@/lib/similar-export";
import { saveSimilarHistoryItem } from "@/lib/similar-history";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";
import { type WorksheetLayoutStyle } from "@/lib/worksheet";
import { type SimilarResult } from "@/types/similar";

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

type ExportFeedback = {
  tone: "info" | "success" | "error";
  text: string;
};

type ExportPageImage = {
  dataUrl: string;
};

async function captureExportPages(root: HTMLDivElement) {
  const { waitForExportReady } = await import("@/lib/similar-export");
  await waitForExportReady(root);

  const { toPng } = await import("html-to-image");
  const sheetNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-export-sheet='true']"));
  const pageImages: ExportPageImage[] = [];

  for (const sheetNode of sheetNodes) {
    const dataUrl = await toPng(sheetNode, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
    });
    pageImages.push({ dataUrl });
  }

  return pageImages;
}

async function exportPdfInBrowser(root: HTMLDivElement, payload: SimilarExportPayload) {
  const [{ jsPDF }, pageImages] = await Promise.all([import("jspdf"), captureExportPages(root)]);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  pageImages.forEach((pageImage, index) => {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }

    pdf.addImage(pageImage.dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
  });

  downloadBlob(
    pdf.output("blob"),
    buildExportFilename(payload.meta.examTitle || payload.title, payload.mode, "pdf"),
  );
}

async function exportDocxInBrowser(root: HTMLDivElement, payload: SimilarExportPayload) {
  const pageImages = await captureExportPages(root);
  const { AlignmentType, Document, ImageRun, Packer, Paragraph } = await import("docx");
  const document = new Document({
    sections: pageImages.map((pageImage) => ({
      properties: {
        page: {
          margin: {
            top: 360,
            right: 360,
            bottom: 360,
            left: 360,
          },
          size: {
            width: 11906,
            height: 16838,
          },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(pageImage.dataUrl),
              type: "png",
              transformation: {
                width: 718,
                height: 1016,
              },
            }),
          ],
        }),
      ],
    })),
  });

  downloadBlob(
    await Packer.toBlob(document),
    buildExportFilename(payload.meta.examTitle || payload.title, payload.mode, "docx"),
  );
}

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
    let errorMessage = "내보내기 요청을 처리하지 못했습니다.";

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

function LayoutStyleSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: WorksheetLayoutStyle;
  onChange: (next: WorksheetLayoutStyle) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>디자인 선택</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`suddak-btn ${value === "suneung" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
          onClick={() => onChange("suneung")}
          disabled={disabled}
        >
          수능형
        </button>
        <button
          type="button"
          className={`suddak-btn ${value === "naesin" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
          onClick={() => onChange("naesin")}
          disabled={disabled}
        >
          내신형
        </button>
      </div>
      <div style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.7 }}>
        {value === "suneung"
          ? "한 페이지에 한 문제를 배치해 풀이 공간을 넉넉하게 확보합니다."
          : "한 페이지당 네 문제를 2x2로 배치해 내신형 문제지 느낌으로 출력합니다."}
      </div>
    </div>
  );
}

export default function SimilarProblemClient({ historyId, source }: SimilarProblemClientProps) {
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
  const [layoutStyle, setLayoutStyle] = useState<WorksheetLayoutStyle>("suneung");
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
  const exportRootRef = useRef<HTMLDivElement | null>(null);

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
      historyCode: sourceItem?.id ? `H-${sourceItem.id}` : undefined,
      sourceProblem: sourceItem?.recognizedText ?? "",
      problem: result.problem,
      answer: result.answer,
      solution: result.solution,
      variationNote: result.variationNote,
      includeOriginalProblem,
      mode: exportMode,
      layoutStyle,
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
    layoutStyle,
    result,
    sheetExamDate,
    sheetExamTitle,
    sheetGrade,
    sheetRound,
    sheetSchool,
    sheetStudentName,
    sourceItem?.id,
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
          setMessage("로그인이 필요합니다.");
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
          setMessage("유효한 원본 기록이 없습니다.");
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
          setMessage("현재는 관리자 계정에서만 유사문제 생성 테스트가 가능합니다.");
        }
      } catch {
        setSourceItem(null);
        setIsAdmin(false);
        setMessage("페이지를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [historyId, mounted]);

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    if (!historyId) {
      setMessage("원본 기록을 찾을 수 없습니다.");
      return;
    }

    if (!isAdmin) {
      setMessage("현재는 관리자 계정에서만 유사문제 생성이 가능합니다.");
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

      const nextResult = (data.result ?? null) as SimilarResult | null;
      setResult(nextResult);

      if (nextResult) {
        saveSimilarHistoryItem({
          sourceHistoryId: sourceItem?.id ?? historyId,
          sourceActionType: sourceItem?.actionType ?? null,
          sourceProblem: sourceItem?.recognizedText ?? "",
          result: nextResult,
        });
      }

      setMessage("유사문제를 생성했고 히스토리에도 저장했습니다. 아래에서 디자인을 고른 뒤 바로 export할 수 있습니다.");
    } catch {
      setMessage("유사문제를 생성하는 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: SimilarExportFormat) => {
    if (!exportPayload) {
      setMessage("먼저 유사문제를 생성해 주세요.");
      return;
    }

    try {
      setExporting(true);
      setExportTarget(format);
      setExportFeedback({
        tone: "info",
        text: format === "pdf" ? "PDF를 생성하고 있습니다." : "DOCX를 생성하고 있습니다.",
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
      setExportFeedback({
        tone: "success",
        text: `${format.toUpperCase()} 다운로드를 시작했습니다. 파일명: ${filename}`,
      });
      setMessage(`${format.toUpperCase()} 다운로드를 시작했습니다.`);
    } catch (error) {
      const fallbackRoot = exportRootRef.current;

      if (fallbackRoot) {
        try {
          if (format === "pdf") {
            await exportPdfInBrowser(fallbackRoot, exportPayload);
          } else {
            await exportDocxInBrowser(fallbackRoot, exportPayload);
          }

          setExportFeedback({
            tone: "success",
            text: `서버 export가 실패해 브라우저 fallback으로 ${format.toUpperCase()}를 생성했습니다.`,
          });
          setMessage(`${format.toUpperCase()} 다운로드를 시작했습니다.`);
          return;
        } catch (fallbackError) {
          const text =
            fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error
                ? error.message
                : "내보내기 중 오류가 발생했습니다.";
          setExportFeedback({ tone: "error", text });
          setMessage(text);
          return;
        }
      }

      const text = error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.";
      setExportFeedback({ tone: "error", text });
      setMessage(text);
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
                <span className="suddak-badge">History Save</span>
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
                히스토리
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

        <section className="suddak-card" style={{ padding: "24px" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="suddak-badge">Beta Access</span>
                <span className="suddak-badge">{isAdmin ? "관리자 계정" : "일반 계정"}</span>
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
                원본 문제를 바탕으로 유사문제를 만들고, 수능형/내신형 디자인으로 PDF 또는 DOCX export가 가능합니다.
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
                  : "현재는 관리자 계정에서만 유사문제 생성 테스트가 가능합니다."}
              </div>
              <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>{sourceLabel}</div>
            </div>

            <LayoutStyleSelector value={layoutStyle} onChange={setLayoutStyle} disabled={exporting} />

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`suddak-btn ${isAdmin ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                onClick={handleGenerate}
                disabled={generating || loading || !sourceItem}
              >
                {generating ? "유사문제 생성 중..." : isAdmin ? "유사문제 생성" : "관리자 전용"}
              </button>

              <Link href="/history" className="suddak-btn suddak-btn-ghost">
                히스토리로 이동
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <div className="suddak-card" style={{ padding: "14px 16px", lineHeight: 1.7, fontWeight: 700 }}>
            {message}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
          }}
        >
          <SectionCard
            title="원본 문제"
            description={loading ? "원본 문제를 불러오는 중입니다." : "유사문제를 만들 때 참고하는 원본입니다."}
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
                      {sourceItem.actionType === "solve" ? "풀이 기록" : "문제 인식 기록"}
                    </span>
                  </div>
                  <MarkdownMathBlock content={sourceItem.recognizedText} isDark={isDark} />
                </div>

                {sourceItem.solveResult ? (
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
                ) : null}
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                원본 문제를 아직 불러오지 못했습니다.
              </div>
            )}
          </SectionCard>

          <SectionCard title="생성 결과" description="생성된 유사문제를 확인하고 바로 export할 수 있습니다.">
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
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900 }}>제목</div>
                  <div style={{ marginTop: "6px", fontSize: "1.05rem", fontWeight: 900 }}>{result.title}</div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900, marginBottom: "8px" }}>
                    유사문제
                  </div>
                  <MarkdownMathBlock content={result.problem} isDark={isDark} />
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "12px" }}>
                  <div>
                    <div
                      style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900, marginBottom: "8px" }}
                    >
                      정답
                    </div>
                    <MarkdownMathBlock content={result.answer || "없음"} isDark={isDark} />
                  </div>
                  <div>
                    <div
                      style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900, marginBottom: "8px" }}
                    >
                      풀이
                    </div>
                    <MarkdownMathBlock content={result.solution || "없음"} isDark={isDark} />
                  </div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 900, marginBottom: "8px" }}>
                    변형 포인트
                  </div>
                  <div style={{ lineHeight: 1.8 }}>{result.variationNote || "없음"}</div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "14px", color: "var(--muted)", lineHeight: 1.7 }}>
                  {result.warning}
                </div>

                <div className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "14px" }}>
                  <LayoutStyleSelector value={layoutStyle} onChange={setLayoutStyle} disabled={exporting} />

                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>출력 모드</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={`suddak-btn ${exportMode === "problem-only" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                        onClick={() => setExportMode("problem-only")}
                        disabled={exporting}
                      >
                        문제만
                      </button>
                      <button
                        type="button"
                        className={`suddak-btn ${exportMode === "problem-with-solution" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
                        onClick={() => setExportMode("problem-with-solution")}
                        disabled={exporting}
                      >
                        문제 + 풀이
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: "var(--muted)" }}>문서 메타데이터</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      <input className="suddak-input" placeholder="학교" value={sheetSchool} onChange={(e) => setSheetSchool(e.target.value)} disabled={exporting} />
                      <input className="suddak-input" placeholder="학년" value={sheetGrade} onChange={(e) => setSheetGrade(e.target.value)} disabled={exporting} />
                      <input className="suddak-input" placeholder="이름" value={sheetStudentName} onChange={(e) => setSheetStudentName(e.target.value)} disabled={exporting} />
                      <input className="suddak-input" placeholder="시험명" value={sheetExamTitle} onChange={(e) => setSheetExamTitle(e.target.value)} disabled={exporting} />
                      <input className="suddak-input" placeholder="날짜" value={sheetExamDate} onChange={(e) => setSheetExamDate(e.target.value)} disabled={exporting} />
                      <input className="suddak-input" placeholder="회차" value={sheetRound} onChange={(e) => setSheetRound(e.target.value)} disabled={exporting} />
                    </div>
                  </div>

                  <label
                    className="suddak-card-soft"
                    style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <input
                      type="checkbox"
                      checked={includeOriginalProblem}
                      onChange={(e) => setIncludeOriginalProblem(e.target.checked)}
                      disabled={exporting || !sourceItem?.recognizedText}
                    />
                    <span style={{ fontWeight: 800 }}>원본 문제 함께 포함</span>
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

                  {exportFeedback ? (
                    <div
                      className="suddak-card-soft"
                      style={{
                        padding: "12px 14px",
                        borderColor:
                          exportFeedback.tone === "error"
                            ? "#ef4444"
                            : exportFeedback.tone === "success"
                              ? "#22c55e"
                              : "var(--primary)",
                        background:
                          exportFeedback.tone === "error"
                            ? "color-mix(in srgb, #ef4444 10%, var(--card))"
                            : exportFeedback.tone === "success"
                              ? "color-mix(in srgb, #22c55e 10%, var(--card))"
                              : "color-mix(in srgb, var(--primary) 8%, var(--card))",
                        fontSize: "13px",
                        fontWeight: 700,
                        lineHeight: 1.7,
                      }}
                    >
                      {exportFeedback.text}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "16px", color: "var(--muted)" }}>
                {isAdmin
                  ? "유사문제를 생성하면 결과와 export 옵션이 여기에 나타납니다."
                  : "현재는 일반 계정에서 결과 생성이 비활성화되어 있습니다."}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {exportPayload ? (
        <div ref={exportRootRef} className="similar-export-stage" aria-hidden="true">
          <SimilarExportDocument payload={exportPayload} />
        </div>
      ) : null}
    </PageContainer>
  );
}
