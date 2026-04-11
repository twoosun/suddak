import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLVE_DAILY_LIMIT } from "@/lib/limits";

const DAILY_LIMIT = SOLVE_DAILY_LIMIT;

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_approved, is_admin")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function checkDailyLimit(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) throw error;
  return count ?? 0;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (profile.is_admin) {
      return NextResponse.json({
        isAdmin: true,
        usedToday: 0,
        dailyLimit: null,
        remaining: null,
      });
    }

    const usedToday = await checkDailyLimit(user.id);
    const remaining = Math.max(0, DAILY_LIMIT - usedToday);

    return NextResponse.json({
      isAdmin: false,
      usedToday,
      dailyLimit: DAILY_LIMIT,
      remaining,
    });
  } catch {
    return NextResponse.json(
      { error: "사용량 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}