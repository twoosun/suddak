import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";

function buildSeedInsert(item: Record<string, unknown>, set: Record<string, unknown>, userId: string) {
  const approved = item.review_status === "approved";

  return {
    source_item_id: item.id,
    source_set_id: set.id,
    created_by: userId,
    subject: item.subject,
    unit: item.unit,
    difficulty: item.difficulty,
    core_concepts: item.core_concepts,
    key_idea: item.key_idea || item.abstraction_summary || "핵심 발상",
    solution_strategy: item.solution_strategy,
    trap_point: item.trap_point,
    common_mistake: item.common_mistake,
    variation_points: item.variation_points,
    similar_problem_seed: item.similar_problem_seed,
    abstraction_summary: item.abstraction_summary,
    solver_hint: item.solver_hint,
    generation_instruction: item.generation_instruction,
    quality_score: item.confidence ?? 0,
    use_for_generation: approved,
    use_for_solving: approved,
  };
}

export async function POST(req: Request, ctx: RouteContext<"/api/training/items/[id]/create-seed">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await ctx.params;
    const admin = await isAdminUser(user.id);

    const { data: item, error: itemError } = await supabaseAdmin
      .from("training_items")
      .select("*, training_upload_sets(*)")
      .eq("id", id)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item?.training_upload_sets) {
      return NextResponse.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
    }

    const set = item.training_upload_sets as Record<string, unknown>;
    if (!admin && set.user_id !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { data: seed, error: seedError } = await supabaseAdmin
      .from("problem_idea_seeds")
      .upsert(buildSeedInsert(item, set, user.id), { onConflict: "source_item_id" })
      .select("*")
      .single();

    if (seedError) throw seedError;

    return NextResponse.json({ seed });
  } catch (error) {
    console.error("[api/training/items/create-seed] error:", error);
    return NextResponse.json({ error: "문풀 보조 데이터를 저장하지 못했습니다." }, { status: 500 });
  }
}
