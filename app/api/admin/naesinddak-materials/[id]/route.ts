import { NextRequest } from "next/server";

import { deleteNaesinddakMaterial, updateNaesinddakMaterial } from "@/lib/naesin/admin";
import { requireAdmin } from "@/lib/problem-bank/server";

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
    const material = await updateNaesinddakMaterial(id, await req.json());
    return Response.json({ material });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "자료를 수정하지 못했습니다." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    await deleteNaesinddakMaterial(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "자료를 삭제하지 못했습니다." },
      { status: 400 }
    );
  }
}
