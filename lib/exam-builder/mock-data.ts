import type {
  AnalysisPoint,
  BlueprintItem,
  BuilderResultAsset,
  ExamBlueprint,
  GenerationStage,
  ReferenceFile,
} from "./types";

export const mockReferenceFiles: ReferenceFile[] = [
  {
    id: "ref-1",
    name: "2025_송도고_수학1_중간.pdf",
    kind: "기출",
    pageCount: 6,
    status: "분석 완료",
  },
  {
    id: "ref-2",
    name: "수특_지수로그_발췌.pdf",
    kind: "수특",
    pageCount: 8,
    status: "분석 완료",
  },
];

export const mockAnalysisPoints: AnalysisPoint[] = [
  {
    id: "point-1",
    label: "출제 포인트",
    detail: "로그함수 그래프의 평행이동과 정의역 조건을 함께 묻는 문항 비중이 높습니다.",
    riskLevel: "낮음",
  },
  {
    id: "point-2",
    label: "풀이 구조",
    detail: "조건 해석 후 방정식으로 환원하는 2단계 구조가 반복됩니다.",
    riskLevel: "보통",
  },
  {
    id: "point-3",
    label: "유사도 주의",
    detail: "특정 학교 프린트의 조건 배열과 선지 표현은 그대로 사용하지 않는 편이 안전합니다.",
    riskLevel: "주의",
  },
];

export const mockBlueprintItems: BlueprintItem[] = [
  {
    id: "item-1",
    number: 1,
    unit: "지수와 로그",
    topic: "지수법칙 계산",
    format: "객관식",
    score: 3,
    difficulty: "기본",
    transformStrength: "중간",
  },
  {
    id: "item-2",
    number: 2,
    unit: "로그함수",
    topic: "그래프의 평행이동",
    format: "객관식",
    score: 4,
    difficulty: "중간",
    transformStrength: "높음",
  },
  {
    id: "item-3",
    number: 3,
    unit: "로그함수",
    topic: "정의역과 최댓값",
    format: "서술형",
    score: 7,
    difficulty: "상",
    transformStrength: "높음",
  },
];

export const mockExamBlueprint: ExamBlueprint = {
  title: "송도고형 수학Ⅰ 1학기 중간 예상기출",
  subject: "수학Ⅰ",
  totalProblems: 22,
  multipleChoiceCount: 18,
  writtenCount: 4,
  similarityPolicy: "문장, 수치, 조건 배열, 선지 표현의 직접 복제를 금지하고 유사도 주의 문항은 재생성합니다.",
  items: mockBlueprintItems,
};

export const mockGenerationStages: GenerationStage[] = [
  {
    id: "stage-1",
    label: "출제 설계 검증",
    description: "문항 수, 배점, 난이도 분포를 확인합니다.",
    progress: 18,
  },
  {
    id: "stage-2",
    label: "변형 문항 생성",
    description: "참고 자료의 풀이 구조를 새 조건과 맥락으로 재구성합니다.",
    progress: 46,
  },
  {
    id: "stage-3",
    label: "유사도 위험 검사",
    description: "원문 문장과 조건 배열의 과도한 유사성을 점검합니다.",
    progress: 72,
  },
  {
    id: "stage-4",
    label: "DOCX/PDF 렌더링",
    description: "송도고형 시험지 양식으로 문제지와 해설지를 만듭니다.",
    progress: 100,
  },
];

export const mockResultAssets: BuilderResultAsset[] = [
  { label: "시험지 원문", format: "PDF", status: "생성 완료" },
  { label: "시험지 원문", format: "DOCX", status: "생성 완료" },
  { label: "정답 및 해설지", format: "PDF", status: "생성 완료" },
  { label: "정답 및 해설지", format: "DOCX", status: "생성 완료" },
  { label: "출제 분석표", format: "PDF", status: "생성 완료" },
];
