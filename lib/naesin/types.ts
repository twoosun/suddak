export type NaesinSubject =
  | "all"
  | "common-math"
  | "math-1"
  | "math-2"
  | "calculus"
  | "probability"
  | "geometry";

export type NaesinDifficulty = "기본" | "중간" | "상" | "고난도";

export type NaesinMaterialType =
  | "예상기출"
  | "동형모의고사"
  | "단원별 문제"
  | "변형 문제 세트";

export type NaesinDownloadAsset = {
  label: string;
  format: "PDF" | "DOCX";
  path: string;
  available: boolean;
  downloadName?: string;
};

export type NaesinExamSet = {
  id: string;
  title: string;
  subject: Exclude<NaesinSubject, "all">;
  subjectLabel: string;
  subjectDetail?: string;
  units: string[];
  examRange: string;
  problemCount: number;
  problemCountLabel?: string;
  setCountLabel?: string;
  difficulty: NaesinDifficulty;
  materialType: NaesinMaterialType;
  category?: string;
  sourceBasis: string[];
  includedTopics?: string[];
  publishStatus: "공개" | "비공개" | "검수중";
  featured: boolean;
  estimatedMinutes: number;
  estimatedMinutesLabel?: string;
  updatedAt: string;
  description: string;
  detailDescription?: string;
  downloads: NaesinDownloadAsset[];
};

export type NaesinUnitPractice = {
  id: string;
  subject: Exclude<NaesinSubject, "all">;
  subjectLabel: string;
  unit: string;
  title: string;
  problemCount: number;
  difficulty: NaesinDifficulty;
  progressLabel: string;
};
