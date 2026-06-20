import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { generateProblemCode } from "@/lib/problem-bank/code";
import { validateProblemImportArray, validateProblemImportItem } from "@/lib/problem-bank/import-schema";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  ExamTemplateInsert,
  GeneratedExamInsert,
  ProblemInsert,
  ProblemRow,
  ProblemSetInsert,
} from "@/lib/problem-bank/types";

export const PROBLEM_SET_FILES_BUCKET = "problem-set-files";
export const GENERATED_EXAMS_BUCKET = "generated-exams";
export const THUMBNAILS_BUCKET = "thumbnails";

export type AdminContext = {
  user: User;
};

export type ProblemListFilters = {
  problemCode?: string;
  baseProblemCode?: string;
  sourceType?: string;
  subject?: string;
  unit?: string;
  difficulty?: string;
  tags?: string;
  limit?: number;
};

export type ImportValidationIssue = {
  index: number;
  field: string;
  message: string;
};

export type ImportValidationResult = {
  valid: ProblemInsert[];
  issues: ImportValidationIssue[];
  duplicateCodes: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const next = asString(value);
  return next || null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function requireNumber(name: string, value: unknown) {
  const next = asNumber(value);
  if (next === null) throw new Error(`${name}가 필요합니다.`);
  return next;
}

export async function requireAdmin(req: NextRequest): Promise<AdminContext | Response> {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  return { user };
}

export function generateProblemCodeFromPayload(payload: unknown) {
  const row = asRecord(payload);
  if (!row) throw new Error("문항 코드 입력은 객체여야 합니다.");

  const codeSystem = asString(row.codeSystem ?? row.code_system);
  const variantCode = asOptionalString(row.variantCode ?? row.variant_code) ?? undefined;

  if (codeSystem === "kice" || codeSystem === "school_exam") {
    return generateProblemCode({
      codeSystem,
      examYear: requireNumber("examYear", row.examYear ?? row.exam_year),
      examMonth: requireNumber("examMonth", row.examMonth ?? row.exam_month),
      problemNumber: requireNumber("problemNumber", row.problemNumber ?? row.problem_number),
      variantCode,
    });
  }

  if (codeSystem === "ebs") {
    return generateProblemCode({
      codeSystem,
      ebsOriginalCode: asString(row.ebsOriginalCode ?? row.ebs_original_code),
      variantCode,
    });
  }

  throw new Error("codeSystem은 kice, school_exam, ebs 중 하나여야 합니다.");
}

export function normalizeProblemPayload(payload: unknown): ProblemInsert {
  const result = validateProblemImportItem(payload, 0);
  if (!result.problem) {
    throw new Error(result.issues.map((issue) => `${issue.field}: ${issue.message}`).join("\n"));
  }
  return result.problem;
}

export async function listProblems(filters: ProblemListFilters) {
  let query = supabaseAdmin
    .from("problems")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 100, 1), 300));

  if (filters.problemCode) query = query.ilike("problem_code", `%${filters.problemCode}%`);
  if (filters.baseProblemCode) query = query.ilike("base_problem_code", `%${filters.baseProblemCode}%`);
  if (filters.sourceType) query = query.eq("source_type", filters.sourceType);
  if (filters.subject) query = query.ilike("subject", `%${filters.subject}%`);
  if (filters.unit) query = query.ilike("unit", `%${filters.unit}%`);
  if (filters.difficulty) query = query.eq("difficulty", Number(filters.difficulty));
  if (filters.tags) {
    const tags = filters.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tags.length) query = query.contains("tags", tags);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProblem(id: string) {
  const { data, error } = await supabaseAdmin.from("problems").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProblemRow | null;
}

