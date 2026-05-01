import { NextRequest } from "next/server";

import { getAdminUserFromRequest, sanitizeStorageName } from "@/lib/exam-builder/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const { jobId } = await params;
  const formData = await req.formData();
  const kind = String(formData.get("kind") || "직접 제작 자료");
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return Response.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  const { data: job } = await supabaseAdmin
    .from("exam_builder_jobs")
    .select("id, user_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!job) return Response.json({ error: "제작 작업을 찾을 수 없습니다." }, { status: 404 });

  const uploaded = [];

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      return Response.json(
        { error: `${file.name} 파일 형식은 지원하지 않습니다.` },
        { status: 400 }
      );
    }

    const safeName = sanitizeStorageName(file.name);
    const path = `references/${user.id}/${jobId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("exam-builder")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

    const { data: row, error: insertError } = await supabaseAdmin
      .from("exam_builder_reference_files")
      .insert({
        job_id: jobId,
        user_id: user.id,
        kind,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_bucket: "exam-builder",
        storage_path: path,
      })
      .select("id, kind, original_name, mime_type, file_size, storage_path")
      .single();

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
    uploaded.push(row);
  }

  return Response.json({ files: uploaded });
}
