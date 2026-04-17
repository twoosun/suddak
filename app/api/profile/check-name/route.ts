import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nickname =
      typeof body.nickname === "string" ? body.nickname.trim() : "";
    const excludeUserId =
      typeof body.excludeUserId === "string" ? body.excludeUserId.trim() : "";

    if (!nickname) {
      return NextResponse.json(
        { error: "닉네임이 필요해." },
        { status: 400 }
      );
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return NextResponse.json(
        { error: "닉네임은 2자 이상 20자 이하로 입력해줘." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("user_profiles")
      .select("id, full_name")
      .ilike("full_name", nickname);

    if (error) {
      return NextResponse.json(
        { error: "닉네임 중복 확인에 실패했어." },
        { status: 500 }
      );
    }

    const duplicated = (data || []).some((row) => row.id !== excludeUserId);

    return NextResponse.json({
      ok: true,
      available: !duplicated,
      message: duplicated
        ? "이미 사용 중인 닉네임이야."
        : "사용 가능한 닉네임이야.",
    });
  } catch (error) {
    console.error("check-name route error:", error);
    return NextResponse.json(
      { error: "닉네임 확인 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}