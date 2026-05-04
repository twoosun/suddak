import { NextRequest } from "next/server";

import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

type PublishBody = {
  examSetId?: string;
  publish?: boolean;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "동형시험지 제작 기능은 관리자만 사용할 수 있습니다." }, { status: 403 });

  const { jobId } = await params;
  const body = (await req.json()) as PublishBody;

  if (!body.examSetId) {
    return Response.json({ error: "게시할 시험지 ID가 필요합니다." }, { status: 400 });
  }

  const publish = body.publish !== false;
  const { error } = await supabaseAdmin
    .from("naesin_exam_sets")
    .update({
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.examSetId)
    .eq("created_by", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("exam_builder_jobs")
    .update({
      status: publish ? "published" : "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", user.id);

  return Response.json({
    ok: true,
    message: publish ? "내신딱딱에 게시했습니다." : "비공개로 저장했습니다.",
  });
}
