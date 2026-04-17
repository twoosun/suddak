import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_FEEDBACK_TYPES = [
  "helpful",
  "needs_work",
  "answer_missing",
  "too_long",
  "parsing_error",
  "subtopic_wrong",
] as const;

type FeedbackType = (typeof ALLOWED_FEEDBACK_TYPES)[number];

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && ALLOWED_FEEDBACK_TYPES.includes(value as FeedbackType);
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const historyId = Number(body?.historyId);
    const feedbackType = body?.feedbackType;

    if (!Number.isInteger(historyId) || historyId <= 0) {
      return NextResponse.json({ error: "유효한 historyId가 필요합니다." }, { status: 400 });
    }

    if (!isFeedbackType(feedbackType)) {
      return NextResponse.json({ error: "유효한 feedbackType이 필요합니다." }, { status: 400 });
    }

    const { data: historyRow, error: historyError } = await supabaseAdmin
      .from("problem_history")
      .select("id, user_id")
      .eq("id", historyId)
      .maybeSingle();

    if (historyError) {
      throw historyError;
    }

    if (!historyRow || historyRow.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인 풀이 기록에만 피드백을 남길 수 있습니다." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin.from("solve_feedback").insert({
      user_id: user.id,
      history_id: historyId,
      feedback_type: feedbackType,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/solve-feedback] error:", error);

    return NextResponse.json(
      {
        error: "피드백 저장 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
