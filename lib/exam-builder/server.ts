import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXAM_BUILDER_BUCKET = "exam-builder";

export async function getAdminUserFromRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) return null;
  return user;
}

export async function ensureExamBuilderBucket() {
  const { data: bucket, error: getError } = await supabaseAdmin.storage.getBucket(EXAM_BUILDER_BUCKET);

  if (bucket) return;

  if (getError && !/not found/i.test(getError.message)) {
    throw new Error(`Storage 버킷 확인 실패: ${getError.message}`);
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(EXAM_BUILDER_BUCKET, {
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Storage 버킷 생성 실패: ${createError.message}`);
  }
}

export function sanitizeStorageName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.\-가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";
}

export function getStorageContentType(format: "DOCX" | "PDF") {
  return format === "PDF"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
