export type TrainingSetStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "review_pending"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "failed";

export type TrainingReviewStatus = "pending" | "approved" | "rejected" | "needs_edit";

export type TrainingUploadSet = {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  problem_file_url: string | null;
  solution_file_url: string | null;
  status: TrainingSetStatus;
  detected_problem_count: number;
  matched_problem_count: number;
  analyzed_item_count: number;
  approved_problem_count: number;
  estimated_reward: number;
  final_reward: number;
  reward_paid: boolean;
  ai_model: string | null;
  prompt_version: string | null;
  analysis_error: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainingItem = {
  id: string;
  set_id: string;
  problem_number: string | null;
  problem_text: string | null;
  solution_text: string | null;
  answer: string | null;
  subject: string | null;
  unit: string | null;
  difficulty: number | null;
  core_concepts: string[] | null;
  key_idea: string | null;
  solution_strategy: string | null;
  trap_point: string | null;
  common_mistake: string | null;
  variation_points: string[] | null;
  similar_problem_seed: string | null;
  abstraction_summary: string | null;
  solver_hint: string | null;
  generation_instruction: string | null;
  quality_grade: string | null;
  confidence: number | null;
  review_status: TrainingReviewStatus;
  reward_amount: number;
  created_at: string;
  updated_at: string;
};

export type TrainingSetWithItems = TrainingUploadSet & {
  training_items: TrainingItem[];
  user_profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

export type TrainingAnalysisItem = {
  problem_number: string;
  problem_text: string;
  solution_text: string;
  answer: string;
  subject: string;
  unit: string;
  difficulty: number;
  core_concepts: string[];
  key_idea: string;
  solution_strategy: string;
  trap_point: string;
  common_mistake: string;
  variation_points: string[];
  similar_problem_seed: string;
  abstraction_summary: string;
  solver_hint: string;
  generation_instruction: string;
  quality_grade: "A" | "B" | "C" | "D";
  confidence: number;
};

export type TrainingAnalysisResult = {
  detected_problem_count: number;
  matched_problem_count: number;
  items: TrainingAnalysisItem[];
};

export type ProblemIdeaSeed = {
  id: string;
  source_item_id: string | null;
  source_set_id: string | null;
  created_by: string | null;
  subject: string | null;
  unit: string | null;
  difficulty: number | null;
  core_concepts: string[] | null;
  key_idea: string;
  solution_strategy: string | null;
  trap_point: string | null;
  common_mistake: string | null;
  variation_points: string[] | null;
  similar_problem_seed: string | null;
  abstraction_summary: string | null;
  solver_hint: string | null;
  generation_instruction: string | null;
  quality_score: number;
  use_for_generation: boolean;
  use_for_solving: boolean;
  created_at: string;
  updated_at: string;
};
