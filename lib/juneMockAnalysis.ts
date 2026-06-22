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

import {
  JUNE_MOCK_ANALYSIS_CONTENT,
  JUNE_MOCK_NEW_PRACTICE_PROBLEMS,
} from "@/lib/juneMockContent";

export const JUNE_MOCK_ANALYSIS_ENABLED = true;
export const JUNE_MOCK_ANALYSIS_URL = "/naesin";
export const JUNE_MOCK_COMMUNITY_URL = "/community";
export const JUNE_MOCK_OFFICIAL_SOURCE_URL = "https://cdn.kice.re.kr/suneung27mo06/index.html";

export const JUNE_MOCK_POPUP_STORAGE_KEY =
  "suddak-naesin-final-exam-popup-hidden-until";
export const JUNE_MOCK_POPUP_SESSION_KEY =
  "suddak-naesin-final-exam-popup-closed-session";

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
  analysisUrl: string;
  practiceUrl?: string;
  featured?: boolean;
  officialSourceUrl: string;
  sourceLocation: string;
  overview: string[];
  keyIdeas: string[];
  solutionSteps: string[];
  commonMistakes: string[];
  originalAnswer: string;
};

export type PracticeProblem = {
  id: string;
  parentId: string;
  level: 1 | 2 | 3;
  label: string;
  title: string;
  description: string;
  questionType: "short-answer";
  status: "published" | "coming-soon";
  content: string;
  options?: string[];
  answer: string;
  explanation: string[];
  difficulty: number;
  tags: string[];
  variationPoint: string;
  printContent?: string;
  printAnswerLine?: boolean;
  sourceLabel?: string;
  estimatedSpace?: "small" | "medium" | "large";
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

export const JUNE_MOCK_ANALYSIS_PROBLEMS: AnalysisProblem[] = JUNE_MOCK_ANALYSIS_CONTENT;

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
  { label: "공통 21번", status: "공개 완료" },
  { label: "미적분 28번", status: "공개 완료" },
  { label: "확률과 통계 28번", status: "공개 완료" },
  { label: "기하 28번", status: "공개 완료" },
];

