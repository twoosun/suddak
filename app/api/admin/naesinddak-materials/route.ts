import { NextRequest } from "next/server";

import {
  listNaesinddakMaterialsForAdmin,
  upsertNaesinddakMaterial,
} from "@/lib/naesin/admin";
import { requireAdmin } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const materials = await listNaesinddakMaterialsForAdmin();
    return Response.json({ materials });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "자료 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const material = await upsertNaesinddakMaterial(await req.json());
    return Response.json({ material });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "자료를 저장하지 못했습니다." },
      { status: 400 }
    );
  }
}
