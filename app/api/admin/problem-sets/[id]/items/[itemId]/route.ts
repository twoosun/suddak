import { NextRequest } from "next/server";

import { removeProblemFromSet, requireAdmin } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ itemId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { itemId } = await params;
    await removeProblemFromSet(itemId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "세트 문항을 삭제하지 못했습니다." }, { status: 400 });
  }
}
