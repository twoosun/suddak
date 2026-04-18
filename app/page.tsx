"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import NotificationBell from "@/components/NotificationBell";
import NotificationBellPopup from "@/components/NotificationBellPopup";

import { getSessionWithRecovery, supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme, toggleTheme } from "@/lib/theme";
import {
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  type OcrPreprocessOptions,
  buildPreprocessedPreviewUrl,
} from "@/lib/ocr-preprocess";
import { buildShareUrlFromSolve } from "@/lib/community-share";
import { saveHistoryMetadata } from "@/lib/history-metadata";
import { buildSimilarProblemUrl } from "@/lib/similar-problem";
import { Settings } from "lucide-react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import FileDropzone from "@/components/home/FileDropzone";
import OcrPreprocessPanel from "@/components/home/OcrPreprocessPanel";
import MoreMenu from "@/components/MoreMenu";

type SubjectCategory =
  | "highschool_math_1st_year"
  | "math1"
  | "math2"
  | "calculus"
  | "probability_statistics"
  | "geometry";

type DifficultyLevel = "easy" | "medium" | "hard";

type GraphPoint = {
  x: number;
  y: number;
  label: string;
};

type GraphSpec = {
  graph_type: "function" | "points";
  equation: string;
  x_min: number;
  x_max: number;
  y_min: number | null;
  y_max: number | null;
  points: GraphPoint[];
  note: string;
};

type SolveMeta = {
  historyId?: number | null;
  model: string;
  subject: SubjectCategory;
  subjectLabel: string;
  subtopic: string;
  finalAnswer?: string;
  conciseSolution?: string;
  confidence: "high" | "medium" | "low";
  difficulty: DifficultyLevel;
  graphRequested: boolean;
  graphNeeded: boolean;
  isAdminModel: boolean;
};

type SolveFeedbackType =
  | "helpful"
  | "needs_work"
  | "answer_missing"
  | "too_long"
  | "parsing_error"
  | "subtopic_wrong";

const solveFeedbackOptions: Array<{ type: SolveFeedbackType; label: string }> = [
  { type: "helpful", label: "도움됐어요" },
  { type: "needs_work", label: "아쉬워요" },
  { type: "answer_missing", label: "답이 안 보여요" },
  { type: "too_long", label: "설명이 길어요" },
  { type: "parsing_error", label: "파싱 오류" },
  { type: "subtopic_wrong", label: "단원 분류 이상" },
];

const difficultyLabelMap: Record<DifficultyLevel, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

