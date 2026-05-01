import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
