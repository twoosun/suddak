import { NextRequest } from "next/server";

import { getAdminUserFromRequest } from "@/lib/exam-builder/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAdminUserFromRequest(req);
  if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("exam_builder_jobs")
    .insert({
      user_id: user.id,
      status: "draft",
      progress: 0,
      current_step: "upload",
    })
    .select("id, status, progress, current_step")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ job: data });
}
