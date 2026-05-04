import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function seedPayload(item: Record<string, unknown>, set: Record<string, unknown>) {
  return {
    source_item_id: item.id,
    source_set_id: set.id,
    created_by: set.user_id,
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
    use_for_generation: true,
    use_for_solving: true,
  };
}

export async function POST(req: Request, ctx: RouteContext<"/api/admin/training-review/items/[id]">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user || !(await isAdminUser(user.id))) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const reviewStatus = String(body.review_status || "");

    if (!["approved", "rejected", "needs_edit", "pending"].includes(reviewStatus)) {
      return NextResponse.json({ error: "검수 상태가 올바르지 않습니다." }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      review_status: reviewStatus,
      updated_at: new Date().toISOString(),
    };

    for (const key of [
      "problem_number",
      "answer",
      "subject",
      "unit",
      "key_idea",
      "solution_strategy",
      "trap_point",
      "common_mistake",
      "similar_problem_seed",
      "abstraction_summary",
      "solver_hint",
      "generation_instruction",
      "quality_grade",
    ]) {
      if (typeof body[key] === "string") update[key] = String(body[key]).trim();
    }

    if (body.difficulty !== undefined) update.difficulty = Number(body.difficulty);
    if (body.confidence !== undefined) update.confidence = Number(body.confidence);
    const coreConcepts = stringArray(body.core_concepts);
    const variationPoints = stringArray(body.variation_points);
    if (coreConcepts) update.core_concepts = coreConcepts;
    if (variationPoints) update.variation_points = variationPoints;

    const { data: item, error } = await supabaseAdmin
      .from("training_items")
      .update(update)
      .eq("id", id)
      .select("*, training_upload_sets(*)")
      .single();

    if (error) throw error;

    const set = item.training_upload_sets as Record<string, unknown>;

    if (reviewStatus === "approved") {
      const { error: seedError } = await supabaseAdmin
        .from("problem_idea_seeds")
        .upsert(seedPayload(item, set), { onConflict: "source_item_id" });
      if (seedError) throw seedError;
    } else {
      await supabaseAdmin
        .from("problem_idea_seeds")
        .update({ use_for_generation: false, use_for_solving: false, updated_at: new Date().toISOString() })
        .eq("source_item_id", id);
    }

    const { count: approvedCount, error: countError } = await supabaseAdmin
      .from("training_items")
      .select("*", { count: "exact", head: true })
      .eq("set_id", item.set_id)
      .eq("review_status", "approved");

    if (countError) throw countError;

    const { error: setError } = await supabaseAdmin
      .from("training_upload_sets")
      .update({
        approved_problem_count: approvedCount ?? 0,
        status:
          (approvedCount ?? 0) > 0
            ? (approvedCount ?? 0) >= Number(set.analyzed_item_count ?? 0)
              ? "approved"
              : "partially_approved"
            : "review_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.set_id);

    if (setError) throw setError;

    return NextResponse.json({ item, approvedCount: approvedCount ?? 0 });
  } catch (error) {
    console.error("[api/admin/training-review/items] error:", error);
    return NextResponse.json({ error: "검수 상태를 저장하지 못했습니다." }, { status: 500 });
  }
}
