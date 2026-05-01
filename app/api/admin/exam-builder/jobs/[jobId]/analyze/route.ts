import { NextRequest } from "next/server";

import { analyzeReferenceFilesWithAI } from "@/lib/exam-builder/ai-analysis";
import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ReferenceFile } from "@/lib/exam-builder/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const { jobId } = await params;
  const { data: rows, error: fileError } = await supabaseAdmin
    .from("exam_builder_reference_files")
    .select("id, kind, original_name, mime_type, file_size, storage_path")
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (fileError) return Response.json({ error: fileError.message }, { status: 500 });
  if (!rows?.length) return Response.json({ error: "분석할 참고 파일이 없습니다." }, { status: 400 });

  const files: ReferenceFile[] = rows.map((row) => ({
    id: row.id,
    name: row.original_name,
    kind: row.kind,
    sizeLabel: formatFileSize(Number(row.file_size) || 0),
    status: "분석 완료",
  }));

  const aiFiles = [];

  for (const row of rows.slice(0, 8)) {
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("exam-builder")
      .download(row.storage_path);

    if (downloadError || !blob) {
      return Response.json(
        { error: `${row.original_name} 파일을 읽지 못했습니다.` },
        { status: 500 }
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    aiFiles.push({
      id: row.id,
      name: row.original_name,
      kind: row.kind,
      mimeType: row.mime_type || "application/octet-stream",
      size: Number(row.file_size) || arrayBuffer.byteLength,
      base64: Buffer.from(arrayBuffer).toString("base64"),
    });
  }

  const { analysis, blueprint } = await analyzeReferenceFilesWithAI(aiFiles);

  const { error: updateError } = await supabaseAdmin
    .from("exam_builder_jobs")
    .update({
      status: "analyzed",
      progress: 20,
      current_step: "blueprint",
      analysis,
      blueprint,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ analysis, blueprint, files });
}
