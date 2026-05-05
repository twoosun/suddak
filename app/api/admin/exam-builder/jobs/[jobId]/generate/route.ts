import { NextRequest } from "next/server";

import { buildExamDocxBuffer, generatedFileDefinitions } from "@/lib/exam-builder/export-files";
import {
  type GenerationReferenceFile,
  type GenerationSeed,
  generateProblemsWithAI,
} from "@/lib/exam-builder/problem-generation";
import {
  ensureExamBuilderBucket,
  getAdminUserFromRequest,
  getStorageContentType,
  sanitizeStorageName,
} from "@/lib/exam-builder/server";
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

function normalizeSubject(value: string) {
  const subject = String(value || "")
    .trim()
    .replace(/^수학\s*[([]\s*/u, "")
    .replace(/\s*[\])]\s*$/u, "")
    .replace(/^수학\s*[-:]\s*/u, "")
    .replace(/^수학\s*/u, "");

  if (/미적/u.test(subject)) return "미적분";
  if (/확률|통계/u.test(subject)) return "확률과 통계";
  if (/공통/u.test(subject)) return "공통수학";
  if (/수학\s*I|수학Ⅰ|수학1/u.test(subject)) return "수학Ⅰ";
  if (/수학\s*II|수학Ⅱ|수학2/u.test(subject)) return "수학Ⅱ";
  return subject || "수학";
}

function normalizeSeed(row: Record<string, unknown>): GenerationSeed {
  return {
    id: String(row.id),
    subject: typeof row.subject === "string" ? row.subject : null,
    unit: typeof row.unit === "string" ? row.unit : null,
    difficulty: typeof row.difficulty === "number" ? row.difficulty : null,
    core_concepts: Array.isArray(row.core_concepts) ? row.core_concepts.map(String) : null,
    key_idea: typeof row.key_idea === "string" ? row.key_idea : null,
    solution_strategy: typeof row.solution_strategy === "string" ? row.solution_strategy : null,
    trap_point: typeof row.trap_point === "string" ? row.trap_point : null,
    common_mistake: typeof row.common_mistake === "string" ? row.common_mistake : null,
    variation_points: Array.isArray(row.variation_points) ? row.variation_points.map(String) : null,
    similar_problem_seed: typeof row.similar_problem_seed === "string" ? row.similar_problem_seed : null,
    abstraction_summary: typeof row.abstraction_summary === "string" ? row.abstraction_summary : null,
    solver_hint: typeof row.solver_hint === "string" ? row.solver_hint : null,
    generation_instruction: typeof row.generation_instruction === "string" ? row.generation_instruction : null,
  };
}

