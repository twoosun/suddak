import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";

export async function GET(req: Request, ctx: RouteContext<"/api/training/sets/[id]">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await ctx.params;
    const isAdmin = await isAdminUser(user.id);

    let query = supabaseAdmin
      .from("training_upload_sets")
      .select("*, training_items(*)")
      .eq("id", id);

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: "분석 세트를 찾을 수 없습니다." }, { status: 404 });
    }

    const items = Array.isArray(data.training_items)
      ? [...data.training_items].sort((a, b) =>
          String(a.problem_number ?? "").localeCompare(String(b.problem_number ?? ""), "ko", {
            numeric: true,
          }),
        )
      : [];

    return NextResponse.json({
      set: {
        ...data,
        training_items: items,
      },
      viewerIsAdmin: isAdmin,
    });
  } catch (error) {
    console.error("[api/training/sets/[id]] error:", error);
    return NextResponse.json({ error: "분석 상세를 불러오지 못했습니다." }, { status: 500 });
  }
}
