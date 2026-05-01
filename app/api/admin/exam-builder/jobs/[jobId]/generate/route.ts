import { NextRequest } from "next/server";

import {
  buildExamDocxBuffer,
  buildExamPdfBuffer,
  generatedFileDefinitions,
} from "@/lib/exam-builder/export-files";
import { getAdminUserFromRequest, getStorageContentType, sanitizeStorageName } from "@/lib/exam-builder/server";
import { getTotalScore } from "@/lib/exam-builder/utils";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ExamBlueprint, ReferenceAnalysisResult } from "@/lib/exam-builder/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

type GenerateBody = {
  blueprint?: ExamBlueprint;
  analysis?: ReferenceAnalysisResult;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const { jobId } = await params;
  const body = (await req.json()) as GenerateBody;
  const blueprint = body.blueprint;
  const analysis = body.analysis;

  if (!blueprint || !analysis) {
    return Response.json({ error: "설계표와 분석 결과가 필요합니다." }, { status: 400 });
  }

  await supabaseAdmin
    .from("exam_builder_jobs")
    .update({
      status: "generating",
      progress: 55,
      current_step: "export",
      blueprint,
      analysis,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", user.id);

  const { data: examSet, error: examSetError } = await supabaseAdmin
    .from("naesin_exam_sets")
    .insert({
      builder_job_id: jobId,
      created_by: user.id,
      title: blueprint.title,
      subject: blueprint.subject,
      source_range: blueprint.sourceRange,
      reference_summary: blueprint.referenceSummary,
      total_problems: blueprint.totalProblems,
      multiple_choice_count: blueprint.multipleChoiceCount,
      written_count: blueprint.writtenCount,
      total_score: getTotalScore(blueprint.items),
      overall_difficulty: blueprint.overallDifficulty,
      overall_transform_strength: blueprint.overallTransformStrength,
      exam_minutes: blueprint.examMinutes,
      analysis,
      blueprint,
      is_published: false,
    })
    .select("id")
    .single();

  if (examSetError) return Response.json({ error: examSetError.message }, { status: 500 });

  const generatedFiles = [];
  const baseName = sanitizeStorageName(blueprint.title);

  for (const definition of generatedFileDefinitions) {
    const buffer =
      definition.format === "DOCX"
        ? await buildExamDocxBuffer(blueprint, analysis, definition.role)
        : buildExamPdfBuffer(blueprint, analysis, definition.role);
    const extension = definition.format.toLowerCase();
    const path = `generated/${user.id}/${examSet.id}/${baseName}-${definition.role}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("exam-builder")
      .upload(path, buffer, {
        contentType: getStorageContentType(definition.format),
        upsert: true,
      });

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

    const { data: fileRow, error: fileError } = await supabaseAdmin
      .from("naesin_exam_files")
      .upsert(
        {
          exam_set_id: examSet.id,
          file_role: definition.role,
          format: definition.format,
          storage_bucket: "exam-builder",
          storage_path: path,
        },
        { onConflict: "exam_set_id,file_role,format" }
      )
      .select("id, file_role, format, storage_path")
      .single();

    if (fileError) return Response.json({ error: fileError.message }, { status: 500 });

    const { data: signed } = await supabaseAdmin.storage
      .from("exam-builder")
      .createSignedUrl(path, 60 * 60);

    generatedFiles.push({
      id: fileRow.id,
      label: definition.label,
      format: definition.format,
      href: signed?.signedUrl ?? "#",
    });
  }

  await supabaseAdmin
    .from("exam_builder_jobs")
    .update({
      status: "completed",
      progress: 100,
      current_step: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", user.id);

  return Response.json({ examSetId: examSet.id, files: generatedFiles });
}
