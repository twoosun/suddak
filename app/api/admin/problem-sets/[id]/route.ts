import { NextRequest } from "next/server";

import { deleteProblemSet, requireAdmin, updateProblemSet } from "@/lib/problem-bank/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("problem_sets")
    .select("*, problem_set_items(id,order_index,problem_id, problems(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "세트를 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ set: data });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const set = await updateProblemSet(id, await req.json());
    return Response.json({ set });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "세트를 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    await deleteProblemSet(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "세트를 삭제하지 못했습니다." }, { status: 400 });
  }
}
