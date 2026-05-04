import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function countAiLearningRecords() {
  const { count, error } = await supabaseAdmin
    .from("problem_history")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

async function countCommunityPosts() {
  const { count, error } = await supabaseAdmin
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true);

  if (error) throw error;
  return count ?? 0;
}

async function countSimilarProblemGenerations() {
  const [spentResult, refundedResult] = await Promise.all([
    supabaseAdmin
      .from("credit_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "SIMILAR_PROBLEM"),
    supabaseAdmin
      .from("credit_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "SIMILAR_PROBLEM_REFUND"),
  ]);

  if (spentResult.error) throw spentResult.error;
  if (refundedResult.error) throw refundedResult.error;

  return Math.max(0, (spentResult.count ?? 0) - (refundedResult.count ?? 0));
}

export async function GET() {
  try {
    const [totalAiLearningRecords, totalCommunityPosts, totalSimilarProblemGenerations] =
      await Promise.all([
        countAiLearningRecords(),
        countCommunityPosts(),
        countSimilarProblemGenerations(),
      ]);

    return NextResponse.json({
      totalAiLearningRecords,
      totalCommunityPosts,
      totalSimilarProblemGenerations,
    });
  } catch (error) {
    console.error("GET /api/home-stats error:", error);
    return NextResponse.json(
      { error: "홈 통계를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
