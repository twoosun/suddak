import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { analyzeTrainingFilesWithAI } from "@/lib/training/analysis";
import { getUserFromAuthHeader } from "@/lib/training/auth";
import {
  TRAINING_ALLOWED_MIME_TYPES,
  TRAINING_BUCKET,
  TRAINING_MAX_FILE_SIZE,
} from "@/lib/training/constants";

export const runtime = "nodejs";

function getExtension(file: File) {
  const nameExt = file.name.split(".").pop()?.toLowerCase();
  if (nameExt && /^[a-z0-9]+$/.test(nameExt)) return nameExt;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function validateFile(file: File, label: string) {
  if (!TRAINING_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`${label} 파일 형식은 PDF, PNG, JPG, WEBP만 가능합니다.`);
  }

  if (file.size <= 0) {
    throw new Error(`${label} 파일이 비어 있습니다.`);
  }

  if (file.size > TRAINING_MAX_FILE_SIZE) {
    throw new Error(`${label} 파일은 20MB 이하만 업로드할 수 있습니다.`);
  }
}

async function uploadFile(params: {
  file: File;
  userId: string;
  setId: string;
  role: "problem" | "solution";
}) {
  const extension = getExtension(params.file);
  const path = `${params.userId}/${params.setId}/${params.role}.${extension}`;
  const bytes = await params.file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error } = await supabaseAdmin.storage.from(TRAINING_BUCKET).upload(path, buffer, {
    contentType: params.file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) throw error;

  return {
    path,
    base64: buffer.toString("base64"),
    mimeType: params.file.type,
    name: params.file.name,
  };
}

export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let setId: string | null = null;

  try {
    const formData = await req.formData();
    const title = String(formData.get("title") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const agreed = String(formData.get("agreed") || "") === "true";
    const problemFile = formData.get("problemFile");
    const solutionFile = formData.get("solutionFile");

    if (!title) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "과목을 선택해 주세요." }, { status: 400 });
    }

    if (!agreed) {
      return NextResponse.json({ error: "업로드 자료 활용 안내에 동의해 주세요." }, { status: 400 });
    }

    if (!(problemFile instanceof File) || !(solutionFile instanceof File)) {
      return NextResponse.json({ error: "문제지와 해설지 파일을 모두 업로드해 주세요." }, { status: 400 });
    }

    validateFile(problemFile, "문제지");
    validateFile(solutionFile, "해설지");

    setId = randomUUID();

    const { error: insertError } = await supabaseAdmin.from("training_upload_sets").insert({
      id: setId,
      user_id: user.id,
      title,
      subject,
      status: "analyzing",
    });

    if (insertError) throw insertError;

    const [problemUpload, solutionUpload] = await Promise.all([
      uploadFile({ file: problemFile, userId: user.id, setId, role: "problem" }),
      uploadFile({ file: solutionFile, userId: user.id, setId, role: "solution" }),
    ]);

    const { error: fileUpdateError } = await supabaseAdmin
      .from("training_upload_sets")
      .update({
        problem_file_url: problemUpload.path,
        solution_file_url: solutionUpload.path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId);

    if (fileUpdateError) throw fileUpdateError;

    const { result, model, promptVersion } = await analyzeTrainingFilesWithAI({
      title,
      subject,
      files: [
        { ...problemUpload, role: "problem" },
        { ...solutionUpload, role: "solution" },
      ],
    });

    if (result.items.length > 0) {
      const { error: itemsError } = await supabaseAdmin.from("training_items").insert(
        result.items.map((item) => ({
          set_id: setId,
          problem_number: item.problem_number,
          problem_text: item.problem_text,
          solution_text: item.solution_text,
          answer: item.answer,
          subject: item.subject || subject,
          unit: item.unit,
          difficulty: item.difficulty,
          core_concepts: item.core_concepts,
          key_idea: item.key_idea,
          solution_strategy: item.solution_strategy,
          trap_point: item.trap_point,
          common_mistake: item.common_mistake,
          variation_points: item.variation_points,
          similar_problem_seed: item.similar_problem_seed,
          abstraction_summary: item.abstraction_summary,
          solver_hint: item.solver_hint,
          generation_instruction: item.generation_instruction,
          quality_grade: item.quality_grade,
          confidence: item.confidence,
          reward_amount: 10,
        })),
      );

      if (itemsError) throw itemsError;
    }

    const estimatedReward = result.items.length * 10 + Math.floor(result.items.length / 10) * 50;
    const nextStatus = result.items.length > 0 ? "review_pending" : "analyzed";

    const { error: doneError } = await supabaseAdmin
      .from("training_upload_sets")
      .update({
        status: nextStatus,
        detected_problem_count: result.detected_problem_count,
        matched_problem_count: result.matched_problem_count,
        analyzed_item_count: result.items.length,
        estimated_reward: estimatedReward,
        ai_model: model,
        prompt_version: promptVersion,
        analysis_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId);

    if (doneError) throw doneError;

    return NextResponse.json({
      setId,
      status: nextStatus,
      detectedProblemCount: result.detected_problem_count,
      matchedProblemCount: result.matched_problem_count,
      analyzedItemCount: result.items.length,
    });
  } catch (error) {
    console.error("[api/training/analyze] error:", error);

    if (setId) {
      await supabaseAdmin
        .from("training_upload_sets")
        .update({
          status: "failed",
          analysis_error: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        })
        .eq("id", setId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
