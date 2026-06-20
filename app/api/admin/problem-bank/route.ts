import { NextRequest } from "next/server";

import { createProblem, listProblems, requireAdmin } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const params = req.nextUrl.searchParams;
    const problems = await listProblems({
      problemCode: params.get("problem_code") ?? undefined,
      baseProblemCode: params.get("base_problem_code") ?? undefined,
      sourceType: params.get("source_type") ?? undefined,
      subject: params.get("subject") ?? undefined,
      unit: params.get("unit") ?? undefined,
      difficulty: params.get("difficulty") ?? undefined,
      tags: params.get("tags") ?? undefined,
      limit: Number(params.get("limit") || 100),
    });

    return Response.json({ problems });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const problem = await createProblem(await req.json());
    return Response.json({ problem });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항을 저장하지 못했습니다." }, { status: 400 });
  }
}
