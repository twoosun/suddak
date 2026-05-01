import { NextRequest } from "next/server";

import { ensureExamBuilderBucket, getAdminUserFromRequest, sanitizeStorageName } from "@/lib/exam-builder/server";
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

const extensionContentTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function getSupportedContentType(file: File) {
  if (allowedTypes.has(file.type)) return file.type;

  const lowerName = file.name.toLowerCase();
  const extension = Object.keys(extensionContentTypes).find((item) => lowerName.endsWith(item));
  return extension ? extensionContentTypes[extension] : null;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAdminUserFromRequest(req);
    if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

    const { jobId } = await params;
    const formData = await req.formData();
    const kind = String(formData.get("kind") || "직접 제작 자료");
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return Response.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("exam_builder_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (jobError) return Response.json({ error: `제작 작업 확인 실패: ${jobError.message}` }, { status: 500 });
    if (!job) return Response.json({ error: "제작 작업을 찾을 수 없습니다." }, { status: 404 });

    await ensureExamBuilderBucket();

    const uploaded = [];

    for (const file of files) {
      const contentType = getSupportedContentType(file);

      if (!contentType) {
        return Response.json(
          { error: `${file.name} 파일 형식은 지원하지 않습니다. PDF, DOCX, PNG, JPG 파일만 업로드할 수 있습니다.` },
          { status: 400 }
        );
      }

      const safeName = sanitizeStorageName(file.name);
      const path = `references/${user.id}/${jobId}/${crypto.randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from("exam-builder")
        .upload(path, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return Response.json({ error: `Storage 업로드 실패: ${uploadError.message}` }, { status: 500 });
      }

      const { data: row, error: insertError } = await supabaseAdmin
        .from("exam_builder_reference_files")
        .insert({
          job_id: jobId,
          user_id: user.id,
          kind,
          original_name: file.name,
          mime_type: contentType,
          file_size: file.size,
          storage_bucket: "exam-builder",
          storage_path: path,
        })
        .select("id, kind, original_name, mime_type, file_size, storage_path")
        .single();

      if (insertError) {
        await supabaseAdmin.storage.from("exam-builder").remove([path]);
        return Response.json({ error: `참고 파일 DB 저장 실패: ${insertError.message}` }, { status: 500 });
      }
      uploaded.push(row);
    }

    return Response.json({ files: uploaded });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
