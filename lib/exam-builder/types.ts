export type ExamBuilderStep =
  | "upload"
  | "analysis"
  | "blueprint"
  | "generation"
  | "result";

export type ReferenceFileKind =
  | "수능특강"
  | "수능완성"
  | "평가원/교육청 기출"
  | "학교 기출"
  | "학교 프린트"
  | "직접 제작 자료";

export type ProblemFormat = "객관식" | "서술형";
export type DifficultyLevel = "기본" | "중간" | "상" | "고난도";
export type TransformStrength = "낮음" | "중간" | "높음";
export type GeneratedFileFormat = "DOCX" | "PDF";

export type ReferenceFile = {
  id: string;
  name: string;
  kind: ReferenceFileKind;
  sizeLabel: string;
  status: "업로드 중" | "업로드됨" | "업로드 실패" | "대기" | "분석 완료";
  file?: File;
};

export type ReferenceAnalysisResult = {
  detectedSubject: string;
  majorUnits: string[];
  detectedProblemCount: number;
  majorTypes: string[];
  examPoints: string[];
  difficultyDistribution: Record<DifficultyLevel, number>;
  transformablePoints: string[];
  sourceRange: string;
};

export type BlueprintItem = {
  id: string;
  number: number;
  format: ProblemFormat;
  referenceLocation: string;
  topic: string;
  problemType: string;
  score: number;
  difficulty: DifficultyLevel;
  transformStrength: TransformStrength;
  intent: string;
};

export type ExamBlueprint = {
  title: string;
  subject: string;
  totalProblems: number;
  multipleChoiceCount: number;
  writtenCount: number;
  overallDifficulty: DifficultyLevel;
  overallTransformStrength: TransformStrength;
  examMinutes: number;
  sourceRange: string;
  referenceSummary: string;
  items: BlueprintItem[];
};

export type BlueprintValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalScore: number;
};

export type GenerationStep = {
  id: string;
  label: string;
};

export type ExamGenerationJob = {
  id: string;
  progress: number;
  currentStepId: string;
  status: "running" | "completed";
};

export type GeneratedExamFile = {
  id: string;
  label: string;
  format: GeneratedFileFormat;
  href: string;
};
