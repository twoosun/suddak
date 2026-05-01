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
};

export type NaesinExamSet = {
  id: string;
  title: string;
  subject: Exclude<NaesinSubject, "all">;
  subjectLabel: string;
  units: string[];
  examRange: string;
  problemCount: number;
  difficulty: NaesinDifficulty;
  materialType: NaesinMaterialType;
  sourceBasis: string[];
  publishStatus: "공개" | "비공개" | "검수중";
  featured: boolean;
  estimatedMinutes: number;
  updatedAt: string;
  description: string;
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
