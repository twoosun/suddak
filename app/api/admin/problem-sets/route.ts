import { NextRequest } from "next/server";

import { createProblemSet, requireAdmin } from "@/lib/problem-bank/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("problem_sets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const set = await createProblemSet(await req.json());
    return Response.json({ set });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "세트를 저장하지 못했습니다." }, { status: 400 });
  }
}
