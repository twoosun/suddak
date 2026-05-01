export type ExamBuilderStep =
  | "upload"
  | "analysis"
  | "blueprint"
  | "generation"
  | "result";

export type ReferenceFile = {
  id: string;
  name: string;
  kind: "수특" | "수완" | "기출" | "학교 프린트" | "기존 시험지";
  pageCount: number;
  status: "대기" | "분석 완료";
};

export type AnalysisPoint = {
  id: string;
  label: string;
  detail: string;
  riskLevel: "낮음" | "보통" | "주의";
};

export type BlueprintItem = {
  id: string;
  number: number;
  unit: string;
  topic: string;
  format: "객관식" | "서술형";
  score: number;
  difficulty: "기본" | "중간" | "상" | "고난도";
  transformStrength: "낮음" | "중간" | "높음";
};

export type ExamBlueprint = {
  title: string;
  subject: string;
  totalProblems: number;
  multipleChoiceCount: number;
  writtenCount: number;
  similarityPolicy: string;
  items: BlueprintItem[];
};

export type GenerationStage = {
  id: string;
  label: string;
  description: string;
  progress: number;
};

export type BuilderResultAsset = {
  label: string;
  format: "PDF" | "DOCX";
  status: "생성 완료" | "대기";
};
