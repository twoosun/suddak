"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  History,
  PenLine,
  RefreshCw,
  ScanSearch,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import FileDropzone from "@/components/home/FileDropzone";
import OcrPreprocessPanel from "@/components/home/OcrPreprocessPanel";
import MoreMenu from "@/components/MoreMenu";
import CurrencyRewardPopup from "@/components/CurrencyRewardPopup";
import NotificationBellPopup from "@/components/NotificationBellPopup";
import { buildShareUrlFromSolve } from "@/lib/community-share";
import { saveHistoryMetadata } from "@/lib/history-metadata";
import {
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  type OcrPreprocessOptions,
  buildPreprocessedPreviewUrl,
} from "@/lib/ocr-preprocess";
import { buildSimilarProblemUrl } from "@/lib/similar-problem";
import { getSessionWithRecovery, supabase } from "@/lib/supabase";
import { applyTheme, getStoredTheme, toggleTheme } from "@/lib/theme";

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

type HomeStats = {
  totalAiLearningRecords: number;
  totalCommunityPosts: number;
  totalSimilarProblemGenerations: number;
};

const heroHeadlines = [
  "공부가 연결되는 곳, SUDDAK",
  "문제풀이가 이어지는 곳, SUDDAK",
  "수학공부가 쉬워지는 곳, SUDDAK",
  "풀고, 나누고, 성장하는 곳, SUDDAK",
  "문제 하나로 시작되는 공부, SUDDAK",
  "혼자 풀어도 함께 배우는 곳, SUDDAK",
  "풀이가 지식이 되는 곳, SUDDAK",
  "질문이 공부가 되는 곳, SUDDAK",
  "내신공부가 연결되는 곳, SUDDAK",
  "문풀과 커뮤니티가 만나는 곳, SUDDAK",
];

const easterEggHeadlines = [
  "잠깐, 분모가 0은 아니겠지?",
  "AI도 가끔은 찍고 싶다.",
];

function getRandomUnit() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }

  return Math.random();
}

function pickHeroHeadline(isLoggedIn: boolean) {
  if (isLoggedIn && getRandomUnit() < 0.001) {
    return easterEggHeadlines[Math.floor(getRandomUnit() * easterEggHeadlines.length)];
  }

  return heroHeadlines[Math.floor(getRandomUnit() * heroHeadlines.length)];
}

const difficultyLabelMap: Record<DifficultyLevel, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

