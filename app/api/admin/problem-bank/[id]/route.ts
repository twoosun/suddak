import { NextRequest } from "next/server";

import { deleteProblem, getProblem, requireAdmin, updateProblem } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const problem = await getProblem(id);
    if (!problem) return Response.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ problem });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const problem = await updateProblem(id, await req.json());
    return Response.json({ problem });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항을 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    await deleteProblem(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항을 삭제하지 못했습니다." }, { status: 400 });
  }
}
