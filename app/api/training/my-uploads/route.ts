import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader } from "@/lib/training/auth";

export async function GET(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("training_upload_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error("[api/training/my-uploads] error:", error);
    return NextResponse.json({ error: "분석 기록을 불러오지 못했습니다." }, { status: 500 });
  }
}
