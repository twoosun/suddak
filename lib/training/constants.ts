export const TRAINING_BUCKET = "training-uploads";
export const TRAINING_PROMPT_VERSION = "training-analysis-v1";
export const TRAINING_MODEL = process.env.TRAINING_ANALYSIS_MODEL || "gpt-4.1-mini";
export const TRAINING_MAX_ITEMS = 15;
export const TRAINING_MAX_FILE_SIZE = 20 * 1024 * 1024;

export const TRAINING_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const TRAINING_SUBJECTS = [
  "고1 수학",
  "수학Ⅰ",
  "수학Ⅱ",
  "미적분",
  "확률과 통계",
  "기하",
  "기타",
] as const;

export function calculateUploadReward(approvedCount: number) {
  return approvedCount * 10 + Math.floor(approvedCount / 10) * 50;
}