export async function createProblem(payload: unknown) {
  const problem = normalizeProblemPayload(payload);
  const { data, error } = await supabaseAdmin.from("problems").insert(problem).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProblem(id: string, payload: unknown) {
  const problem = normalizeProblemPayload(payload);
  const { data, error } = await supabaseAdmin.from("problems").update(problem).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProblem(id: string) {
  const { error } = await supabaseAdmin.from("problems").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function validateProblemsImport(payload: unknown): Promise<ImportValidationResult> {
  const parsed = validateProblemImportArray(payload);
  const valid = parsed.valid;
  const issues: ImportValidationIssue[] = [...parsed.issues];
  const localCodes = new Set<string>();
  const duplicateCodes: string[] = [];

  valid.forEach((problem, index) => {
    if (localCodes.has(problem.problem_code)) {
      issues.push({ index, field: "problem_code", message: "업로드 JSON 안에서 중복된 problem_code입니다." });
      duplicateCodes.push(problem.problem_code);
      return;
    }
    localCodes.add(problem.problem_code);
  });

  if (valid.length) {
    const { data, error } = await supabaseAdmin
      .from("problems")
      .select("problem_code")
      .in(
        "problem_code",
        valid.map((item) => item.problem_code)
      );
    if (error) throw new Error(error.message);

    const existing = new Set((data ?? []).map((item) => item.problem_code as string));
    valid.forEach((item, index) => {
      if (existing.has(item.problem_code)) {
        issues.push({ index, field: "problem_code", message: "이미 저장된 problem_code입니다." });
        duplicateCodes.push(item.problem_code);
      }
    });
  }

  return {
    valid: valid.filter((item) => !duplicateCodes.includes(item.problem_code)),
    issues,
    duplicateCodes: Array.from(new Set(duplicateCodes)),
  };
}

export async function importProblemsFromJson(payload: unknown) {
  const validation = await validateProblemsImport(payload);
  if (validation.issues.length) return { ...validation, inserted: [] };

  const { data, error } = await supabaseAdmin.from("problems").insert(validation.valid).select("id,problem_code");
  if (error) throw new Error(error.message);
  return { ...validation, inserted: data ?? [] };
}

export async function createProblemSet(payload: Partial<ProblemSetInsert>) {
  const { data, error } = await supabaseAdmin.from("problem_sets").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProblemSet(id: string, payload: Partial<ProblemSetInsert>) {
  const { data, error } = await supabaseAdmin.from("problem_sets").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProblemSet(id: string) {
  const { error } = await supabaseAdmin.from("problem_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addProblemToSet(setId: string, problemId: string) {
  if (!problemId) throw new Error("problem_id가 필요합니다.");

  const { count, error: countError } = await supabaseAdmin
    .from("problem_set_items")
    .select("id", { count: "exact", head: true })
    .eq("set_id", setId);
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabaseAdmin
    .from("problem_set_items")
    .insert({ set_id: setId, problem_id: problemId, order_index: count ?? 0 })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeProblemFromSet(itemId: string) {
  const { error } = await supabaseAdmin.from("problem_set_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function reorderProblemSetItems(items: Array<{ id: string; order_index: number }>) {
  for (const item of items) {
      const { error } = await supabaseAdmin
      .from("problem_set_items")
      .update({ order_index: 100000 + item.order_index })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  }

  for (const item of items) {
    const { error } = await supabaseAdmin
      .from("problem_set_items")
      .update({ order_index: item.order_index })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  }
}

function getStorageContentType(file: File) {
  const lower = file.name.toLowerCase();
  if (file.type) return file.type;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function sanitizeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.\-가-힣]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "file"
  );
}

async function ensureBucket(bucket: string) {
  const { data } = await supabaseAdmin.storage.getBucket(bucket);
  if (data) return;
  const { error } = await supabaseAdmin.storage.createBucket(bucket, { public: false });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export async function uploadFileToBucket(bucket: string, folder: string, file: File) {
  await ensureBucket(bucket);
  const path = `${folder}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
    contentType: getStorageContentType(file),
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return `${bucket}/${path}`;
}

export async function uploadProblemSetFile(setId: string, role: string, file: File) {
  const bucket = role === "thumbnail_url" ? THUMBNAILS_BUCKET : PROBLEM_SET_FILES_BUCKET;
  const url = await uploadFileToBucket(bucket, `problem-sets/${setId}`, file);
  const { data, error } = await supabaseAdmin
    .from("problem_sets")
    .update({ [role]: url })
    .eq("id", setId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createExamTemplate(payload: Partial<ExamTemplateInsert>) {
  const { data, error } = await supabaseAdmin.from("exam_templates").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateExamTemplate(id: string, payload: Partial<ExamTemplateInsert>) {
  const { data, error } = await supabaseAdmin.from("exam_templates").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExamTemplate(id: string) {
  const { error } = await supabaseAdmin.from("exam_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function generateExamFromProblemBank(payload: Record<string, unknown>) {
  const count = asNumber(payload.problem_count) ?? 20;
  let query = supabaseAdmin.from("problems").select("*").limit(Math.min(Math.max(count * 2, count), 100));
  const sourceType = asOptionalString(payload.source_type);
  const subject = asOptionalString(payload.subject);
  const unit = asOptionalString(payload.unit);
  if (sourceType) query = query.eq("source_type", sourceType);
  if (subject) query = query.ilike("subject", `%${subject}%`);
  if (unit) query = query.ilike("unit", `%${unit}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).slice(0, count);
}

export async function saveGeneratedExam(payload: Partial<GeneratedExamInsert>) {
  const { data, error } = await supabaseAdmin.from("generated_exams").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadGeneratedExamFile(examId: string, role: "pdf_url" | "docx_url" | "solution_pdf_url", file: File) {
  const url = await uploadFileToBucket(GENERATED_EXAMS_BUCKET, `generated-exams/${examId}`, file);
  const { data, error } = await supabaseAdmin
    .from("generated_exams")
    .update({ [role]: url })
    .eq("id", examId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
