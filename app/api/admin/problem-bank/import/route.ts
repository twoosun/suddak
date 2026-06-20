import { NextRequest } from "next/server";

import { importProblemsFromJson, requireAdmin, validateProblemsImport } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = await req.json();
    const mode = req.nextUrl.searchParams.get("mode");
    const result = mode === "validate" ? await validateProblemsImport(body) : await importProblemsFromJson(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "JSON import 처리에 실패했습니다." }, { status: 400 });
  }
}
