import { NextResponse } from "next/server";

import { fetchPublishedNaesinExamSet } from "@/lib/naesin/data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, getUserProfile } from "@/lib/training/auth";

export async function GET(req: Request, ctx: RouteContext<"/api/naesinddak/materials/[materialId]/access">) {
  try {
    const { materialId } = await ctx.params;
    const material = await fetchPublishedNaesinExamSet(materialId);

    if (!material) {
      return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    }

    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        isOwned: false,
        canDownload: false,
        isAdmin: false,
        credits: null,
        priceDdak: material.priceDdak ?? 0,
      });
    }

    const profile = await getUserProfile(user.id);
    const isAdmin = Boolean(profile?.is_admin);

    const { data: purchase } = await supabaseAdmin
      .from("naesinddak_material_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .maybeSingle();

    const isOwned = Boolean(purchase);

    return NextResponse.json({
      authenticated: true,
      isOwned,
      canDownload: isAdmin || isOwned,
      isAdmin,
      credits: Number(profile?.credits ?? 0),
      priceDdak: material.priceDdak ?? 0,
    });
  } catch (error) {
    console.error("[api/naesinddak/access] error:", error);
    return NextResponse.json({ error: "자료 상태를 불러오지 못했습니다." }, { status: 500 });
  }
}
