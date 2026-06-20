import { NextRequest } from "next/server";

import { deleteExamTemplate, requireAdmin, updateExamTemplate } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const template = await updateExamTemplate(id, await req.json());
    return Response.json({ template });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "템플릿을 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    await deleteExamTemplate(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "템플릿을 삭제하지 못했습니다." }, { status: 400 });
  }
}