async function loadApprovedTrainingSeeds(subject: string) {
  const normalizedSubject = normalizeSubject(subject);
  let query = supabaseAdmin
    .from("problem_idea_seeds")
    .select(
      "id, subject, unit, difficulty, core_concepts, key_idea, solution_strategy, trap_point, common_mistake, variation_points, similar_problem_seed, abstraction_summary, solver_hint, generation_instruction",
    )
    .eq("use_for_generation", true)
    .order("quality_score", { ascending: false })
    .limit(40);

  if (normalizedSubject && normalizedSubject !== "수학") {
    query = query.or(`subject.ilike.%${normalizedSubject}%,subject.ilike.%수학%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeSeed(row as Record<string, unknown>));
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "동형시험지 제작 기능은 관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const { jobId } = await params;
  const body = (await req.json()) as GenerateBody;
  const blueprint = body.blueprint;
  const analysis = body.analysis;

  if (!blueprint || !analysis) {
    return Response.json({ error: "설계표와 분석 결과가 필요합니다." }, { status: 400 });
  }

  const updateProgress = async (progress: number, currentStep: string, status = "generating") => {
    await supabaseAdmin
      .from("exam_builder_jobs")
      .update({
        status,
        progress,
        current_step: currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id);
  };

  try {
    await updateProgress(20, "references:files");

    const { data: referenceRows } = await supabaseAdmin
      .from("exam_builder_reference_files")
      .select("original_name, kind, mime_type, storage_path")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const referenceFiles: GenerationReferenceFile[] = [];

    for (const row of (referenceRows ?? []).slice(0, 8)) {
      const { data: blob } = await supabaseAdmin.storage
        .from("exam-builder")
        .download(row.storage_path);

      if (!blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      referenceFiles.push({
        name: row.original_name,
        kind: row.kind,
        mimeType: row.mime_type || "application/octet-stream",
        base64: Buffer.from(arrayBuffer).toString("base64"),
      });
    }

    await updateProgress(23, "references:seeds");
    const trainingSeeds = await loadApprovedTrainingSeeds(blueprint.subject || analysis.detectedSubject);

    await updateProgress(25, `references:seeds:${trainingSeeds.length}`);
    const generatedBlueprint = await generateProblemsWithAI(
      blueprint,
      analysis,
      referenceFiles,
      trainingSeeds,
      async (event) => {
        await updateProgress(event.progress, event.step);
      },
    );
    generatedBlueprint.subject = normalizeSubject(generatedBlueprint.subject);

    await supabaseAdmin
      .from("exam_builder_jobs")
      .update({
        status: "generating",
        progress: 74,
        current_step: "layout",
        blueprint: generatedBlueprint,
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
        title: generatedBlueprint.title,
        subject: generatedBlueprint.subject,
        source_range: generatedBlueprint.sourceRange,
        reference_summary: generatedBlueprint.referenceSummary,
        total_problems: generatedBlueprint.totalProblems,
        multiple_choice_count: generatedBlueprint.multipleChoiceCount,
        written_count: generatedBlueprint.writtenCount,
        total_score: getTotalScore(generatedBlueprint.items),
        overall_difficulty: generatedBlueprint.overallDifficulty,
        overall_transform_strength: generatedBlueprint.overallTransformStrength,
        exam_minutes: generatedBlueprint.examMinutes,
        analysis,
        blueprint: generatedBlueprint,
        is_published: false,
      })
      .select("id")
      .single();

    if (examSetError) throw new Error(examSetError.message);

    await ensureExamBuilderBucket();
    await updateProgress(80, "export");

    const generatedFiles = [];
    const baseName = sanitizeStorageName(generatedBlueprint.title);

    for (const definition of generatedFileDefinitions) {
      const buffer = await buildExamDocxBuffer(generatedBlueprint, analysis, definition.role);
      const extension = definition.format.toLowerCase();
      const storagePath = `generated/${user.id}/${examSet.id}/${baseName}-${definition.role}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("exam-builder")
        .upload(storagePath, buffer, {
          contentType: getStorageContentType(definition.format),
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: fileRow, error: fileError } = await supabaseAdmin
        .from("naesin_exam_files")
        .upsert(
          {
            exam_set_id: examSet.id,
            file_role: definition.role,
            format: definition.format,
            storage_bucket: "exam-builder",
            storage_path: storagePath,
          },
          { onConflict: "exam_set_id,file_role,format" },
        )
        .select("id, file_role, format, storage_path")
        .single();

      if (fileError) throw new Error(fileError.message);

      const { data: signed } = await supabaseAdmin.storage
        .from("exam-builder")
        .createSignedUrl(storagePath, 60 * 60);

      generatedFiles.push({
        id: fileRow.id,
        label: definition.label,
        format: definition.format,
        href: signed?.signedUrl ?? "#",
      });

      await updateProgress(
        80 + Math.floor((generatedFiles.length / generatedFileDefinitions.length) * 15),
        "export",
      );
    }

    await updateProgress(100, "completed", "completed");

    return Response.json({ examSetId: examSet.id, blueprint: generatedBlueprint, files: generatedFiles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "문항 생성 중 오류가 발생했습니다.";
    await updateProgress(0, "error", "failed");
    return Response.json({ error: message }, { status: 500 });
  }
}
