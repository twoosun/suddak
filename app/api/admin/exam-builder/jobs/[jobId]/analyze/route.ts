import { NextRequest } from "next/server";

import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { analyzeReferenceFile, createInitialBlueprint } from "@/lib/exam-builder/utils";
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
    .select("id, kind, original_name, file_size")
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
  const analysis = analyzeReferenceFile(files);
  const blueprint = createInitialBlueprint(analysis);

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