const confidenceLabelMap: Record<SolveMeta["confidence"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const featureLinks = [
  { href: "/", label: "문제풀이", icon: Sparkles },
  { href: "/history", label: "기록실", icon: History },
  { href: "/similar", label: "유사문제 생성기", icon: ScanSearch },
  { href: "/admin/exam-builder", label: "시험지 생성", icon: FileText },
  { href: "/naesin", label: "내신딱딱", icon: BookOpen },
  { href: "/community", label: "커뮤니티", icon: BarChart3, badge: "HOT!" },
];

function extractAnswerSection(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const koreanMatch = normalized.match(/##\s*정답\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
  const englishMatch = normalized.match(/##\s*Answer\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
  const match = koreanMatch ?? englishMatch;

  return {
    answer: match?.[1]?.trim() ?? "",
    body: match ? normalized.replace(match[0], "").trim() : normalized.trim(),
  };
}

function GraphPreview({ graph }: { graph: GraphSpec }) {
  const width = 420;
  const height = 260;
  const padding = 32;
  const yValues = graph.points.map((point) => point.y);
  const yMin = graph.y_min ?? (yValues.length ? Math.min(...yValues) - 1 : -5);
  const yMax = graph.y_max ?? (yValues.length ? Math.max(...yValues) + 1 : 5);
  const safeXMax = graph.x_max === graph.x_min ? graph.x_min + 1 : graph.x_max;
  const safeYMax = yMax === yMin ? yMin + 1 : yMax;
  const mapX = (x: number) =>
    padding + ((x - graph.x_min) / (safeXMax - graph.x_min)) * (width - padding * 2);
  const mapY = (y: number) =>
    height - padding - ((y - yMin) / (safeYMax - yMin)) * (height - padding * 2);
  const xAxisY = yMin <= 0 && 0 <= safeYMax ? mapY(0) : mapY(yMin);
  const yAxisX = graph.x_min <= 0 && 0 <= safeXMax ? mapX(0) : mapX(graph.x_min);

  return (
    <div className="questi-result-card">
      <div className="questi-card-title">그래프 미리보기</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="questi-graph">
        <rect width={width} height={height} rx="18" fill="#101010" />
        <line x1={padding} y1={xAxisY} x2={width - padding} y2={xAxisY} stroke="#6b7280" />
        <line x1={yAxisX} y1={padding} x2={yAxisX} y2={height - padding} stroke="#6b7280" />
        {graph.points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={mapX(point.x)} cy={mapY(point.y)} r="5" fill="#8b5cf6" />
            <text x={mapX(point.x) + 8} y={mapY(point.y) - 8} fill="#f8fafc" fontSize="12">
              {point.label || `(${point.x}, ${point.y})`}
            </text>
          </g>
        ))}
      </svg>
      <p className="questi-muted">{graph.equation}</p>
      {graph.note && <p className="questi-muted">{graph.note}</p>}
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [usageText, setUsageText] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [homeStats, setHomeStats] = useState<HomeStats>({
    totalAiLearningRecords: 0,
    totalCommunityPosts: 0,
    totalSimilarProblemGenerations: 0,
  });
  const [activeStatIndex, setActiveStatIndex] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageAdjustOptions, setImageAdjustOptions] = useState<OcrPreprocessOptions>(
    DEFAULT_OCR_PREPROCESS_OPTIONS,
  );
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [showAdvancedAdjust, setShowAdvancedAdjust] = useState(false);

  const [recognizedText, setRecognizedText] = useState("");
  const [solveResult, setSolveResult] = useState("");
  const [solveMeta, setSolveMeta] = useState<SolveMeta | null>(null);
  const [graphSpec, setGraphSpec] = useState<GraphSpec | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [includeGraph, setIncludeGraph] = useState(false);

  useEffect(() => {
    applyTheme("dark");
    setIsDark(getStoredTheme() === "dark");

    let active = true;
    void getSessionWithRecovery().then((currentSession) => {
      if (!active) return;

      setSession(currentSession);
      setHeroHeadline(pickHeroHeadline(Boolean(currentSession?.access_token)));
      setMounted(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUsage = async () => {
    const currentSession = await getSessionWithRecovery();

    if (!currentSession?.access_token) {
      setIsAdminUser(false);
      setUsageText("로그인하면 풀이 기록 저장과 일일 사용량을 확인할 수 있어요.");
      return;
    }

    try {
      const res = await fetch("/api/usage", {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) return;

      if (data.isAdmin) {
        setIsAdminUser(true);
        setUsageText("관리자 계정 · 문제 인식과 풀이를 제한 없이 사용할 수 있어요.");
      } else {
        setIsAdminUser(false);
        setUsageText(
          `문제 인식 ${data.readToday}회 사용 / ${data.readRemaining}회 남음 · 풀이 ${data.solveToday}회 사용 / ${data.solveRemaining}회 남음`,
        );
      }
    } catch {
      setUsageText("");
      setIsAdminUser(false);
    }
  };

  useEffect(() => {
    if (mounted) void loadUsage();
  }, [mounted, session]);

  useEffect(() => {
    if (!mounted) return;

    let active = true;

    const loadHomeStats = async () => {
      try {
        const res = await fetch("/api/home-stats", { cache: "no-store" });
        const data = (await res.json()) as Partial<HomeStats>;

        if (!active || !res.ok) return;

        setHomeStats({
          totalAiLearningRecords: Number(data.totalAiLearningRecords ?? 0),
          totalCommunityPosts: Number(data.totalCommunityPosts ?? 0),
          totalSimilarProblemGenerations: Number(data.totalSimilarProblemGenerations ?? 0),
        });
      } catch {
        if (active) {
          setHomeStats({
            totalAiLearningRecords: 0,
            totalCommunityPosts: 0,
            totalSimilarProblemGenerations: 0,
          });
        }
      }
    };

    void loadHomeStats();

    return () => {
      active = false;
    };
  }, [mounted]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStatIndex((index) => index + 1);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    const renderPreview = async () => {
      try {
        setPreprocessLoading(true);
        const { previewUrl: nextPreviewUrl } = await buildPreprocessedPreviewUrl(
          file,
          imageAdjustOptions,
        );

        if (cancelled) {
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }

        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextPreviewUrl;
        });
      } catch {
        if (!cancelled) {
          setNoticeText("보정 미리보기를 다시 만들지 못했어요. 현재 이미지로 계속 진행할 수 있어요.");
        }
      } finally {
        if (!cancelled) setPreprocessLoading(false);
      }
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [file, imageAdjustOptions]);

  const resetResult = () => {
    setRecognizedText("");
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setNoticeText("");
  };

  const handleFileSelect = async (selected?: File | null, source: "upload" | "camera" = "upload") => {
    if (!selected) return;
    resetResult();
    setFile(selected);
    setShowAdvancedAdjust(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
    setImageAdjustOptions(
      source === "camera"
        ? { ...DEFAULT_OCR_PREPROCESS_OPTIONS, threshold: true }
        : DEFAULT_OCR_PREPROCESS_OPTIONS,
    );
  };

  const clearAll = () => {
    setFile(null);
    resetResult();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageAdjustOptions(DEFAULT_OCR_PREPROCESS_OPTIONS);
    setShowAdvancedAdjust(false);
  };

  const handleReadProblem = async () => {
    if (!file) {
      setNoticeText("먼저 문제 이미지를 올려주세요.");
      return;
    }

    setReading(true);
    setRecognizedText("");
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setNoticeText("");

    try {
      const currentSession = await getSessionWithRecovery();
      if (!currentSession?.access_token) {
        setNoticeText("로그인하면 문제 인식을 사용할 수 있어요.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "read");
      formData.append("image", file);

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setNoticeText(data?.error || "문제 인식에 실패했어요.");
        return;
      }

      setRecognizedText(data.result || "");
      setNoticeText("문제 인식이 끝났어요. 잘못 읽힌 부분을 확인하고 풀이를 시작하세요.");
    } catch {
      setNoticeText("문제 인식 중 오류가 발생했어요.");
    } finally {
      setReading(false);
      await loadUsage();
    }
  };

  const handleSolveProblem = async () => {
    if (!recognizedText.trim()) {
      setNoticeText("문제를 먼저 인식하거나 직접 입력해주세요.");
      return;
    }

    setSolving(true);
    setSolveResult("");
    setSolveMeta(null);
    setGraphSpec(null);
    setNoticeText("");

    try {
      const currentSession = await getSessionWithRecovery();
      if (!currentSession?.access_token) {
        setNoticeText("로그인하면 풀이 생성을 사용할 수 있어요.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "solve");
      formData.append("recognizedProblem", recognizedText);
      if (isAdminUser) formData.append("includeGraph", includeGraph ? "true" : "false");

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setNoticeText(data?.error || "풀이 생성에 실패했어요.");
        return;
      }

      setSolveResult(data.result || "");
      setSolveMeta(data.meta ?? null);
      setGraphSpec(data.graph ?? null);
      setNoticeText("풀이가 생성됐어요.");
    } catch {
      setNoticeText("풀이 생성 중 오류가 발생했어요.");
    } finally {
      setSolving(false);
      await loadUsage();
    }
  };

  const parsedSolveResult = solveResult ? extractAnswerSection(solveResult) : { answer: "", body: "" };
  const answerText = solveMeta?.finalAnswer?.trim() || parsedSolveResult.answer;
  const explanationText = solveMeta?.conciseSolution?.trim() || parsedSolveResult.body || solveResult;
  const shareUrl = useMemo(
    () => buildShareUrlFromSolve({ recognizedText, solveResult }),
    [recognizedText, solveResult],
  );
  const hasStartedWorkflow = Boolean(file || recognizedText || solveResult);
  const heroStats = useMemo(
    () => [
      {
        label: "누적 AI 학습 기록",
        value: homeStats.totalAiLearningRecords,
        icon: BarChart3,
      },
      {
        label: "누적 커뮤니티 게시글",
        value: homeStats.totalCommunityPosts,
        icon: BookOpen,
      },
      {
        label: "누적 변형문제 생성",
        value: homeStats.totalSimilarProblemGenerations,
        icon: ScanSearch,
      },
    ],
    [homeStats],
  );
  const activeHeroStat = heroStats[activeStatIndex % heroStats.length];
  const ActiveHeroStatIcon = activeHeroStat.icon;

  if (!mounted) return null;

  return (
    <main className="questi-page">
      <header className="questi-topbar">
        <Link href="/" className="questi-logo" aria-label="수딱 홈">
          <img src="/logo.png" alt="" />
          <span>SUDDAK</span>
        </Link>

        <div className="questi-top-actions">
          <CurrencyRewardPopup isDark={isDark} />
          <NotificationBellPopup isDark={isDark} />
          <MoreMenu
            isDark={isDark}
            onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
            themeLabel={isDark ? "라이트 모드" : "다크 모드"}
            redirectAfterLogout="/login"
          />
        </div>
      </header>

      <section className="questi-hero">
        <p className="questi-eyebrow">함께 성장하는 AI 학습 플랫폼</p>
        <h1>
          {heroHeadline.replace("SUDDAK", "")}
          {heroHeadline.includes("SUDDAK") ? <span>SUDDAK</span> : null}
        </h1>
        <div className="questi-counter" aria-live="polite">
          <div key={activeHeroStat.label} className="questi-counter-slide">
            <ActiveHeroStatIcon size={16} />
            <span>{activeHeroStat.label}</span>
            <strong>+ {activeHeroStat.value.toLocaleString("ko-KR")}</strong>
          </div>
        </div>
      </section>

      <section className="questi-feature-grid" aria-label="주요 기능">
        {featureLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={`${item.label}-${item.href}`} href={item.href} className="questi-feature">
              {item.badge && <span className="questi-feature-badge">{item.badge}</span>}
              <span className="questi-feature-icon">
                <Icon size={30} strokeWidth={2.2} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </section>

      {!hasStartedWorkflow ? (
        <section className="questi-composer questi-compact-composer" aria-label="문제 사진 업로드">
          <div className="questi-composer-head">
            <div>
              <span className="questi-status-dot">
                <CheckCircle2 size={18} />
              </span>
              문항별 풀이
            </div>
            <span>{usageText}</span>
          </div>
          {noticeText && <div className="questi-notice">{noticeText}</div>}
          <FileDropzone
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            disabled={reading || solving}
            compact
          />
        </section>
      ) : (
      <section className="questi-composer questi-workflow" aria-label="문제 풀이 워크플로우">
        <div className="questi-composer-head">
          <div>
            <span className="questi-status-dot">
              <CheckCircle2 size={18} />
            </span>
            문항별 풀이
          </div>
          <span>{usageText}</span>
        </div>

        <div className="questi-stepper" aria-label="풀이 단계">
          <span className="questi-step-chip questi-step-chip-active">1 업로드</span>
          <span className={`questi-step-chip ${file ? "questi-step-chip-active" : ""}`}>2 자르기/보정</span>
          <span className={`questi-step-chip ${recognizedText ? "questi-step-chip-active" : ""}`}>
            3 인식 확인
          </span>
          <span className={`questi-step-chip ${solveResult ? "questi-step-chip-active" : ""}`}>4 풀이</span>
        </div>

        {noticeText && <div className="questi-notice">{noticeText}</div>}

        <div className="questi-workflow-grid">
          <section className="questi-workflow-panel">
            <div className="questi-panel-head">
              <div>
                <span>1</span>
                문제 업로드
              </div>
              <p>사진을 올린 뒤 필요한 영역만 자르세요.</p>
            </div>
            <FileDropzone
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              disabled={reading || solving}
            />
          </section>

          <section className="questi-workflow-panel">
            <div className="questi-panel-head">
              <div>
                <span>2</span>
                보정 설정
              </div>
              <p>흑백, 대비, 선명도, 이진화 옵션을 조정한 뒤 인식합니다.</p>
            </div>

            <button
              type="button"
              className="questi-tool-button questi-adjust-toggle"
              onClick={() => setShowAdvancedAdjust((value) => !value)}
              disabled={!file || reading || solving}
            >
              <Settings size={18} />
              {showAdvancedAdjust ? "보정 닫기" : "보정 열기"}
            </button>

            {showAdvancedAdjust && (
              <div className="questi-adjust-panel">
                <OcrPreprocessPanel value={imageAdjustOptions} onChange={setImageAdjustOptions} />
              </div>
            )}

            <div className="questi-action-row">
              <button
                type="button"
                className="questi-tool-button"
                onClick={handleReadProblem}
                disabled={!file || reading || preprocessLoading}
              >
                <RefreshCw size={18} />
                {reading ? "인식 중" : preprocessLoading ? "보정 중" : "문제 인식"}
              </button>
              <button
                type="button"
                className="questi-tool-button"
                onClick={clearAll}
                disabled={!file && !recognizedText && !solveResult}
              >
                초기화
              </button>
            </div>
          </section>
        </div>

        <section className="questi-workflow-panel questi-recognition-panel">
          <div className="questi-panel-head">
            <div>
              <span>3</span>
              인식 결과 확인
            </div>
            <p>잘못 읽힌 부분을 직접 고친 뒤 풀이를 진행하세요.</p>
          </div>

          <textarea
            className="questi-textarea questi-recognition-textarea"
            value={recognizedText}
            onChange={(event) => setRecognizedText(event.target.value)}
            placeholder="문제 인식 결과가 여기에 표시됩니다. 직접 문제를 입력해도 됩니다."
          />
        </section>

        <section className="questi-workflow-panel">
          <div className="questi-panel-head">
            <div>
              <span>4</span>
              풀이 진행
            </div>
            <p>확인한 문제로 풀이를 생성합니다.</p>
          </div>

          <div className="questi-composer-actions">
            <div className="questi-left-tools">
              {isAdminUser && (
                <label className="questi-checkbox">
                  <input
                    type="checkbox"
                    checked={includeGraph}
                    onChange={(event) => setIncludeGraph(event.target.checked)}
                  />
                  그래프 요청
                </label>
              )}
              <button
                type="button"
                className="questi-formula-button"
                onClick={() => setRecognizedText((value) => `${value}${value ? "\n" : ""}$ $`)}
              >
                <PenLine size={18} />
                수식
              </button>
            </div>

            <button
              type="button"
              className="questi-solve-button"
              onClick={handleSolveProblem}
              disabled={!recognizedText.trim() || solving}
            >
              {solving ? "풀이 생성 중" : "풀이 시작"}
            </button>
          </div>
        </section>
      </section>
      )}

      {(solveResult || graphSpec) && (
        <section className="questi-results">
          {solveResult && (
            <div className="questi-result-card">
              <div className="questi-result-head">
                <div>
                  <div className="questi-card-title">풀이 결과</div>
                  {solveMeta && (
                    <p className="questi-muted">
                      {solveMeta.subjectLabel} · {solveMeta.subtopic || "단원 미분류"} · 난이도{" "}
                      {difficultyLabelMap[solveMeta.difficulty]} · 신뢰도{" "}
                      {confidenceLabelMap[solveMeta.confidence]}
                    </p>
                  )}
                </div>
                <div className="questi-result-actions">
                  <Link href={shareUrl} className="questi-small-button">
                    <Send size={15} />
                    공유
                  </Link>
                  <Link
                    href={buildSimilarProblemUrl({
                      historyId: solveMeta?.historyId ?? null,
                      source: "solve",
                    })}
                    className="questi-small-button"
                  >
                    유사문제
                  </Link>
                  <Link href="/history" className="questi-small-button">
                    <History size={15} />
                    기록
                  </Link>
                </div>
              </div>

              {answerText && (
                <div className="questi-answer">
                  <span>정답</span>
                  <MarkdownMathBlock content={answerText} isDark />
                </div>
              )}

              <div className="questi-markdown">
                <MarkdownMathBlock content={explanationText} isDark />
              </div>
            </div>
          )}

          {graphSpec && <GraphPreview graph={graphSpec} />}
        </section>
      )}
    </main>
  );
}
