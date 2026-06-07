import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaticNaesinExamSet, staticNaesinExamSets } from "./static-materials";
import type { NaesinDifficulty, NaesinExamSet } from "./types";

type ExamFileRow = {
  file_role: "exam" | "solution" | "analysis";
  format: "DOCX" | "PDF";
  storage_path: string;
};

type ExamSetRow = {
  id: string;
  title: string;
  subject: string;
  source_range: string | null;
  reference_summary: string | null;
  total_problems: number;
  overall_difficulty: string | null;
  exam_minutes: number;
  created_at: string;
  blueprint: {
    items?: Array<{ topic?: string; referenceLocation?: string }>;
  } | null;
  naesin_exam_files?: ExamFileRow[];
};

function getRoleLabel(role: ExamFileRow["file_role"]) {
  if (role === "exam") return "문제지";
  if (role === "solution") return "정답·해설";
  return "출제 분석";
}

function normalizeDifficulty(value: string | null): NaesinDifficulty {
  if (value === "고난도" || value === "상" || value === "기본") return value;
  return "중간";
}

async function getSignedUrl(path: string) {
  const { data } = await supabaseAdmin.storage
    .from("exam-builder")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "#";
}

async function mapExamSet(row: ExamSetRow): Promise<NaesinExamSet> {
  const downloads = await Promise.all(
    (row.naesin_exam_files ?? []).map(async (file) => ({
      label: getRoleLabel(file.file_role),
      format: file.format,
      path: await getSignedUrl(file.storage_path),
      available: true,
    }))
  );

  const topics =
    row.blueprint?.items
      ?.map((item) => item.topic)
      .filter((value): value is string => Boolean(value)) ?? [];
  const references =
    row.blueprint?.items
      ?.map((item) => item.referenceLocation)
      .filter((value): value is string => Boolean(value)) ?? [];

  return {
    id: row.id,
    title: row.title,
    subject: "math-1",
    subjectLabel: row.subject,
    units: topics.length ? Array.from(new Set(topics)).slice(0, 4) : ["내신 대비"],
    examRange: row.source_range ?? "",
    problemCount: row.total_problems,
    problemCountLabel: `${row.total_problems}문항`,
    setCountLabel: "1세트",
    difficulty: normalizeDifficulty(row.overall_difficulty),
    materialType: "예상기출",
    sourceBasis: references.length ? Array.from(new Set(references)).slice(0, 6) : ["업로드 참고 자료"],
    publishStatus: "공개",
    featured: false,
    estimatedMinutes: row.exam_minutes,
    estimatedMinutesLabel: `${row.exam_minutes}분`,
    updatedAt: row.created_at,
    description: row.reference_summary || "관리자가 제작한 내신 대비 자체 변형 문제 세트입니다.",
    downloads,
  };
}

export async function fetchPublishedNaesinExamSets() {
  try {
    const { data, error } = await supabaseAdmin
      .from("naesin_exam_sets")
      .select(
        "id,title,subject,source_range,reference_summary,total_problems,overall_difficulty,exam_minutes,created_at,blueprint,naesin_exam_files(file_role,format,storage_path)"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error || !data) return staticNaesinExamSets;

    const databaseSets = await Promise.all((data as ExamSetRow[]).map(mapExamSet));
    return [...staticNaesinExamSets, ...databaseSets];
  } catch {
    return staticNaesinExamSets;
  }
}

export async function fetchPublishedNaesinExamSet(id: string) {
  const staticSet = getStaticNaesinExamSet(id);
  if (staticSet) return staticSet;

  try {
    const { data, error } = await supabaseAdmin
      .from("naesin_exam_sets")
      .select(
        "id,title,subject,source_range,reference_summary,total_problems,overall_difficulty,exam_minutes,created_at,blueprint,naesin_exam_files(file_role,format,storage_path)"
      )
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !data) return null;
    return mapExamSet(data as ExamSetRow);
  } catch {
    return null;
  }
}
