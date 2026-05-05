import { NextResponse } from "next/server";

import { createNotification } from "@/lib/server/notifications";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";
import { calculateUploadReward } from "@/lib/training/constants";

type CreditActionRow = {
  ok: boolean;
  credits: number;
  amount: number;
};

export async function POST(req: Request, ctx: RouteContext<"/api/admin/training-review/sets/[id]/pay-reward">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user || !(await isAdminUser(user.id))) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const { data: set, error: setError } = await supabaseAdmin
      .from("training_upload_sets")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (setError) throw setError;
    if (!set) {
      return NextResponse.json({ error: "분석 세트를 찾을 수 없습니다." }, { status: 404 });
    }

    if (set.reward_paid) {
      return NextResponse.json({ error: "이미 리워드가 지급된 세트입니다." }, { status: 409 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("training_items")
      .select("*", { count: "exact", head: true })
      .eq("set_id", id)
      .eq("review_status", "approved");

    if (countError) throw countError;

    const approvedCount = count ?? 0;
    const reward = calculateUploadReward(approvedCount);

    if (reward <= 0) {
      return NextResponse.json({ error: "승인된 문항이 없어 지급할 리워드가 없습니다." }, { status: 400 });
    }

    const { data: lockedSet, error: lockError } = await supabaseAdmin
      .from("training_upload_sets")
      .update({
        approved_problem_count: approvedCount,
        final_reward: reward,
        reward_paid: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("reward_paid", false)
      .select("id")
      .maybeSingle();

    if (lockError) throw lockError;
    if (!lockedSet) {
      return NextResponse.json({ error: "이미 리워드가 지급된 세트입니다." }, { status: 409 });
    }

    const { data: creditData, error: creditError } = await supabaseAdmin.rpc("grant_user_credits", {
      p_user_id: set.user_id,
      p_amount: reward,
      p_type: "UPLOAD_REWARD",
      p_reason: `training_upload:${id}`,
    });

    if (creditError) {
      await supabaseAdmin
        .from("training_upload_sets")
        .update({
          reward_paid: false,
          final_reward: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      throw creditError;
    }

    const credit = (Array.isArray(creditData) ? creditData[0] : creditData) as CreditActionRow | null;
    const title = "딱씨앗 자료가 승인되었습니다";
    const body = `${set.title || "제출 자료"} 승인으로 ${reward.toLocaleString("ko-KR")}딱이 지급되었습니다.`;

    await createNotification({
      userId: set.user_id,
      actorUserId: null,
      type: "training_reward",
      title,
      body,
      targetUrl: `/training/${id}`,
      dedupeByTargetUrl: true,
    });

    return NextResponse.json({ approvedCount, reward, credits: credit?.credits ?? null });
  } catch (error) {
    console.error("[api/admin/training-review/pay-reward] error:", error);
    return NextResponse.json({ error: "리워드를 지급하지 못했습니다." }, { status: 500 });
  }
}
