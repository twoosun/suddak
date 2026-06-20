import { z, ZodError } from "zod";

import { normalizeVariantCode, stripVariantCode } from "@/lib/problem-bank/code";
import type { JsonValue, ProblemCodeSystem, ProblemInsert, ProblemSourceType } from "@/lib/problem-bank/types";

export type ProblemImportIssue = {
  index: number;
  field: string;
  message: string;
};

export type ProblemImportValidation = {
  ok: boolean;
  problem?: ProblemInsert;
  issues: ProblemImportIssue[];
};

const REQUIRED_MESSAGE = "필수값입니다.";

const requiredText = (fieldName: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string({
      error: (issue) => (issue.input === undefined ? `${fieldName}은(는) 필수값입니다.` : `${fieldName}은(는) 문자열이어야 합니다.`),
    }).min(1, `${fieldName}은(는) ${REQUIRED_MESSAGE}`)
  );

const nullableText = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const next = value.trim();
  return next || null;
}, z.string().nullable());

const nullableNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return value;
}, z.number({ error: "숫자여야 합니다." }).finite("유한한 숫자여야 합니다.").nullable());

const booleanWithDefaultFalse = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  return false;
}, z.boolean());

export const problemCodeSystemSchema = z.enum(["kice", "school_exam", "ebs", "internal"], {
  error: "code_system은 kice, school_exam, ebs, internal 중 하나여야 합니다.",
});

export const problemSourceTypeSchema = z.enum(["suneung", "mock", "school_exam", "ebs_special", "ebs_complete"], {
  error: "source_type은 suneung, mock, school_exam, ebs_special, ebs_complete 중 하나여야 합니다.",
});

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const optionalJsonValueSchema = z.preprocess((value) => {
  if (value === undefined || value === "") return null;
  return value;
}, jsonValueSchema.nullable());

const tagsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}, z.array(z.string()));

export const choiceAnswerSchema = z
  .object({
    type: z.literal("choice"),
    answer: z.number({ error: "객관식 정답은 숫자여야 합니다." }).int("객관식 정답은 정수여야 합니다.").min(1, "객관식 정답은 1 이상이어야 합니다.").max(5, "객관식 정답은 5 이하여야 합니다."),
  })
  .passthrough();

export const shortAnswerSchema = z
  .object({
    type: z.literal("short_answer"),
    answer: z.union([z.string(), z.number().finite("단답형 정답 숫자는 유한해야 합니다.")], {
      error: "단답형 정답은 문자열 또는 숫자여야 합니다.",
    }),
  })
  .passthrough();

export const descriptiveAnswerSchema = z
  .object({
    type: z.literal("descriptive"),
    answer: z.string({ error: "서술형 정답은 문자열이어야 합니다." }),
    rubric: z.array(jsonValueSchema, { error: "서술형 채점 기준은 배열이어야 합니다." }).optional(),
  })
  .passthrough();

export const answerJsonSchema = z.discriminatedUnion("type", [choiceAnswerSchema, shortAnswerSchema, descriptiveAnswerSchema], {
  error: "answer_json은 choice, short_answer, descriptive 형식 중 하나여야 합니다.",
});

function addIssue(ctx: z.RefinementCtx, field: string, message: string) {
  ctx.addIssue({ code: "custom", path: [field], message });
}

function hasTextObjectField(value: JsonValue | null, field: string) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value[field] === "string" &&
      value[field].trim()
  );
}

function safeNormalizeVariantCode(value: string | null, ctx: z.RefinementCtx) {
  if (!value) return null;
  try {
    return normalizeVariantCode(value);
  } catch {
    addIssue(ctx, "variant_code", "variant_code는 A, B, AA처럼 영문자만 입력해야 합니다.");
    return null;
  }
}

