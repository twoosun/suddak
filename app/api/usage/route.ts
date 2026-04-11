import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { READ_DAILY_LIMIT, SOLVE_DAILY_LIMIT } from "@/lib/limits";

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

async function countTodayUsage(
  userId: string,
  actionType: "read" | "solve"
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", actionType)
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
        readToday: 0,
        solveToday: 0,
        readDailyLimit: null,
        solveDailyLimit: null,
        readRemaining: null,
        solveRemaining: null,
      });
    }

    const readToday = await countTodayUsage(user.id, "read");
    const solveToday = await countTodayUsage(user.id, "solve");

    return NextResponse.json({
      isAdmin: false,
      readToday,
      solveToday,
      readDailyLimit: READ_DAILY_LIMIT,
      solveDailyLimit: SOLVE_DAILY_LIMIT,
      readRemaining: Math.max(0, READ_DAILY_LIMIT - readToday),
      solveRemaining: Math.max(0, SOLVE_DAILY_LIMIT - solveToday),
    });
  } catch {
    return NextResponse.json(
      { error: "사용량 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}