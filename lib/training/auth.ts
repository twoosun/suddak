import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getUserFromAuthHeader(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_admin, credits, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? { is_admin: false, credits: 0, full_name: null, email: null };
}

export async function isAdminUser(userId: string) {
  const profile = await getUserProfile(userId);
  return Boolean(profile?.is_admin);
}