const confidenceLabelMap: Record<NonNullable<SolveMeta["confidence"]>, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/* # 1. 그래프 미리보기 */
function GraphPreview({
  graph,
  isDark,
}: {
  graph: GraphSpec;
  isDark: boolean;
}) {
  const width = 360;
  const height = 240;
  const padding = 28;

  const xMin = graph.x_min;
  const xMax = graph.x_max;

  const pointYs = graph.points.map((p) => p.y);
  const autoYMin = pointYs.length > 0 ? Math.min(...pointYs) - 1 : -5;
  const autoYMax = pointYs.length > 0 ? Math.max(...pointYs) + 1 : 5;

  const yMin = graph.y_min ?? autoYMin;
  const yMax = graph.y_max ?? autoYMax;

  const safeXMax = xMax === xMin ? xMin + 1 : xMax;
  const safeYMax = yMax === yMin ? yMin + 1 : yMax;

  const mapX = (x: number) =>
    padding + ((x - xMin) / (safeXMax - xMin)) * (width - padding * 2);

  const mapY = (y: number) =>
    height - padding - ((y - yMin) / (safeYMax - yMin)) * (height - padding * 2);

  const axisColor = isDark ? "#64748b" : "#94a3b8";
  const pointColor = isDark ? "#93c5fd" : "#3157c8";
  const textColor = isDark ? "#e5e7eb" : "#334155";
  const bgColor = "var(--card)";
  const borderColor = "var(--border)";

  const xAxisY = yMin <= 0 && 0 <= safeYMax ? mapY(0) : mapY(yMin);
  const yAxisX = xMin <= 0 && 0 <= safeXMax ? mapX(0) : mapX(xMin);

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${borderColor}`,
        backgroundColor: bgColor,
        padding: "14px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 800,
          marginBottom: "10px",
          color: textColor,
        }}
      >
        그래프 미리보기
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          display: "block",
        }}
      >
        <rect x="0" y="0" width={width} height={height} fill={bgColor} rx="16" />

        <line
          x1={padding}
          y1={xAxisY}
          x2={width - padding}
          y2={xAxisY}
          stroke={axisColor}
          strokeWidth="1.5"
        />
        <line
          x1={yAxisX}
          y1={padding}
          x2={yAxisX}
          y2={height - padding}
          stroke={axisColor}
          strokeWidth="1.5"
        />

        {graph.points.map((point, index) => {
          const cx = mapX(point.x);
          const cy = mapY(point.y);

          return (
            <g key={`${point.label}-${index}`}>
              <circle cx={cx} cy={cy} r="4.5" fill={pointColor} />
              <text
                x={cx + 6}
                y={cy - 8}
                fontSize="11"
                fill={textColor}
                style={{ userSelect: "none" }}
              >
                {point.label || `(${point.x}, ${point.y})`}
              </text>
            </g>
          );
        })}

        <text x={width - 18} y={xAxisY - 8} fontSize="11" fill={textColor}>
          x
        </text>
        <text x={yAxisX + 8} y={16} fontSize="11" fill={textColor}>
          y
        </text>
      </svg>

      <div
        style={{
          marginTop: "10px",
          fontSize: "13px",
          lineHeight: 1.7,
          color: textColor,
        }}
      >
        <div>
          <strong>식:</strong> {graph.equation}
        </div>
        <div>
          <strong>x 범위:</strong> {graph.x_min} ~ {graph.x_max}
        </div>
        <div>
          <strong>설명:</strong> {graph.note || "없음"}
        </div>
      </div>
    </div>
  );
}

function extractAnswerSection(markdown: string) {
  if (!markdown) return { answer: "", body: "" };

  const normalized = markdown.replace(/\r\n/g, "\n");
  const answerMatch = normalized.match(/## 정답\s*\n([\s\S]*?)(?=\n## |\n# |$)/);

  const answer = answerMatch?.[1]?.trim() ?? "";

  const body = normalized
    .replace(/## 정답\s*\n[\s\S]*?(?=\n## |\n# |$)/, "")
    .trim();

  return { answer, body };
}

function extractSolveSections(markdown: string) {
  const base = extractAnswerSection(markdown);
  if (base.answer) return base;

  const normalized = markdown.replace(/\r\n/g, "\n");
  const answerMatch = normalized.match(/##\s*Answer\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);

  return {
    answer: answerMatch?.[1]?.trim() ?? "",
    body: normalized.replace(/##\s*Answer\s*\n[\s\S]*?(?=\n## |\n# |$)/i, "").trim(),
  };
}

export default function HomePage() {
  const router = useRouter();

  /* # 2. 상태값 */
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);

  const [imageAdjustOptions, setImageAdjustOptions] = useState<OcrPreprocessOptions>(
    DEFAULT_OCR_PREPROCESS_OPTIONS
  );
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [showAdvancedAdjust, setShowAdvancedAdjust] = useState(false);

  const [recognizedText, setRecognizedText] = useState("");
  const [solveResult, setSolveResult] = useState("");
  const [solveMeta, setSolveMeta] = useState<SolveMeta | null>(null);
  const [graphSpec, setGraphSpec] = useState<GraphSpec | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<SolveFeedbackType | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [isEditingRecognized, setIsEditingRecognized] = useState(false);
  const [includeGraph, setIncludeGraph] = useState(false);

  const [isAdminUser, setIsAdminUser] = useState(false);
  const [usageText, setUsageText] = useState("");
  const [noticeText, setNoticeText] = useState("");

  /* # 3. 마운트 및 세션 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);

    let isAlive = true;

    const initSession = async () => {
      const currentSession = await getSessionWithRecovery();

      if (isAlive) {
        setSession(currentSession);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsDark(getStoredTheme() === "dark");
    });

    return () => {
      isAlive = false;
      subscription.unsubscribe();
    };
  }, []);

  /* # 4. 미리보기 정리 */
  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
    };
  }, [originalPreviewUrl, processedPreviewUrl]);

  /* # 5. 사용량 불러오기 */
  const loadUsage = async () => {
    const currentSession = await getSessionWithRecovery();

    if (!currentSession?.access_token) {
      setUsageText("비로그인 상태 · 로그인 후 기록 및 풀이 저장 가능");
      setIsAdminUser(false);
      return;
    }

    try {
      const res = await fetch("/api/usage", {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setUsageText("");
        setIsAdminUser(false);
        return;
      }

      if (data.isAdmin) {
        setIsAdminUser(true);
        setUsageText("관리자 계정 · 무제한 이용 가능");
      } else {
        setIsAdminUser(false);
        setUsageText(
          `문제 인식 ${data.readToday}회 사용 / ${data.readRemaining}회 남음 · 풀이 ${data.solveToday}회 사용 / ${data.solveRemaining}회 남음`
        );
      }
    } catch {
      setUsageText("");
      setIsAdminUser(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    loadUsage();
  }, [session, mounted]);

  useEffect(() => {
    if (!solveMeta?.historyId) return;

    saveHistoryMetadata({
      historyId: solveMeta.historyId,
      subjectLabel: solveMeta.subjectLabel,
      subtopic: solveMeta.subtopic,
      difficulty: solveMeta.difficulty,
      difficultyLabel: difficultyLabelMap[solveMeta.difficulty],
    });
  }, [solveMeta]);

  /* # 6. 파일 선택 */
  const resetOutputs = () => {
    setRecognizedText("");
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setNoticeText("");
    setIsEditingRecognized(false);
    setSelectedFeedback(null);
    setFeedbackLoading(false);
  };

  const handleFileSelect = async (selected: File, source: "upload" | "camera") => {
    resetOutputs();

    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);

    setFile(selected);
    setOriginalPreviewUrl(URL.createObjectURL(selected));
    setProcessedPreviewUrl(null);

    const nextAdjustOptions =
      source === "camera"
        ? {
            ...DEFAULT_OCR_PREPROCESS_OPTIONS,
            threshold: true,
          }
        : DEFAULT_OCR_PREPROCESS_OPTIONS;

    setImageAdjustOptions(nextAdjustOptions);

    try {
      setPreprocessLoading(true);
      const { previewUrl } = await buildPreprocessedPreviewUrl(
        selected,
        nextAdjustOptions
      );
      setProcessedPreviewUrl(previewUrl);
      if (source === "camera") {
        setNoticeText("카메라 촬영본이라 OCR용 강한 이진화를 자동 적용했어.");
      }
    } catch {
      setNoticeText("이미지 준비 중 일부 보정 미리보기를 만들지 못했습니다.");
    } finally {
      setPreprocessLoading(false);
    }
  };

  /* # 7. 세부 조정 변경 시 미리보기 재생성 */
  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    const rerenderPreview = async () => {
      try {
        setPreprocessLoading(true);

        if (processedPreviewUrl) {
          URL.revokeObjectURL(processedPreviewUrl);
          setProcessedPreviewUrl(null);
        }

        const { previewUrl } = await buildPreprocessedPreviewUrl(
          file,
          imageAdjustOptions
        );

        if (!cancelled) {
          setProcessedPreviewUrl(previewUrl);
        } else {
          URL.revokeObjectURL(previewUrl);
        }
      } catch {
        if (!cancelled) {
          setNoticeText("이미지 보정 미리보기 갱신에 실패했습니다.");
        }
      } finally {
        if (!cancelled) setPreprocessLoading(false);
      }
    };

    rerenderPreview();

    return () => {
      cancelled = true;
    };
  }, [imageAdjustOptions, file]);

  const currentPreview = useMemo(() => {
    return processedPreviewUrl || originalPreviewUrl;
  }, [processedPreviewUrl, originalPreviewUrl]);

  /* # 8. 문제 읽기 */
  const handleReadProblem = async () => {
    if (!file) {
      setNoticeText("먼저 문제 이미지를 업로드해줘.");
      return;
    }

    setReading(true);
    setNoticeText("");
    setRecognizedText("");
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setSelectedFeedback(null);

    try {
      const currentSession = await getSessionWithRecovery();

      if (!currentSession?.access_token) {
        setNoticeText("로그인 후 문제 인식 기능을 사용할 수 있어.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "read");
      formData.append("image", file);

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setNoticeText(data?.error || "문제 인식에 실패했습니다.");
        return;
      }

      setRecognizedText(data.result || "");
      setIsEditingRecognized(false);
      setNoticeText("문제 인식이 완료됐어. 틀린 부분이 있으면 바로 수정해도 돼.");
    } catch {
      setNoticeText("문제 인식 중 오류가 발생했습니다.");
    } finally {
      setReading(false);
      await loadUsage();
    }
  };

  /* # 9. 문제 풀이 */
  const handleSolveProblem = async () => {
    if (!recognizedText.trim()) {
      setNoticeText("먼저 문제를 인식하거나 직접 입력해줘.");
      return;
    }

    setSolving(true);
    setNoticeText("");
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setSelectedFeedback(null);

    try {
      const currentSession = await getSessionWithRecovery();

      if (!currentSession?.access_token) {
        setNoticeText("로그인 후 풀이 기능을 사용할 수 있어.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "solve");
      formData.append("recognizedProblem", recognizedText);

      if (isAdminUser) {
        formData.append("includeGraph", includeGraph ? "true" : "false");
      }

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setNoticeText(data?.error || "풀이 생성에 실패했습니다.");
        return;
      }

      setSolveResult(data.result || "");
      setSolveMeta(data.meta ?? null);
      setGraphSpec(data.graph ?? null);
      setNoticeText("풀이가 생성됐어. 마음에 들면 바로 커뮤니티에 공유할 수 있어.");
    } catch {
      setNoticeText("풀이 생성 중 오류가 발생했습니다.");
    } finally {
      setSolving(false);
      await loadUsage();
    }
  };

  const handleSolveFeedback = async (feedbackType: SolveFeedbackType) => {
    const historyId = solveMeta?.historyId;

    if (!historyId || feedbackLoading) {
      setNoticeText("피드백을 저장할 풀이 기록을 찾지 못했어.");
      return;
    }

    try {
      setFeedbackLoading(true);

      const currentSession = await getSessionWithRecovery();

      if (!currentSession?.access_token) {
        setNoticeText("로그인 후 피드백을 남길 수 있어.");
        return;
      }

      const res = await fetch("/api/solve-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          historyId,
          feedbackType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setSelectedFeedback(feedbackType);
        }
        setNoticeText(data?.error || "피드백 저장에 실패했어.");
        return;
      }

      setSelectedFeedback(feedbackType);
      setNoticeText("피드백을 저장했어. 다음 풀이 개선에 반영할게.");
    } catch {
      setNoticeText("피드백 저장 중 오류가 발생했어.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  /* # 10. 공유 URL */
  const shareUrl = useMemo(() => {
    return buildShareUrlFromSolve({
      recognizedText,
      solveResult,
    });
  }, [recognizedText, solveResult]);

  const parsedSolveResult = solveResult
    ? extractSolveSections(solveResult)
    : { answer: "", body: "" };
  const answerText = solveMeta?.finalAnswer?.trim() || parsedSolveResult.answer;
  const explanationText =
    solveMeta?.conciseSolution?.trim() || parsedSolveResult.body || solveResult;

  const heroTitleStyle: React.CSSProperties = {
    fontSize: "clamp(2.1rem, 5vw, 4.2rem)",
    fontWeight: 950,
    letterSpacing: "-0.06em",
    lineHeight: 0.95,
    margin: 0,
  };

  const heroSubStyle: React.CSSProperties = {
    margin: "12px 0 0",
    color: "var(--muted)",
    fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
    lineHeight: 1.8,
    maxWidth: "760px",
  };

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <div className="home-page">
      {/* # 11. 상단 헤더 */}
      <header
        className="suddak-card home-header"
        style={{
          position: "sticky",
          top: 14,
          zIndex: 20,
        }}
      >
        <div className="home-header-row">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="home-brand-button"
          >
            <div className="home-brand-logo">
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

            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.95,
                }}
              >
                수딱
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                Suddak · AI 수학 문제 도우미
              </div>
            </div>
          </button>

          <div className="home-header-actions">
            <Link href="/community" className="suddak-btn suddak-btn-ghost home-header-link">
              커뮤니티
            </Link>

            <Link href="/history" className="suddak-btn suddak-btn-ghost home-header-link">
              기록
            </Link>
<NotificationBellPopup isDark={isDark} />
            <div className="home-theme-slot">
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

      {/* # 12. 히어로 */}
      <section className="suddak-card home-hero" style={{ padding: "24px" }}>
        <div className="home-hero-content">
          <div>
            <h1 style={heroTitleStyle}>문제 사진 올리고, 바로 읽고, 정확히 풀자</h1>
            <p style={heroSubStyle}>
              문제를 먼저 인식한 뒤, 수정 가능한 텍스트를 바탕으로 풀이해서
              수식형 접근뿐 아니라 그래프·조건 분석까지 더 안정적으로 보여주는 수학 문제 도우미야.
            </p>
          </div>

          <div className="home-badge-row">
            <span className="suddak-badge">고등학교 수학 중심</span>
            <span className="suddak-badge">인식 후 수정 가능</span>
            <span className="suddak-badge">풀이 후 커뮤니티 공유</span>
            <span className="suddak-badge">모바일 최적화</span>
          </div>

          <div
            className="suddak-card-soft"
            style={{
              padding: "14px 16px",
              fontSize: "14px",
              lineHeight: 1.7,
              color: "var(--muted)",
            }}
          >
            {usageText || "로그인 후 사용량과 기록 저장 상태를 확인할 수 있어."}
          </div>
        </div>
      </section>

      {/* # 13. 공지 문구 */}
      {noticeText && (
        <div
          className="suddak-card home-notice"
          style={{
            padding: "14px 16px",
            borderColor: "var(--success-border)",
            background: "var(--success-soft)",
            fontWeight: 700,
            lineHeight: 1.7,
          }}
        >
          {noticeText}
        </div>
      )}

      {/* # 14. 메인 2단 레이아웃 */}
      <div className="home-main-grid">
        <div className="home-main-column">
          {/* # 14-1. 업로드 영역 */}
          <SectionCard
            title="사진 업로드"
            description="문제 사진을 올리거나 모바일에서 바로 촬영하면 자동으로 이미지가 정리돼서 더 안정적으로 읽을 수 있어."
          >
            <div className="home-card-stack">
              <FileDropzone
                previewUrl={currentPreview}
                onFileSelect={handleFileSelect}
                disabled={reading || solving}
              />

              <div className="home-settings-row">
                <div className="home-settings-anchor">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedAdjust((v) => !v)}
                    aria-label="이미지 세부 조정"
                    title="이미지 세부 조정"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "999px",
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    <Settings size={16} />
                  </button>

                  {showAdvancedAdjust && (
                    <div
                      className="suddak-card home-settings-popover"
                      style={{
                        position: "absolute",
                        top: "44px",
                        right: 0,
                        zIndex: 10,
                        padding: "12px",
                      }}
                    >
                      <OcrPreprocessPanel
                        value={imageAdjustOptions}
                        onChange={setImageAdjustOptions}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="home-action-grid">
                <button
                  type="button"
                  className="suddak-btn suddak-btn-primary"
                  onClick={handleReadProblem}
                  disabled={!file || reading}
                >
                  {reading ? "문제 인식 중..." : "문제 읽기"}
                </button>

                <button
                  type="button"
                  className="suddak-btn suddak-btn-ghost"
                  onClick={() => {
                    setFile(null);
                    setRecognizedText("");
                    setSolveResult("");
                    setSolveMeta(null);
                    setGraphSpec(null);
                    setSelectedFeedback(null);
                    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
                    if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
                    setOriginalPreviewUrl(null);
                    setProcessedPreviewUrl(null);
                    setNoticeText("");
                  }}
                  disabled={!file && !recognizedText && !solveResult}
                >
                  초기화
                </button>
              </div>
            </div>
          </SectionCard>

          {/* # 14-2. 문제 인식 결과 */}
          <SectionCard
            title="인식된 문제"
            description="잘못 읽은 부분은 직접 수정한 뒤 풀이를 요청해."
            rightSlot={
              recognizedText ? (
                <button
                  type="button"
                  className="suddak-btn suddak-btn-ghost home-section-action"
                  onClick={() => setIsEditingRecognized((v) => !v)}
                >
                  {isEditingRecognized ? "미리보기 보기" : "직접 수정"}
                </button>
              ) : null
            }
          >
            {recognizedText ? (
              <div className="home-card-stack-tight">
                {isEditingRecognized ? (
                  <textarea
                    className="suddak-textarea"
                    value={recognizedText}
                    onChange={(e) => setRecognizedText(e.target.value)}
                    placeholder="인식된 문제를 수정해줘"
                  />
                ) : (
                  <div
                    className="suddak-card-soft"
                    style={{
                      padding: "16px",
                    }}
                  >
                    <MarkdownMathBlock content={recognizedText} isDark={isDark} />
                  </div>
                )}

                <div className="home-action-grid">
                  <button
                    type="button"
                    className="suddak-btn suddak-btn-primary"
                    onClick={handleSolveProblem}
                    disabled={!recognizedText.trim() || solving}
                  >
                    {solving ? "풀이 생성 중..." : "풀이 시작"}
                  </button>

                  {isAdminUser && (
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
                        checked={includeGraph}
                        onChange={(e) => setIncludeGraph(e.target.checked)}
                      />
                      그래프 요청 포함
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="suddak-card-soft"
                style={{
                  padding: "18px",
                  color: "var(--muted)",
                  lineHeight: 1.8,
                }}
              >
                문제를 아직 읽지 않았어. 먼저 이미지를 업로드하고 “문제 읽기”를 눌러줘.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="home-side-column">
          {/* # 14-3. 풀이 결과 */}
          <SectionCard
            title="풀이 결과"
            description="풀이가 생성되면 메타 정보와 함께 확인할 수 있어."
            rightSlot={
              solveResult ? (
                <Link href={shareUrl} className="suddak-btn suddak-btn-primary">
                  커뮤니티에 공유
                </Link>
              ) : null
            }
          >
            {solveResult ? (
              <div className="home-card-stack-tight">
                {solveMeta && (
                  <div className="home-meta-grid">
                    <div className="suddak-card-soft" style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>과목</div>
                      <div style={{ fontWeight: 900, marginTop: "4px" }}>
                        {solveMeta.subjectLabel}
                      </div>
                    </div>

                    <div className="suddak-card-soft" style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>세부</div>
                      <div style={{ fontWeight: 900, marginTop: "4px" }}>
                        {solveMeta.subtopic || "-"}
                      </div>
                    </div>

                    <div className="suddak-card-soft" style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>난이도</div>
                      <div style={{ fontWeight: 900, marginTop: "4px" }}>
                        {difficultyLabelMap[solveMeta.difficulty]}
                      </div>
                    </div>

                    <div className="suddak-card-soft" style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>확신도</div>
                      <div style={{ fontWeight: 900, marginTop: "4px" }}>
                        {confidenceLabelMap[solveMeta.confidence]}
                      </div>
                    </div>
                  </div>
                )}

                <div className="home-card-stack-tight">
                  {answerText && (
                    <div
                      className="suddak-card-soft home-answer-card"
                      style={{
                        padding: "18px",
                        border: "1px solid var(--primary)",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, var(--card)), var(--card))",
                        boxShadow: "var(--shadow-soft)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "var(--muted)",
                          marginBottom: "8px",
                        }}
                      >
                        답
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                          fontWeight: 900,
                          lineHeight: 1.4,
                        }}
                      >
                        <MarkdownMathBlock content={answerText} isDark={isDark} />
                      </div>
                    </div>
                  )}

                  <div className="suddak-card-soft" style={{ padding: "16px" }}>
                    <MarkdownMathBlock content={explanationText} isDark={isDark} />
                  </div>

                  <div className="suddak-card-soft" style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 900,
                        color: "var(--muted)",
                        marginBottom: "10px",
                      }}
                    >
                      이 풀이 어땠어?
                    </div>

                    <div className="home-feedback-row">
                      {solveFeedbackOptions.map((option) => {
                        const isSelected = selectedFeedback === option.type;

                        return (
                          <button
                            key={option.type}
                            type="button"
                            className={`home-feedback-chip ${isSelected ? "home-feedback-chip-active" : ""}`}
                            onClick={() => handleSolveFeedback(option.type)}
                            disabled={
                              feedbackLoading || !solveMeta?.historyId || selectedFeedback !== null
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Link
                      href={buildSimilarProblemUrl({
                        historyId: solveMeta?.historyId ?? null,
                        source: "solve",
                      })}
                      className="suddak-btn suddak-btn-ghost"
                    >
                      유사문제 생성 Beta
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="suddak-card-soft"
                style={{
                  padding: "18px",
                  color: "var(--muted)",
                  lineHeight: 1.8,
                }}
              >
                아직 풀이 결과가 없어. 문제를 인식한 뒤 풀이 시작 버튼을 눌러줘.
              </div>
            )}
          </SectionCard>

          {/* # 14-4. 그래프 카드 */}
          {graphSpec && (
            <SectionCard
              title="그래프 / 시각화"
              description="풀이 과정에서 필요하다고 판단된 그래프 정보야."
            >
              <GraphPreview graph={graphSpec} isDark={isDark} />
            </SectionCard>
          )}

          {/* # 14-5. 빠른 이동 */}
          <SectionCard
            title="빠른 이동"
            description="풀이한 문제를 기록하거나 커뮤니티로 이어갈 수 있어."
          >
            <div className="home-quick-links">
              <Link href="/history" className="suddak-btn suddak-btn-ghost">
                내 기록 보기
              </Link>

              <Link href="/community" className="suddak-btn suddak-btn-ghost">
                커뮤니티 가기
              </Link>

              <Link href="/login" className="suddak-btn suddak-btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="suddak-btn suddak-btn-primary">
                회원가입
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
