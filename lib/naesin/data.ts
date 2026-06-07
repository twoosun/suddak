import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaticNaesinExamSet, staticNaesinExamSets } from "./static-materials";
import type { NaesinDifficulty, NaesinDownloadAsset, NaesinExamSet } from "./types";

export const NAESINDDAK_STORAGE_BUCKET = "naesinddak-materials";

export type NaesinddakFileKey =
  | "problemPdf"
  | "problemDocx"
  | "solutionPdf"
  | "solutionDocx"
  | "combinedPdf";

const FILE_LABELS: Record<NaesinddakFileKey, { label: string; format: "PDF" | "DOCX"; downloadName: string }> = {
  problemPdf: {
    label: "문제지",
    format: "PDF",
    downloadName: "calculus-ch05-problems.pdf",
  },
  problemDocx: {
    label: "문제지",
    format: "DOCX",
    downloadName: "calculus-ch05-problems.docx",
  },
  solutionPdf: {
    label: "정답·해설",
    format: "PDF",
    downloadName: "calculus-ch05-solutions.pdf",
  },
  solutionDocx: {
    label: "정답·해설",
    format: "DOCX",
    downloadName: "calculus-ch05-solutions.docx",
  },
  combinedPdf: {
    label: "문제지·해설 통합",
    format: "PDF",
    downloadName: "calculus-ch05-combined.pdf",
  },
};

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

type NaesinddakMaterialRow = {
  id: string;
  title: string;
  description: string;
  detail_description: string | null;
  subject: string;
  subject_detail: string;
  unit: string;
  category: string;
  problem_count_label: string;
  set_count_label: string;
  estimated_minutes_label: string;
  status: "public" | "private";
  price_ddak: number;
  tags: string[] | null;
  included_topics: string[] | null;
  source_basis: string[] | null;
  file_paths: Partial<Record<NaesinddakFileKey, string>> | null;
  featured: boolean | null;
  updated_at: string;
};

function subjectSlug(subjectDetail: string): NaesinExamSet["subject"] {
  if (subjectDetail === "미적분") return "calculus";
  if (subjectDetail === "수학 I") return "math-1";
  if (subjectDetail === "수학 II") return "math-2";
  if (subjectDetail === "확률과 통계") return "probability";
  if (subjectDetail === "기하") return "geometry";
  return "common-math";
}

function buildDownloadAssets(filePaths: Partial<Record<NaesinddakFileKey, string>> | null) {
  return (Object.entries(filePaths ?? {}) as Array<[NaesinddakFileKey, string]>)
    .filter(([, path]) => Boolean(path))
    .map(
      ([key, path]): NaesinDownloadAsset => ({
        key,
        label: FILE_LABELS[key].label,
        format: FILE_LABELS[key].format,
        path,
        available: true,
        downloadName: path.split("/").pop() ?? FILE_LABELS[key].downloadName,
      })
    );
}

function mapNaesinddakMaterial(row: NaesinddakMaterialRow): NaesinExamSet {
  return {
    id: row.id,
    title: row.title,
    subject: subjectSlug(row.subject_detail),
    subjectLabel: row.subject_detail,
    subjectDetail: row.subject_detail,
    subjectName: row.subject,
    units: [row.unit],
    examRange: row.included_topics?.join(", ") ?? "",
    problemCount: 0,
    problemCountLabel: row.problem_count_label,
    setCountLabel: row.set_count_label,
    difficulty: "상",
    materialType: "변형 문제 세트",
    category: row.category,
    sourceBasis: row.source_basis ?? [],
    includedTopics: row.included_topics ?? [],
    tags: row.tags ?? [],
    publishStatus: row.status === "public" ? "공개" : "비공개",
    featured: Boolean(row.featured),
    priceDdak: Number(row.price_ddak ?? 0),
    estimatedMinutes: Number.parseInt(row.estimated_minutes_label, 10) || 50,
    estimatedMinutesLabel: row.estimated_minutes_label,
    updatedAt: row.updated_at,
    description: row.description,
    detailDescription: row.detail_description ?? undefined,
    downloads: buildDownloadAssets(row.file_paths),
  };
}

async function fetchNaesinddakMaterials() {
  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .select(
      "id,title,description,detail_description,subject,subject_detail,unit,category,problem_count_label,set_count_label,estimated_minutes_label,status,price_ddak,tags,included_topics,source_basis,file_paths,featured,updated_at"
    )
    .eq("status", "public")
    .order("updated_at", { ascending: false });

  if (error || !data) return null;
  return (data as NaesinddakMaterialRow[]).map(mapNaesinddakMaterial);
}

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
    const materialSets = (await fetchNaesinddakMaterials()) ?? staticNaesinExamSets;

    const { data, error } = await supabaseAdmin
      .from("naesin_exam_sets")
      .select(
        "id,title,subject,source_range,reference_summary,total_problems,overall_difficulty,exam_minutes,created_at,blueprint,naesin_exam_files(file_role,format,storage_path)"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error || !data) return materialSets;

    const databaseSets = await Promise.all((data as ExamSetRow[]).map(mapExamSet));
    return [...materialSets, ...databaseSets];
  } catch {
    return staticNaesinExamSets;
  }
}

export async function fetchPublishedNaesinExamSet(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("naesinddak_materials")
      .select(
        "id,title,description,detail_description,subject,subject_detail,unit,category,problem_count_label,set_count_label,estimated_minutes_label,status,price_ddak,tags,included_topics,source_basis,file_paths,featured,updated_at"
      )
      .eq("id", id)
      .eq("status", "public")
      .maybeSingle();

    if (!error && data) return mapNaesinddakMaterial(data as NaesinddakMaterialRow);
  } catch {
    // Fall through to static and legacy exam-builder data.
  }

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

export async function getNaesinddakStoragePath(materialId: string, fileKey: NaesinddakFileKey) {
  const material = await fetchPublishedNaesinExamSet(materialId);
  const asset = material?.downloads.find((download) => download.key === fileKey);
  return asset?.path ?? null;
}

export function isNaesinddakFileKey(value: string | null): value is NaesinddakFileKey {
  return (
    value === "problemPdf" ||
    value === "problemDocx" ||
    value === "solutionPdf" ||
    value === "solutionDocx" ||
    value === "combinedPdf"
  );
}
