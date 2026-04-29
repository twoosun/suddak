import { NextRequest, NextResponse } from "next/server";

import {
  getDailyRewardByKstDate,
  getKstDateString,
  getRewardLabel,
  type RewardType,
} from "@/lib/rewards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ClaimDailyRewardRow = {
  ok: boolean;
  credits: number;
  amount: number;
  reward_type: RewardType;
};

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

async function getUserCredits(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return Number(data.credits ?? 0);
}

async function hasClaimedToday(userId: string, rewardDate: string) {
  const { count, error } = await supabaseAdmin
    .from("daily_rewards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reward_date", rewardDate);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

function buildRewardStatus(credits: number, claimedToday: boolean) {
  const rewardInfo = getDailyRewardByKstDate();

  return {
    canClaim: !claimedToday,
    claimedToday,
    credits,
    rewardAmount: rewardInfo.amount,
    rewardType: rewardInfo.rewardType,
    label: rewardInfo.label,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rewardDate = getKstDateString();
    const [claimedToday, credits] = await Promise.all([
      hasClaimedToday(user.id, rewardDate),
      getUserCredits(user.id),
    ]);

    if (credits === null) {
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(buildRewardStatus(credits, claimedToday));
  } catch (error) {
    console.error("[api/daily-reward][GET] error:", error);
    return NextResponse.json(
      { error: "리워드 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rewardDate = getKstDateString();
    const rewardInfo = getDailyRewardByKstDate();

    const alreadyClaimed = await hasClaimedToday(user.id, rewardDate);

    if (alreadyClaimed) {
      const credits = await getUserCredits(user.id);

      return NextResponse.json(
        {
          ok: false,
          ...buildRewardStatus(credits ?? 0, true),
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("claim_daily_reward", {
      p_user_id: user.id,
      p_reward_date: rewardDate,
      p_amount: rewardInfo.amount,
      p_reward_type: rewardInfo.rewardType,
    });

    if (error) {
      console.error("[api/daily-reward][POST] rpc error:", error);
      return NextResponse.json({ error: "리워드 지급에 실패했습니다." }, { status: 500 });
    }

    const claim = (Array.isArray(data) ? data[0] : data) as ClaimDailyRewardRow | null;

    if (!claim) {
      return NextResponse.json({ error: "리워드 지급 결과를 확인하지 못했습니다." }, { status: 500 });
    }

    if (!claim.ok) {
      return NextResponse.json(
        {
          ok: false,
          canClaim: false,
          claimedToday: true,
          credits: claim.credits,
          rewardAmount: rewardInfo.amount,
          rewardType: rewardInfo.rewardType,
          label: rewardInfo.label,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      credits: claim.credits,
      amount: claim.amount,
      rewardType: claim.reward_type,
      label: getRewardLabel(claim.reward_type),
    });
  } catch (error) {
    console.error("[api/daily-reward][POST] error:", error);
    return NextResponse.json(
      { error: "리워드 지급 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
