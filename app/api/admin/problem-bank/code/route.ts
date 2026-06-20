import { NextRequest } from "next/server";

import { generateProblemCodeFromPayload, requireAdmin } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = await req.json();
    const problemCode = generateProblemCodeFromPayload(body);
    return Response.json({ problem_code: problemCode });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항코드를 생성하지 못했습니다." }, { status: 400 });
  }
}
