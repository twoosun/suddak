import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, email, fullName, grade } = await req.json();

    if (!userId || !email || !fullName || !grade) {
      return NextResponse.json(
        { error: "필수 정보가 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("user_profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      grade,
      is_approved: false,
      is_admin: false,
    });

    if (error) {
      return NextResponse.json(
        { error: "프로필 저장 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}