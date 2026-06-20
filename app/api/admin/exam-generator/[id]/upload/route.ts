import { NextRequest } from "next/server";

import { requireAdmin, uploadGeneratedExamFile } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const allowedRoles = new Set(["pdf_url", "docx_url", "solution_pdf_url"]);

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const formData = await req.formData();
    const role = String(formData.get("role") || "") as "pdf_url" | "docx_url" | "solution_pdf_url";
    const file = formData.get("file");
    if (!allowedRoles.has(role)) return Response.json({ error: "파일 역할이 올바르지 않습니다." }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    const exam = await uploadGeneratedExamFile(id, role, file);
    return Response.json({ exam });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "파일 업로드에 실패했습니다." }, { status: 400 });
  }
}
