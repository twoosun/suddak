export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type ProblemCodeSystem = "kice" | "school_exam" | "ebs" | "internal";

export type ProblemSourceType =
  | "suneung"
  | "mock"
  | "school_exam"
  | "ebs_special"
  | "ebs_complete";

export type ProblemVisibility = "private" | "public";

export type ProblemVariantCode = string | null;

export type ProblemQuestionType =
  | "multiple_choice"
  | "short_answer"
  | "descriptive"
  | "mixed";

export type ProblemChoice = {
  id: string;
  label: string;
  latex: string;
};

export type ProblemAnswer = {
  value: string | number | string[] | number[];
  latex?: string;
  choiceId?: string;
  explanation?: string;
};

export type ProblemGraphSpec = {
  type: "function" | "geometry" | "statistics" | "custom";
  data: JsonValue;
};

export type ProblemLayoutSpec = {
  width?: number;
  height?: number;
  breakBefore?: boolean;
  keepTogether?: boolean;
  renderHints?: Record<string, JsonValue>;
};

export type ProblemRow = {
  id: string;
  problem_code: string;
  base_problem_code: string;
  variant_code: ProblemVariantCode;
  code_system: ProblemCodeSystem;
  source: string;
  source_type: ProblemSourceType;
  exam_year: number | null;
  exam_month: number | null;
  problem_number: number | null;
  subject: string;
  unit: string | null;
  level: string | null;
  original_ref: string | null;
  ebs_original_code: string | null;
  internal_code: string | null;
  question_type: ProblemQuestionType | string;
  question_latex: string;
  choices_json: ProblemChoice[] | JsonValue | null;
  answer_json: ProblemAnswer | JsonValue;
  solution_latex: string | null;
  difficulty: number | null;
  variant_strength: number | null;
  tags: string[] | null;
  has_graph: boolean;
  graph_json: ProblemGraphSpec | JsonValue | null;
  layout_json: ProblemLayoutSpec | JsonValue | null;
  visibility: ProblemVisibility;
  price_dak: number;
  created_at: string;
  updated_at: string;
};

export type ProblemInsert = Omit<ProblemRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProblemUpdate = Partial<ProblemInsert>;

export type ProblemSetRow = {
  id: string;
  title: string;
  description: string | null;
  source: string;
  source_type: ProblemSourceType;
  subject: string;
  year: number | null;
  unit: string | null;
  problem_count_text: string | null;
  price_dak: number;
  problem_pdf_url: string | null;
  solution_pdf_url: string | null;
  docx_url: string | null;
  thumbnail_url: string | null;
  visibility: ProblemVisibility;
  created_at: string;
  updated_at: string;
};

export type ProblemSetInsert = Omit<ProblemSetRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProblemSetUpdate = Partial<ProblemSetInsert>;

export type ProblemSetItemRow = {
  id: string;
  set_id: string;
  problem_id: string;
  order_index: number;
  created_at: string;
};

export type ProblemSetItemInsert = Omit<ProblemSetItemRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ProblemSetItemUpdate = Partial<ProblemSetItemInsert>;

export type ExamTemplateRow = {
  id: string;
  school_name: string;
  template_name: string;
  subject: string | null;
  layout_type: string | null;
  page_size: string;
  column_count: number;
  margin_json: JsonValue | null;
  header_json: JsonValue | null;
  footer_json: JsonValue | null;
  font_json: JsonValue | null;
  divider_json: JsonValue | null;
  problem_box_json: JsonValue | null;
  created_at: string;
  updated_at: string;
};

export type ExamTemplateInsert = Omit<ExamTemplateRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ExamTemplateUpdate = Partial<ExamTemplateInsert>;

export type GeneratedExamRow = {
  id: string;
  title: string;
  school_name: string | null;
  template_id: string | null;
  subject: string;
  range_text: string | null;
  source_filter_json: JsonValue | null;
  difficulty_policy_json: JsonValue | null;
  problem_ids_json: string[] | JsonValue;
  pdf_url: string | null;
  docx_url: string | null;
  solution_pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedExamInsert = Omit<GeneratedExamRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type GeneratedExamUpdate = Partial<GeneratedExamInsert>;

export type KiceProblemCodeInput = {
  examYear: number;
  examMonth: number;
  problemNumber: number;
  variantCode?: string;
};

export type SchoolExamProblemCodeInput = {
  administeredYear: number;
  administeredMonth: number;
  problemNumber: number;
  variantCode?: string;
};

export type EbsProblemCodeInput = {
  ebsOriginalCode: string;
  variantCode?: string;
};

export type ChatGptProblemJson = {
  problem_code: string;
  base_problem_code: string;
  variant_code?: string | null;
  code_system: ProblemCodeSystem;
  source: string;
  source_type: ProblemSourceType;
  exam_year?: number | null;
  exam_month?: number | null;
  problem_number?: number | null;
  subject: string;
  unit?: string | null;
  level?: string | null;
  original_ref?: string | null;
  ebs_original_code?: string | null;
  internal_code?: string | null;
  question_type: ProblemQuestionType | string;
  question_latex: string;
  choices_json?: JsonValue;
  answer_json: JsonValue;
  solution_latex?: string | null;
  difficulty?: number | null;
  variant_strength?: number | null;
  tags?: string[];
  has_graph?: boolean;
  graph_json?: JsonValue;
  layout_json?: JsonValue;
  visibility?: ProblemVisibility;
  price_dak?: number;
};

export type ProblemBankTables = {
  problems: {
    Row: ProblemRow;
    Insert: ProblemInsert;
    Update: ProblemUpdate;
  };
  problem_sets: {
    Row: ProblemSetRow;
    Insert: ProblemSetInsert;
    Update: ProblemSetUpdate;
  };
  problem_set_items: {
    Row: ProblemSetItemRow;
    Insert: ProblemSetItemInsert;
    Update: ProblemSetItemUpdate;
  };
  exam_templates: {
    Row: ExamTemplateRow;
    Insert: ExamTemplateInsert;
    Update: ExamTemplateUpdate;
  };
  generated_exams: {
    Row: GeneratedExamRow;
    Insert: GeneratedExamInsert;
    Update: GeneratedExamUpdate;
  };
};
