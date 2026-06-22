import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NAESINDDAK_STORAGE_BUCKET, type NaesinddakFileKey } from "@/lib/naesin/data";

export type NaesinddakMaterialAdminRow = {
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
  created_at: string;
  updated_at: string;
};

const ALLOWED_FILE_KEYS = new Set<NaesinddakFileKey>([
  "problemPdf",
  "problemDocx",
  "solutionPdf",
  "solutionDocx",
  "combinedPdf",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("자료 정보는 객체 형태여야 합니다.");
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function asBoolean(value: unknown) {
  return value === true || value === "true";
}

function asPriceDdak(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    throw new Error("잠금해제 비용은 0 이상의 정수 딱으로 입력해 주세요.");
  }
  return number;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9가-힣._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `material-${Date.now()}`
  );
}

function sanitizeFileName(value: string) {
  return (
    value
      .trim()
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9가-힣._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "file"
  );
}

function getStorageContentType(file: File) {
  const lower = file.name.toLowerCase();

  if (file.type) return file.type;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

function assertAllowedMaterialFile(fileKey: NaesinddakFileKey, file: File) {
  const lower = file.name.toLowerCase();

  if ((fileKey === "problemPdf" || fileKey === "solutionPdf" || fileKey === "combinedPdf") && !lower.endsWith(".pdf")) {
    throw new Error("PDF 역할에는 PDF 파일만 업로드할 수 있습니다.");
  }

  if ((fileKey === "problemDocx" || fileKey === "solutionDocx") && !lower.endsWith(".docx")) {
    throw new Error("DOCX 역할에는 DOCX 파일만 업로드할 수 있습니다.");
  }
}

export function isNaesinddakAdminFileKey(value: string): value is NaesinddakFileKey {
  return ALLOWED_FILE_KEYS.has(value as NaesinddakFileKey);
}

export async function ensureNaesinddakStorageBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(NAESINDDAK_STORAGE_BUCKET);
  if (data) {
    if (data.public) {
      const { error } = await supabaseAdmin.storage.updateBucket(NAESINDDAK_STORAGE_BUCKET, {
        public: false,
      });
      if (error) throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(NAESINDDAK_STORAGE_BUCKET, {
    public: false,
  });

  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export function normalizeNaesinddakMaterialPayload(payload: unknown) {
  const row = asRecord(payload);
  const title = asString(row.title);
  const id = slugify(asString(row.id) || title);

  if (!id) throw new Error("자료 ID가 필요합니다.");
  if (!title) throw new Error("자료 제목이 필요합니다.");

  return {
    id,
    title,
    description: asString(row.description) || "내신 대비용 수특수완 변형문제 자료입니다.",
    detail_description: asString(row.detail_description) || null,
    subject: asString(row.subject) || "수학",
    subject_detail: asString(row.subject_detail) || "미적분",
    unit: asString(row.unit) || "단원 미지정",
    category: asString(row.category) || "수특수완 변형문제",
    problem_count_label: asString(row.problem_count_label) || "문항 수 미정",
    set_count_label: asString(row.set_count_label) || "1세트",
    estimated_minutes_label: asString(row.estimated_minutes_label) || "50분",
    status: asString(row.status) === "public" ? "public" : "private",
    price_ddak: asPriceDdak(row.price_ddak),
    tags: asStringArray(row.tags),
    included_topics: asStringArray(row.included_topics),
    source_basis: asStringArray(row.source_basis),
    featured: asBoolean(row.featured),
    updated_at: new Date().toISOString(),
  };
}

function hasAnyFilePath(filePaths: unknown) {
  if (!filePaths || typeof filePaths !== "object" || Array.isArray(filePaths)) return false;
  return Object.values(filePaths).some((value) => typeof value === "string" && value.trim());
}

async function assertCanPublish(materialId: string, nextStatus: string) {
  if (nextStatus !== "public") return;

  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .select("file_paths")
    .eq("id", materialId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!hasAnyFilePath(data?.file_paths)) {
    throw new Error("최종 공개하려면 PDF 또는 DOCX 파일을 최소 1개 이상 업로드해 주세요.");
  }
}

export async function listNaesinddakMaterialsForAdmin() {
  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as NaesinddakMaterialAdminRow[];
}

export async function upsertNaesinddakMaterial(payload: unknown) {
  const material = normalizeNaesinddakMaterialPayload(payload);
  await assertCanPublish(material.id, material.status);

  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .upsert(material, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as NaesinddakMaterialAdminRow;
}

export async function updateNaesinddakMaterial(id: string, payload: unknown) {
  const material = normalizeNaesinddakMaterialPayload({ ...asRecord(payload), id });
  await assertCanPublish(id, material.status);

  const { id: _id, ...update } = material;
  void _id;

  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as NaesinddakMaterialAdminRow;
}

export async function deleteNaesinddakMaterial(id: string) {
  const { error } = await supabaseAdmin.from("naesinddak_materials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadNaesinddakMaterialFile(materialId: string, fileKey: NaesinddakFileKey, file: File) {
  await ensureNaesinddakStorageBucket();
  assertAllowedMaterialFile(fileKey, file);

  const safeMaterialId = slugify(materialId);
  const path = `${safeMaterialId}/${fileKey}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage.from(NAESINDDAK_STORAGE_BUCKET).upload(path, buffer, {
    contentType: getStorageContentType(file),
    upsert: false,
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data: current, error: currentError } = await supabaseAdmin
    .from("naesinddak_materials")
    .select("file_paths")
    .eq("id", materialId)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error("자료를 찾을 수 없습니다.");

  const filePaths = {
    ...((current.file_paths ?? {}) as Partial<Record<NaesinddakFileKey, string>>),
    [fileKey]: path,
  };

  const { data, error } = await supabaseAdmin
    .from("naesinddak_materials")
    .update({ file_paths: filePaths, updated_at: new Date().toISOString() })
    .eq("id", materialId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as NaesinddakMaterialAdminRow;
}
