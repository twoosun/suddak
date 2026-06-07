import { NextResponse } from "next/server";

import { fetchPublishedNaesinExamSet } from "@/lib/naesin/data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, getUserProfile } from "@/lib/training/auth";

type PurchaseResult = {
  success: boolean;
  already_owned: boolean;
  remaining_ddak: number;
  message: string;
};

export async function POST(req: Request, ctx: RouteContext<"/api/naesinddak/materials/[materialId]/purchase">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { materialId } = await ctx.params;
    const material = await fetchPublishedNaesinExamSet(materialId);

    if (!material) {
      return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    }

    const profile = await getUserProfile(user.id);

    if (profile?.is_admin) {
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        isAdmin: true,
        credits: Number(profile.credits ?? 0),
        message: "관리자는 차감 없이 다운로드할 수 있습니다.",
      });
    }

    const { data, error } = await supabaseAdmin.rpc("purchase_naesinddak_material", {
      p_user_id: user.id,
      p_material_id: materialId,
    });

    if (error) throw error;

    const result = (Array.isArray(data) ? data[0] : data) as PurchaseResult | null;

    if (!result) {
      return NextResponse.json({ error: "구매 처리 결과를 확인할 수 없습니다." }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message || "구매에 실패했습니다.",
          credits: result.remaining_ddak,
          priceDdak: material.priceDdak ?? 0,
        },
        { status: result.message === "딱이 부족합니다." ? 402 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyOwned: result.already_owned,
      isAdmin: false,
      credits: result.remaining_ddak,
      message: result.already_owned ? "이미 구매한 자료입니다." : "자료가 잠금 해제되었습니다.",
    });
  } catch (error) {
    console.error("[api/naesinddak/purchase] error:", error);
    return NextResponse.json({ error: "구매를 처리하지 못했습니다." }, { status: 500 });
  }
}
