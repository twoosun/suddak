import { NextRequest } from "next/server";

import { createExamTemplate, requireAdmin } from "@/lib/problem-bank/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("exam_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ templates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const template = await createExamTemplate(await req.json());
    return Response.json({ template });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "템플릿을 저장하지 못했습니다." }, { status: 400 });
  }
}
