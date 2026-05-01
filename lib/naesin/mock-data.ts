import type { NaesinExamSet, NaesinSubject, NaesinUnitPractice } from "./types";

export const naesinSubjects: Array<{ value: NaesinSubject; label: string }> = [
  { value: "all", label: "전체" },
  { value: "common-math", label: "공통수학" },
  { value: "math-1", label: "수학Ⅰ" },
  { value: "math-2", label: "수학Ⅱ" },
  { value: "calculus", label: "미적분" },
  { value: "probability", label: "확률과 통계" },
  { value: "geometry", label: "기하" },
];

export const naesinExamSets: NaesinExamSet[] = [
  {
    id: "songdo-math1-midterm-01",
    title: "송도고형 수학Ⅰ 1학기 중간 예상기출 1회",
    subject: "math-1",
    subjectLabel: "수학Ⅰ",
    units: ["지수와 로그", "지수함수와 로그함수"],
    examRange: "지수법칙부터 로그함수의 그래프 활용까지",
    problemCount: 22,
    difficulty: "상",
    materialType: "예상기출",
    sourceBasis: ["수특 유형", "학교 프린트", "최근 기출 구조"],
    publishStatus: "공개",
    featured: true,
    estimatedMinutes: 50,
    updatedAt: "2026-04-28",
    description:
      "내신 빈출 계산형과 그래프 해석형을 섞은 송도고형 예상기출입니다. 원문 복제가 아닌 유형 구조 기반 자체 변형 문항으로 구성했습니다.",
    downloads: [
      { label: "문제지", format: "PDF", path: "#", available: true },
      { label: "문제지", format: "DOCX", path: "#", available: true },
      { label: "정답 및 해설", format: "PDF", path: "#", available: true },
      { label: "정답 및 해설", format: "DOCX", path: "#", available: false },
    ],
  },
  {
    id: "common-math-quadratic-print-variant",
    title: "공통수학 이차함수 학교 프린트 변형 세트",
    subject: "common-math",
    subjectLabel: "공통수학",
    units: ["이차함수", "방정식과 부등식"],
    examRange: "이차함수의 그래프, 판별식, 최대최소",
    problemCount: 18,
    difficulty: "중간",
    materialType: "변형 문제 세트",
    sourceBasis: ["학교 프린트", "교과서 핵심 예제"],
    publishStatus: "공개",
    featured: true,
    estimatedMinutes: 40,
    updatedAt: "2026-04-26",
    description:
      "학교 프린트의 출제 포인트를 분석해 조건 배열과 풀이 경로를 새로 설계한 단원 집중 세트입니다.",
    downloads: [
      { label: "문제지", format: "PDF", path: "#", available: true },
      { label: "문제지", format: "DOCX", path: "#", available: false },
      { label: "정답 및 해설", format: "PDF", path: "#", available: true },
      { label: "정답 및 해설", format: "DOCX", path: "#", available: false },
    ],
  },
  {
    id: "math2-limit-sameform-01",
    title: "수학Ⅱ 함수의 극한 동형모의고사",
    subject: "math-2",
    subjectLabel: "수학Ⅱ",
    units: ["함수의 극한", "연속"],
    examRange: "극한값 계산, 좌우극한, 연속 조건",
    problemCount: 20,
    difficulty: "상",
    materialType: "동형모의고사",
    sourceBasis: ["기출 유형", "수완 유형"],
    publishStatus: "검수중",
    featured: false,
    estimatedMinutes: 45,
    updatedAt: "2026-04-21",
    description:
      "조건 해석과 케이스 분류가 필요한 문항을 중심으로 구성한 동형 시험지입니다.",
    downloads: [
      { label: "문제지", format: "PDF", path: "#", available: false },
      { label: "문제지", format: "DOCX", path: "#", available: false },
      { label: "정답 및 해설", format: "PDF", path: "#", available: false },
      { label: "정답 및 해설", format: "DOCX", path: "#", available: false },
    ],
  },
  {
    id: "probability-counting-basic",
    title: "확률과 통계 경우의 수 단원별 문제풀이",
    subject: "probability",
    subjectLabel: "확률과 통계",
    units: ["순열과 조합", "중복조합"],
    examRange: "순열, 조합, 같은 것이 있는 순열",
    problemCount: 16,
    difficulty: "기본",
    materialType: "단원별 문제",
    sourceBasis: ["교과서 개념", "내신 빈출 구조"],
    publishStatus: "공개",
    featured: false,
    estimatedMinutes: 35,
    updatedAt: "2026-04-18",
    description:
      "개념 확인부터 내신형 응용까지 이어지는 짧은 단원별 문제풀이 세트입니다.",
    downloads: [
      { label: "문제지", format: "PDF", path: "#", available: true },
      { label: "문제지", format: "DOCX", path: "#", available: false },
      { label: "정답 및 해설", format: "PDF", path: "#", available: true },
      { label: "정답 및 해설", format: "DOCX", path: "#", available: false },
    ],
  },
];

export const naesinUnitPractices: NaesinUnitPractice[] = [
  {
    id: "common-quadratic",
    subject: "common-math",
    subjectLabel: "공통수학",
    unit: "이차함수",
    title: "그래프와 최대최소 집중 연습",
    problemCount: 24,
    difficulty: "중간",
    progressLabel: "온라인 풀이 준비중",
  },
  {
    id: "math1-log",
    subject: "math-1",
    subjectLabel: "수학Ⅰ",
    unit: "로그함수",
    title: "그래프 해석과 방정식 변형",
    problemCount: 20,
    difficulty: "상",
    progressLabel: "PDF 제공",
  },
  {
    id: "math2-continuity",
    subject: "math-2",
    subjectLabel: "수학Ⅱ",
    unit: "연속",
    title: "연속 조건 문항 3단계",
    problemCount: 18,
    difficulty: "상",
    progressLabel: "온라인 풀이 준비중",
  },
];

export function getNaesinExamSet(id: string) {
  return naesinExamSets.find((set) => set.id === id) ?? null;
}

export function filterNaesinExamSets(subject: NaesinSubject) {
  if (subject === "all") return naesinExamSets;
  return naesinExamSets.filter((set) => set.subject === subject);
}
