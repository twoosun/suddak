import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";

export async function GET(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user || !(await isAdminUser(user.id))) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("training_upload_sets")
      .select("*, training_items(*)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ sets: data ?? [] });
  } catch (error) {
    console.error("[api/admin/training-review] error:", error);
    return NextResponse.json({ error: "검수 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