export const problemImportItemSchema = z
  .object({
    problem_code: requiredText("problem_code"),
    base_problem_code: requiredText("base_problem_code"),
    variant_code: nullableText.optional().default(null),
    code_system: problemCodeSystemSchema,
    source: requiredText("source"),
    source_type: problemSourceTypeSchema,
    exam_year: nullableNumber.optional().default(null),
    exam_month: nullableNumber.optional().default(null),
    problem_number: nullableNumber.optional().default(null),
    subject: requiredText("subject"),
    unit: nullableText.optional().default(null),
    level: nullableText.optional().default(null),
    original_ref: nullableText.optional().default(null),
    ebs_original_code: nullableText.optional().default(null),
    internal_code: nullableText.optional().default(null),
    question_type: requiredText("question_type"),
    question_latex: requiredText("question_latex"),
    choices_json: optionalJsonValueSchema.optional().default(null),
    answer_json: answerJsonSchema,
    solution_latex: nullableText.optional().default(null),
    difficulty: nullableNumber.optional().default(null),
    variant_strength: nullableNumber.optional().default(null),
    tags: tagsSchema.optional().default([]),
    has_graph: booleanWithDefaultFalse.optional().default(false),
    graph_json: optionalJsonValueSchema.optional().default(null),
    layout_json: optionalJsonValueSchema.optional().default(null),
    visibility: z.enum(["private", "public"]).optional().default("private"),
    price_dak: nullableNumber.optional().default(0),
  })
  .superRefine((row, ctx) => {
    if (row.code_system === "ebs" && !row.ebs_original_code) {
      addIssue(ctx, "ebs_original_code", "EBS 문항은 ebs_original_code가 필요합니다.");
    }

    if (row.code_system === "ebs" && row.ebs_original_code && row.base_problem_code && row.ebs_original_code !== row.base_problem_code) {
      addIssue(ctx, "base_problem_code", "EBS 문항은 base_problem_code가 ebs_original_code와 같아야 합니다.");
    }

    if ((row.code_system === "kice" || row.code_system === "school_exam") && row.exam_year === null) {
      addIssue(ctx, "exam_year", "kice/school_exam 문항은 exam_year가 필요합니다.");
    }

    if ((row.code_system === "kice" || row.code_system === "school_exam") && row.exam_month === null) {
      addIssue(ctx, "exam_month", "kice/school_exam 문항은 exam_month가 필요합니다.");
    }

    if ((row.code_system === "kice" || row.code_system === "school_exam") && row.problem_number === null) {
      addIssue(ctx, "problem_number", "kice/school_exam 문항은 problem_number가 필요합니다.");
    }

    if (row.exam_month !== null && (!Number.isInteger(row.exam_month) || row.exam_month < 1 || row.exam_month > 12)) {
      addIssue(ctx, "exam_month", "exam_month는 1 이상 12 이하의 정수여야 합니다.");
    }

    if (row.problem_number !== null && (!Number.isInteger(row.problem_number) || row.problem_number < 1 || row.problem_number > 99)) {
      addIssue(ctx, "problem_number", "problem_number는 1 이상 99 이하의 정수여야 합니다.");
    }

    if (row.difficulty !== null && (!Number.isInteger(row.difficulty) || row.difficulty < 0 || row.difficulty > 10)) {
      addIssue(ctx, "difficulty", "difficulty는 0 이상 10 이하의 정수여야 합니다.");
    }

    if (row.variant_strength !== null && (!Number.isInteger(row.variant_strength) || row.variant_strength < 1 || row.variant_strength > 5)) {
      addIssue(ctx, "variant_strength", "variant_strength는 1 이상 5 이하의 정수여야 합니다.");
    }

    const variantCode = safeNormalizeVariantCode(row.variant_code, ctx);
    if (variantCode && !row.problem_code.endsWith(variantCode)) {
      addIssue(ctx, "problem_code", "problem_code는 variant_code로 끝나야 합니다.");
    }

    if (variantCode && stripVariantCode(row.problem_code) !== row.base_problem_code) {
      addIssue(ctx, "base_problem_code", "problem_code에서 variant_code를 제외한 값이 base_problem_code와 같아야 합니다.");
    }

    if (row.question_type === "multiple_choice" && (!Array.isArray(row.choices_json) || row.choices_json.length !== 5)) {
      addIssue(ctx, "choices_json", "객관식 문항은 choices_json이 길이 5인 배열이어야 합니다.");
    }

    if (row.question_type !== "multiple_choice" && row.choices_json !== null && !Array.isArray(row.choices_json)) {
      addIssue(ctx, "choices_json", "choices_json은 null 또는 배열이어야 합니다.");
    }

    if (row.has_graph && (!hasTextObjectField(row.graph_json, "type") || !hasTextObjectField(row.graph_json, "description"))) {
      addIssue(ctx, "graph_json", "그래프가 있는 문항은 graph_json.type과 graph_json.description이 필요합니다.");
    }

    if (!row.has_graph && row.graph_json !== null) {
      addIssue(ctx, "graph_json", "그래프가 없는 문항은 graph_json을 null로 입력하세요.");
    }
  })
  .transform((row): ProblemInsert => ({
    problem_code: row.problem_code,
    base_problem_code: row.base_problem_code,
    variant_code: row.variant_code ? normalizeVariantCode(row.variant_code) : null,
    code_system: row.code_system as ProblemCodeSystem,
    source: row.source,
    source_type: row.source_type as ProblemSourceType,
    exam_year: row.exam_year,
    exam_month: row.exam_month,
    problem_number: row.problem_number,
    subject: row.subject,
    unit: row.unit,
    level: row.level,
    original_ref: row.original_ref,
    ebs_original_code: row.ebs_original_code,
    internal_code: row.internal_code,
    question_type: row.question_type,
    question_latex: row.question_latex,
    choices_json: row.choices_json,
    answer_json: row.answer_json as JsonValue,
    solution_latex: row.solution_latex,
    difficulty: row.difficulty,
    variant_strength: row.variant_strength,
    tags: row.tags,
    has_graph: row.has_graph,
    graph_json: row.graph_json,
    layout_json: row.layout_json,
    visibility: row.visibility,
    price_dak: row.price_dak ?? 0,
  }));

