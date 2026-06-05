import {
  BarChart3,
  Brain,
  FileText,
  GitBranch,
  ListChecks,
  PenLine,
  Sigma,
  type LucideIcon,
} from "lucide-react";

export const JUNE_MOCK_ANALYSIS_ENABLED = true;
export const JUNE_MOCK_ANALYSIS_URL = "/analysis/2027-june-mock";
export const JUNE_MOCK_COMMUNITY_URL = "/community";
export const JUNE_MOCK_OFFICIAL_SOURCE_URL = "https://cdn.kice.re.kr/suneung27mo06/index.html";

export const JUNE_MOCK_POPUP_STORAGE_KEY =
  "suddak-june-mock-analysis-popup-hidden-until";
export const JUNE_MOCK_POPUP_SESSION_KEY =
  "suddak-june-mock-analysis-popup-closed-session";

export type AnalysisSubject = "공통" | "미적분" | "확률과 통계" | "기하";
export type AnalysisSubjectFilter = "전체" | AnalysisSubject;

export type AnalysisProblem = {
  id: string;
  subject: AnalysisSubject;
  number: number;
  title: string;
  summary: string;
  concepts: string[];
  difficulty: number;
  status: "published" | "coming-soon";
  analysisUrl?: string;
  practiceUrl?: string;
  featured?: boolean;
  officialSourceUrl?: string;
};

export type PracticeProblem = {
  id: string;
  level: 1 | 2 | 3;
  label: string;
  title: string;
  description: string;
  status: "published" | "coming-soon";
  content?: string;
  options?: string[];
  answer?: number;
  explanation?: string;
};

export type JuneMockSummaryCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const JUNE_MOCK_SUBJECT_FILTERS: AnalysisSubjectFilter[] = [
  "전체",
  "공통",
  "미적분",
  "확률과 통계",
  "기하",
];

export const JUNE_MOCK_SUMMARY_CARDS: JuneMockSummaryCard[] = [
  {
    title: "조건 해석의 중요성",
    description: "복잡한 계산보다 주어진 조건을 정확히 구조화하는 능력이 중요했습니다.",
    icon: Brain,
  },
  {
    title: "공통 후반부 변별력",
    description: "공통 후반부 문항에서는 여러 가능성을 빠짐없이 분류하는 능력이 요구되었습니다.",
    icon: ListChecks,
  },
  {
    title: "원리 중심의 복습",
    description: "숫자만 바뀐 문제보다 풀이 구조가 변형된 문제까지 연습하는 것이 중요합니다.",
    icon: GitBranch,
  },
];

export const JUNE_MOCK_ANALYSIS_PROBLEMS: AnalysisProblem[] = [
  {
    id: "common-22",
    subject: "공통",
    number: 22,
    title: "귀납적으로 정의된 수열의 경우 분류",
    summary: "출발점과 증가량을 구분하여 목표값에 도달하는 경로를 체계적으로 세는 문항입니다.",
    concepts: ["수열", "경우 분류", "경로 해석"],
    difficulty: 4.5,
    status: "published",
    analysisUrl: "/analysis/2027-june-mock/common-22",
    practiceUrl: "/analysis/2027-june-mock/common-22/practice",
    featured: true,
    officialSourceUrl: JUNE_MOCK_OFFICIAL_SOURCE_URL,
  },
  {
    id: "common-21",
    subject: "공통",
    number: 21,
    title: "함수 그래프 조건의 구조화",
    summary: "함수의 개형과 주어진 조건 사이의 관계를 파악하는 문항입니다.",
    concepts: ["함수", "그래프", "조건 해석"],
    difficulty: 4.0,
    status: "coming-soon",
  },
  {
    id: "calculus-main",
    subject: "미적분",
    number: 28,
    title: "미적분 주요 문항 분석",
    summary: "조건을 식으로 변환하고 계산 흐름을 정리하는 문항을 분석합니다.",
    concepts: ["미적분", "조건 해석"],
    difficulty: 4.0,
    status: "coming-soon",
  },
  {
    id: "probability-main",
    subject: "확률과 통계",
    number: 28,
    title: "확률과 통계 주요 문항 분석",
    summary: "경우를 분류하고 누락 없이 계산하는 문항을 분석합니다.",
    concepts: ["확률과 통계", "경우 분류"],
    difficulty: 4.0,
    status: "coming-soon",
  },
  {
    id: "geometry-main",
    subject: "기하",
    number: 28,
    title: "기하 주요 문항 분석",
    summary: "도형 조건을 구조화하여 해결하는 문항을 분석합니다.",
    concepts: ["기하", "도형 해석"],
    difficulty: 4.0,
    status: "coming-soon",
  },
];

export const JUNE_MOCK_FEATURED_POINTS = [
  "출발 가능한 항을 먼저 구분하기",
  "한 번에 증가하는 값의 종류 확인하기",
  "같은 합을 만드는 배열 순서 세기",
  "단계마다 가능한 선택지 수를 빠뜨리지 않기",
];

export const JUNE_MOCK_COMMON_22_IDEAS = [
  "출발 가능한 경우를 먼저 구분합니다.",
  "목표값을 만들기 위한 증가량의 조합을 찾습니다.",
  "배열 순서와 단계별 선택지를 따로 계산합니다.",
  "누락되거나 중복된 경우가 없는지 검산합니다.",
];

export const JUNE_MOCK_UPDATE_STATUSES = [
  { label: "공통 22번", status: "공개 완료" },
  { label: "공통 21번", status: "준비 중" },
  { label: "미적분 주요 문항", status: "준비 중" },
  { label: "확률과 통계 주요 문항", status: "준비 중" },
  { label: "기하 주요 문항", status: "준비 중" },
];

export const JUNE_MOCK_PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: "common-22-level-1",
    level: 1,
    label: "Level 1 · 기본 변형",
    title: "풀이 구조 익히기",
    description: "원문의 풀이 구조를 익히는 문제",
    status: "coming-soon",
  },
  {
    id: "common-22-level-2",
    level: 2,
    label: "Level 2 · 구조 변형",
    title: "조건이 달라지는 변형",
    description: "출발점과 증가량 조건이 달라지는 문제",
    status: "coming-soon",
  },
  {
    id: "common-22-level-3",
    level: 3,
    label: "Level 3 · 심화 변형",
    title: "역추적과 경우 분류",
    description: "경우를 역추적하여 분류해야 하는 문제",
    status: "coming-soon",
  },
];

export const JUNE_MOCK_DETAIL_SECTIONS = [
  { title: "문항 한눈에 보기", icon: FileText },
  { title: "핵심 아이디어", icon: Sigma },
  { title: "풀이 흐름", icon: BarChart3 },
  { title: "자주 하는 실수", icon: ListChecks },
  { title: "유사문항으로 복습하기", icon: PenLine },
];
