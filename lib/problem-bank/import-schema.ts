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

const CODE_SYSTEMS = new Set<ProblemCodeSystem>(["kice", "school_exam", "ebs", "internal"]);
const SOURCE_TYPES = new Set<ProblemSourceType>([
  "suneung",
  "mock",
  "school_exam",
  "ebs_special",
  "ebs_complete",
]);

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const next = text(value);
  return next || null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  return false;
}

function jsonValue(value: unknown): JsonValue | null {
  if (value === undefined || value === "") return null;
  return value as JsonValue;
}

function tags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function push(issues: ProblemImportIssue[], index: number, field: string, message: string) {
  issues.push({ index, field, message });
}

function hasTextObjectField(value: unknown, field: string) {
  const item = record(value);
  return Boolean(item && text(item[field]));
}

export function validateProblemImportItem(value: unknown, index = 0): ProblemImportValidation {
  const issues: ProblemImportIssue[] = [];
  const row = record(value);

  if (!row) {
    return {
      ok: false,
      issues: [{ index, field: "row", message: "문항은 객체여야 합니다." }],
    };
  }

  const problemCode = text(row.problem_code);
  const baseProblemCode = text(row.base_problem_code);
  const codeSystem = text(row.code_system) as ProblemCodeSystem;
  const sourceType = text(row.source_type) as ProblemSourceType;
  const questionType = text(row.question_type);
  const variantCode = normalizeVariantCode(nullableText(row.variant_code)) || null;
  const ebsOriginalCode = nullableText(row.ebs_original_code);
  const examYear = numberOrNull(row.exam_year);
  const examMonth = numberOrNull(row.exam_month);
  const problemNumber = numberOrNull(row.problem_number);
  const difficulty = numberOrNull(row.difficulty);
  const variantStrength = numberOrNull(row.variant_strength);
  const hasGraph = booleanValue(row.has_graph);
  const graphJson = jsonValue(row.graph_json);
  const choicesJson = jsonValue(row.choices_json);
  const answerJson = jsonValue(row.answer_json);

  if (!problemCode) push(issues, index, "problem_code", "problem_code는 필수입니다.");
  if (!baseProblemCode) push(issues, index, "base_problem_code", "base_problem_code는 필수입니다.");
  if (!CODE_SYSTEMS.has(codeSystem)) push(issues, index, "code_system", "code_system이 올바르지 않습니다.");
  if (!text(row.source)) push(issues, index, "source", "source는 필수입니다.");
  if (!SOURCE_TYPES.has(sourceType)) push(issues, index, "source_type", "source_type이 올바르지 않습니다.");
  if (!text(row.subject)) push(issues, index, "subject", "subject는 필수입니다.");
  if (!questionType) push(issues, index, "question_type", "question_type은 필수입니다.");
  if (!text(row.question_latex)) push(issues, index, "question_latex", "question_latex는 필수입니다.");
  if (answerJson === null) push(issues, index, "answer_json", "answer_json은 필수입니다.");

  if (codeSystem === "ebs" && !ebsOriginalCode) {
    push(issues, index, "ebs_original_code", "EBS 문항은 ebs_original_code가 필수입니다.");
  }

  if (codeSystem === "ebs" && ebsOriginalCode && baseProblemCode && ebsOriginalCode !== baseProblemCode) {
    push(issues, index, "base_problem_code", "EBS 문항은 base_problem_code와 ebs_original_code가 같아야 합니다.");
  }

  if ((codeSystem === "kice" || codeSystem === "school_exam") && examYear === null) {
    push(issues, index, "exam_year", "kice/school_exam 문항은 exam_year가 필수입니다.");
  }

  if ((codeSystem === "kice" || codeSystem === "school_exam") && examMonth === null) {
    push(issues, index, "exam_month", "kice/school_exam 문항은 exam_month가 필수입니다.");
  }

  if ((codeSystem === "kice" || codeSystem === "school_exam") && problemNumber === null) {
    push(issues, index, "problem_number", "kice/school_exam 문항은 problem_number가 필수입니다.");
  }

  if (examMonth !== null && (!Number.isInteger(examMonth) || examMonth < 1 || examMonth > 12)) {
    push(issues, index, "exam_month", "exam_month는 1~12 정수여야 합니다.");
  }

  if (problemNumber !== null && (!Number.isInteger(problemNumber) || problemNumber < 1 || problemNumber > 99)) {
    push(issues, index, "problem_number", "problem_number는 1~99 정수여야 합니다.");
  }

  if (variantCode && !problemCode.endsWith(variantCode)) {
    push(issues, index, "problem_code", "problem_code는 variant_code로 끝나야 합니다.");
  }

  if (variantCode && stripVariantCode(problemCode) !== baseProblemCode) {
    push(issues, index, "base_problem_code", "problem_code에서 variant_code를 제외한 값은 base_problem_code와 같아야 합니다.");
  }

  if (questionType === "multiple_choice" && (!Array.isArray(choicesJson) || choicesJson.length !== 5)) {
    push(issues, index, "choices_json", "multiple_choice 문항의 choices_json은 길이 5 배열이어야 합니다.");
  }

  if (questionType !== "multiple_choice" && choicesJson !== null && !Array.isArray(choicesJson)) {
    push(issues, index, "choices_json", "choices_json은 null 또는 배열이어야 합니다.");
  }

  if (difficulty !== null && (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 10)) {
    push(issues, index, "difficulty", "difficulty는 0~10 정수여야 합니다.");
  }

  if (variantStrength !== null && (!Number.isInteger(variantStrength) || variantStrength < 1 || variantStrength > 5)) {
    push(issues, index, "variant_strength", "variant_strength는 1~5 정수여야 합니다.");
  }

  if (hasGraph && (!hasTextObjectField(graphJson, "type") || !hasTextObjectField(graphJson, "description"))) {
    push(issues, index, "graph_json", "has_graph가 true이면 graph_json.type과 graph_json.description이 필요합니다.");
  }

  if (!hasGraph && graphJson !== null) {
    push(issues, index, "graph_json", "has_graph가 false이면 graph_json은 null을 권장합니다.");
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    issues: [],
    problem: {
      problem_code: problemCode,
      base_problem_code: baseProblemCode,
      variant_code: variantCode,
      code_system: codeSystem,
      source: text(row.source),
      source_type: sourceType,
      exam_year: examYear,
      exam_month: examMonth,
      problem_number: problemNumber,
      subject: text(row.subject),
      unit: nullableText(row.unit),
      level: nullableText(row.level),
      original_ref: nullableText(row.original_ref),
      ebs_original_code: ebsOriginalCode,
      internal_code: nullableText(row.internal_code),
      question_type: questionType,
      question_latex: text(row.question_latex),
      choices_json: choicesJson,
      answer_json: answerJson ?? {},
      solution_latex: nullableText(row.solution_latex),
      difficulty,
      variant_strength: variantStrength,
      tags: tags(row.tags),
      has_graph: hasGraph,
      graph_json: graphJson,
      layout_json: jsonValue(row.layout_json),
      visibility: text(row.visibility) === "public" ? "public" : "private",
      price_dak: numberOrNull(row.price_dak) ?? 0,
    },
  };
}

export function validateProblemImportArray(value: unknown) {
  if (!Array.isArray(value)) {
    return {
      valid: [] as ProblemInsert[],
      issues: [{ index: -1, field: "root", message: "JSON은 반드시 배열이어야 합니다." }] satisfies ProblemImportIssue[],
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
