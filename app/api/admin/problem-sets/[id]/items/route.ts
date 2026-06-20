import { NextRequest } from "next/server";

import { addProblemToSet, reorderProblemSetItems, requireAdmin } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const body = await req.json();
    const item = await addProblemToSet(id, String(body.problem_id || ""));
    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "세트에 문항을 추가하지 못했습니다." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    await reorderProblemSetItems(
      items.map((item: { id: string; order_index: number }) => ({
        id: item.id,
        order_index: Number(item.order_index),
      }))
    );
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "문항 순서를 변경하지 못했습니다." }, { status: 400 });
  }
}
