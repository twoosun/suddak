import { NextRequest } from "next/server";

import { generateExamFromProblemBank, requireAdmin, saveGeneratedExam } from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = await req.json();
    const mode = String(body.mode || "recommend");
    const problems = await generateExamFromProblemBank(body);

    if (mode === "save") {
      const exam = await saveGeneratedExam({
        title: String(body.title || "문제은행 동형시험지"),
        school_name: body.school_name ? String(body.school_name) : null,
        template_id: body.template_id ? String(body.template_id) : null,
        subject: String(body.subject || "수학"),
        range_text: body.range_text ? String(body.range_text) : null,
        source_filter_json: body.source_filter_json ?? body,
        difficulty_policy_json: body.difficulty_policy_json ?? null,
        problem_ids_json: problems.map((problem) => problem.id),
      });
      return Response.json({ exam, problems });
    }

    return Response.json({ problems });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "시험지 생성에 실패했습니다." }, { status: 400 });
  }
}
