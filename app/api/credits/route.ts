import { NextRequest, NextResponse } from "next/server";

import { SIMILAR_PROBLEM_COST } from "@/lib/rewards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromRequest(req: NextRequest) {
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

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const credits = Number(data.credits ?? 0);

    return NextResponse.json({
      credits,
      similarProblemCost: SIMILAR_PROBLEM_COST,
      canGenerateSimilarProblem: credits >= SIMILAR_PROBLEM_COST,
    });
  } catch (error) {
    console.error("[api/credits][GET] error:", error);
    return NextResponse.json({ error: "딱 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
