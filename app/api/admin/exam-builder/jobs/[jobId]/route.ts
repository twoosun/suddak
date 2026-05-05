import { NextRequest } from "next/server";

import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getAdminUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "동형시험지 제작 기능은 관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const { jobId } = await params;
  const { data, error } = await supabaseAdmin
    .from("exam_builder_jobs")
    .select("id, status, progress, current_step, blueprint, analysis, updated_at")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });

  return Response.json({ job: data });
}