export const JUNE_MOCK_PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: "common-22-level-1",
    parentId: "common-22",
    level: 1,
    label: "Level 1 · 기본 변형",
    title: "증가량을 바꾸어 다시 세기",
    description: "원문과 같은 풀이 구조를 익히는 기본 변형 문제입니다.",
    questionType: "short-answer",
    status: "published",
    content: `수열 $\\{b_n\\}$은 $b_1 = 2$, $b_3 = 5$이고, 모든 자연수 $n$에 대하여

$$
b_{2n} = b_n + 1
$$

$$
b_{4n+1} = b_{4n+3} = b_n + 3
$$

을 만족시킨다. $b_k = 8$을 만족시키는 자연수 $k$의 개수를 구하시오.`,
    answer: "16",
    explanation: [`$b_1 = 2$에서 시작하는 경우에는 총 6만큼 증가해야 한다.
값이 1 증가하는 이동의 횟수를 $x$, 값이 3 증가하는 이동의 횟수를 $y$라고 하면

$$
x + 3y = 6
$$

이다.

가능한 경우는 다음과 같다.

- $(x, y) = (6, 0)$: 1가지
- $(x, y) = (3, 1)$: 이동 순서 4가지 $\\times$ 두 갈래 선택 2가지 $= 8$가지
- $(x, y) = (0, 2)$: 두 갈래 선택 $2^2 = 4$가지

따라서 $b_1 = 2$에서 출발하는 경우는 13가지이다.

$b_3 = 5$에서 시작하는 경우에는 총 3만큼 증가해야 한다.

- 1 증가 이동을 3번 사용하는 경우: 1가지
- 3 증가 이동을 1번 사용하는 경우: 두 갈래 선택 2가지

따라서 $b_3 = 5$에서 출발하는 경우는 3가지이다.

두 경우를 더하면

$$
13 + 3 = 16
$$

이므로 정답은 16이다.`],
    difficulty: 3.2,
    tags: ["수열", "경우 분류", "경로 해석", "기본 변형"],
    variationPoint:
      "원문의 이동 구조는 유지하면서 두 갈래 이동의 증가량을 4에서 3으로 변경했습니다.",
    printAnswerLine: true,
    sourceLabel: "2027학년도 6월 모평 공통 22번 기본 변형",
    estimatedSpace: "medium",
  },
  {
    id: "common-22-level-2",
    parentId: "common-22",
    level: 2,
    label: "Level 2 · 구조 변형",
    title: "서로 다른 증가량을 점화식으로 세기",
    description: "두 갈래 이동의 증가량이 서로 달라진 구조 변형 문제입니다.",
    questionType: "short-answer",
    status: "published",
    content: `수열 $\\{c_n\\}$은 $c_1 = 1$, $c_3 = 2$이고, 모든 자연수 $n$에 대하여

$$
c_{2n} = c_n + 1
$$

$$
c_{4n+1} = c_n + 3
$$

$$
c_{4n+3} = c_n + 4
$$

를 만족시킨다. $c_k = 9$를 만족시키는 자연수 $k$의 개수를 구하시오.`,
    answer: "40",
    explanation: [`현재 값에서 목표값까지 남은 증가량이 $d$일 때 가능한 경로의 수를 $F(d)$라고 하자.

가능한 이동은 다음과 같다.

- 값이 1 증가하는 이동
- 값이 3 증가하는 이동
- 값이 4 증가하는 이동

따라서

$$
F(0) = 1
$$

이고, $d$가 양수일 때

$$
F(d) = F(d - 1) + F(d - 3) + F(d - 4)
$$

이다. 단, 아래첨자가 음수인 항은 0으로 처리한다.

차례대로 계산하면

$$
\\begin{aligned}
F(0)&=1, & F(1)&=1, & F(2)&=1, \\\\
F(3)&=2, & F(4)&=4, & F(5)&=6, \\\\
F(6)&=9, & F(7)&=15, & F(8)&=25
\\end{aligned}
$$

이다.

$c_1 = 1$에서 시작하는 경우에는 8만큼 증가해야 하므로 25가지이다.
$c_3 = 2$에서 시작하는 경우에는 7만큼 증가해야 하므로 15가지이다.

따라서

$$
25 + 15 = 40
$$

이므로 정답은 40이다.`],
    difficulty: 4.0,
    tags: ["수열", "점화식", "경우 분류", "구조 변형"],
    variationPoint:
      "원문에서는 두 갈래 이동의 증가량이 같았지만, 이 문항에서는 각각 3과 4로 다르게 설정했습니다.",
    printAnswerLine: true,
    sourceLabel: "2027학년도 6월 모평 공통 22번 구조 변형",
    estimatedSpace: "large",
  },
  {
    id: "common-22-level-3",
    parentId: "common-22",
    level: 3,
    label: "Level 3 · 심화 변형",
    title: "조건을 만족하는 첨자의 합 추적하기",
    description:
      "가능한 경로의 개수를 넘어 조건을 만족하는 첨자의 합까지 추적하는 심화 문제입니다.",
    questionType: "short-answer",
    status: "published",
    content: `수열 $\\{d_n\\}$은 $d_1 = 1$, $d_3 = 3$이고, 모든 자연수 $n$에 대하여

$$
d_{2n} = d_n + 1
$$

$$
d_{4n+1} = d_{4n+3} = d_n + 3
$$

을 만족시킨다. $d_k = 8$을 만족시키는 모든 자연수 $k$의 합을 $S$라 하자. $\\frac{S}{2}$의 값을 구하시오.`,
    answer: "940",
    explanation: [`현재 첨자가 $x$일 때 가능한 이동은 다음과 같다.

- $x \\to 2x$
- $x \\to 4x + 1$
- $x \\to 4x + 3$

현재 값에서 목표값까지 남은 증가량이 $m$일 때, 도달 가능한 모든 첨자의 합을 $T_m(x)$라고 하자.

초기값은

$$
T_0(x) = x
$$

이다.

각 이동에 따라 다음 점화식을 얻는다.

$$
T_m(x) = T_{m-1}(2x) + T_{m-3}(4x+1) + T_{m-3}(4x+3)
$$

단, 아래첨자가 음수인 항은 0으로 처리한다.

$d_1 = 1$에서 출발하는 경우에는 7만큼 증가해야 하므로

$$
T_7(1) = 1468
$$

이다.

$d_3 = 3$에서 출발하는 경우에는 5만큼 증가해야 하므로

$$
T_5(3) = 412
$$

이다.

따라서

$$
S = 1468 + 412 = 1880
$$

이고,

$$
\\frac{S}{2} = 940
$$

이므로 정답은 940이다.`],
    difficulty: 4.7,
    tags: ["수열", "경로 추적", "첨자의 합", "심화 변형"],
    variationPoint:
      "원문의 경우의 수 계산을 확장하여, 조건을 만족하는 첨자의 합을 재귀적으로 추적하도록 만들었습니다.",
    printAnswerLine: true,
    sourceLabel: "2027학년도 6월 모평 공통 22번 심화 변형",
    estimatedSpace: "large",
  },
];

for (const problem of JUNE_MOCK_PRACTICE_PROBLEMS) {
  problem.printContent = problem.content;
}

export const JUNE_MOCK_ALL_PRACTICE_PROBLEMS = [
  ...JUNE_MOCK_PRACTICE_PROBLEMS,
  ...JUNE_MOCK_NEW_PRACTICE_PROBLEMS,
];

export function getJuneMockAnalysisProblem(problemId: string) {
  return JUNE_MOCK_ANALYSIS_PROBLEMS.find((problem) => problem.id === problemId);
}

export function getJuneMockPracticeProblems(problemId: string) {
  return JUNE_MOCK_ALL_PRACTICE_PROBLEMS.filter(
    (problem) => problem.parentId === problemId
  );
}

export const JUNE_MOCK_DETAIL_SECTIONS = [
  { title: "문항 한눈에 보기", icon: FileText },
  { title: "핵심 아이디어", icon: Sigma },
  { title: "풀이 흐름", icon: BarChart3 },
  { title: "자주 하는 실수", icon: ListChecks },
  { title: "유사문항으로 복습하기", icon: PenLine },
];