export const problemImportArraySchema = z.array(problemImportItemSchema, {
  error: "JSON은 반드시 문항 객체 배열이어야 합니다.",
});

function fieldFromPath(path: PropertyKey[]) {
  const withoutIndex = typeof path[0] === "number" ? path.slice(1) : path;
  if (!withoutIndex.length) return "row";
  return withoutIndex.map(String).join(".");
}

function indexFromPath(path: PropertyKey[], fallback: number) {
  return typeof path[0] === "number" ? path[0] : fallback;
}

export function zodErrorToProblemImportIssues(error: ZodError, fallbackIndex = 0): ProblemImportIssue[] {
  return error.issues.map((issue) => ({
    index: indexFromPath(issue.path, fallbackIndex),
    field: fieldFromPath(issue.path),
    message: issue.message,
  }));
}

export function validateProblemImportItem(value: unknown, index = 0): ProblemImportValidation {
  const result = problemImportItemSchema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      issues: zodErrorToProblemImportIssues(result.error, index),
    };
  }

  return { ok: true, issues: [], problem: result.data };
}

export function validateProblemImportArray(value: unknown) {
  if (!Array.isArray(value)) {
    return {
      valid: [] as ProblemInsert[],
      issues: [{ index: -1, field: "root", message: "JSON은 반드시 문항 객체 배열이어야 합니다." }] satisfies ProblemImportIssue[],
    };
  }

  const valid: ProblemInsert[] = [];
  const issues: ProblemImportIssue[] = [];

  value.forEach((item, index) => {
    const result = validateProblemImportItem(item, index);
    if (result.problem) valid.push(result.problem);
    issues.push(...result.issues);
  });

  return { valid, issues };
}
