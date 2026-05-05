import type {
  DifficultyLevel,
  ExamBlueprint,
  GeneratedExamFile,
  GenerationStep,
  ProblemFormat,
  ReferenceAnalysisResult,
  ReferenceFile,
  ReferenceFileKind,
  TransformStrength,
} from "./types";

const multipleChoice = "객관식" as ProblemFormat;
const written = "서술형" as ProblemFormat;
const basic = "기본" as DifficultyLevel;
const medium = "중간" as DifficultyLevel;
const high = "상" as DifficultyLevel;
const hard = "고난도" as DifficultyLevel;
const lowTransform = "낮음" as TransformStrength;
const midTransform = "중간" as TransformStrength;
const highTransform = "높음" as TransformStrength;

export const referenceFileKinds: ReferenceFileKind[] = [
  "수능특강",
  "수능완성",
  "평가원 교육청 기출",
  "학교 기출",
  "학교 프린트",
  "직접 제작 자료",
] as ReferenceFileKind[];

export const mockReferenceFiles: ReferenceFile[] = [];

export const mockAnalysisResult: ReferenceAnalysisResult = {
  detectedSubject: "미적분",
  majorUnits: ["수열의 극한", "함수의 극한", "미분"],
  detectedProblemCount: 22,
  majorTypes: ["조건 해석", "계산형", "그래프 추론", "서술형 증명"],
  examPoints: [
    "원본 문항의 조건 배열과 풀이 구조를 유지한 동형문항이 필요합니다.",
    "단순 수치 변경보다 문항 구조 보존과 난도 유지가 중요합니다.",
  ],
  difficultyDistribution: {
    [basic]: 5,
    [medium]: 9,
    [high]: 6,
    [hard]: 2,
  } as Record<DifficultyLevel, number>,
  transformablePoints: [
    "원본의 발문 방식과 조건 순서를 유지합니다.",
    "핵심 수치와 문자만 최소한으로 변경합니다.",
    "보기 개수와 정답 도출 구조를 유지합니다.",
  ],
  sourceRange: "업로드 참고 자료 전체",
};

export const mockExamBlueprint: ExamBlueprint = {
  title: "학교 맞춤형 미적분 내신 대비 변형 문제 세트",
  subject: "미적분",
  totalProblems: 6,
  multipleChoiceCount: 4,
  writtenCount: 2,
  overallDifficulty: high,
  overallTransformStrength: highTransform,
  examMinutes: 50,
  sourceRange: mockAnalysisResult.sourceRange,
  referenceSummary: "업로드 참고 자료 기반 분석",
  items: [
    {
      id: "item-1",
      number: 1,
      format: multipleChoice,
      referenceLocation: "업로드 자료 1번",
      topic: "수열의 극한",
      problemType: "조건 해석",
      score: 3,
      difficulty: basic,
      transformStrength: midTransform,
      intent: "원본 문항의 조건 배열을 유지해 극한값 계산 구조를 평가합니다.",
    },
    {
      id: "item-2",
      number: 2,
      format: multipleChoice,
      referenceLocation: "업로드 자료 2번",
      topic: "함수의 극한",
      problemType: "계산형",
      score: 3.5,
      difficulty: medium,
      transformStrength: highTransform,
      intent: "원본과 같은 풀이 단계로 극한 조건을 해석하게 합니다.",
    },
    {
      id: "item-3",
      number: 3,
      format: multipleChoice,
      referenceLocation: "업로드 자료 3번",
      topic: "미분",
      problemType: "그래프 추론",
      score: 4,
      difficulty: high,
      transformStrength: highTransform,
      intent: "그래프와 조건의 결합 구조를 원본과 유사하게 유지합니다.",
    },
    {
      id: "item-4",
      number: 4,
      format: multipleChoice,
      referenceLocation: "업로드 자료 4번",
      topic: "미분",
      problemType: "복합 계산",
      score: 4.5,
      difficulty: high,
      transformStrength: midTransform,
      intent: "계산량과 조건 해석 난도를 유지합니다.",
    },
    {
      id: "item-5",
      number: 5,
      format: written,
      referenceLocation: "업로드 자료 5번",
      topic: "함수의 극한",
      problemType: "서술형",
      score: 6.5,
      difficulty: high,
      transformStrength: highTransform,
      intent: "채점 가능한 풀이 단계를 원본과 비슷하게 구성합니다.",
    },
    {
      id: "item-6",
      number: 6,
      format: written,
      referenceLocation: "업로드 자료 6번",
      topic: "미분",
      problemType: "고난도 추론",
      score: 7,
      difficulty: hard,
      transformStrength: highTransform,
      intent: "원본의 고난도 조건 분류 구조를 유지합니다.",
    },
  ],
};

void lowTransform;

export const generationSteps: GenerationStep[] = [
  { id: "references", label: "원본 자료 정밀 확인" },
  { id: "draft", label: "문항별 동형문항 생성" },
  { id: "check", label: "문항별 구조 검수" },
  { id: "solution", label: "정답 및 해설 정리" },
  { id: "layout", label: "시험지 조판" },
  { id: "export", label: "DOCX 파일 생성" },
];

export const mockGeneratedFiles: GeneratedExamFile[] = [
  { id: "exam-docx", label: "시험지 원문", format: "DOCX", href: "#" },
  { id: "solution-docx", label: "정답 및 해설지", format: "DOCX", href: "#" },
  { id: "analysis-docx", label: "출제 분석표", format: "DOCX", href: "#" },
];
