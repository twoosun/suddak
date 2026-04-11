import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLVE_DAILY_LIMIT } from "@/lib/limits";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DAILY_LIMIT = SOLVE_DAILY_LIMIT;

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_approved, is_admin")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function checkDailyLimit(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function addUsageLog(userId: string, actionType: "read" | "solve") {
  const { error } = await supabaseAdmin.from("usage_logs").insert({
    user_id: userId,
    action_type: actionType,
  });

  if (error) throw error;
}

async function saveHistory(params: {
  userId: string;
  actionType: "read" | "solve";
  recognizedText?: string;
  solveResult?: string;
}) {
  const { userId, actionType, recognizedText, solveResult } = params;

  const { error } = await supabaseAdmin.from("problem_history").insert({
    user_id: userId,
    action_type: actionType,
    recognized_text: recognizedText ?? null,
    solve_result: solveResult ?? null,
  });

  if (error) throw error;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);

    if (!profile?.is_approved) {
      return NextResponse.json(
        { error: "관리자 승인 후 이용 가능합니다." },
        { status: 403 }
      );
    }

    let usedToday = 0;

    if (!profile.is_admin) {
      usedToday = await checkDailyLimit(user.id);

      if (usedToday >= SOLVE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: `오늘 사용 횟수를 모두 썼습니다. (하루 ${SOLVE_DAILY_LIMIT}회)` },
          { status: 429 }
        );
      }
    }

    const formData = await req.formData();
    const mode = String(formData.get("mode") || "");

    if (mode === "read") {
      const image = formData.get("image");

      if (!image || !(image instanceof File)) {
        return NextResponse.json(
          { error: "이미지 파일이 없습니다." },
          { status: 400 }
        );
      }

      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = image.type || "image/jpeg";

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        max_output_tokens: 500,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
이 이미지는 한국 고등학교 수학 문제다.

할 일:
1. 문제를 최대한 정확히 읽어라.
2. 풀이하지 마라.
3. 정답을 추측하지 마라.
4. 사람이 읽기 좋은 형태로 정리하라.

출력 형식:
## 인식한 문제
(문제 원문)

## 불확실
(헷갈리는 기호나 잘 안 보이는 부분. 없으면 "없음")

규칙:
- 수식은 Markdown LaTeX 형식으로 써라.
- 인라인 수식은 $...$, 블록 수식은 $$...$$ 사용.
- \\( \\), \\[ \\], \\begin, \\end 는 쓰지 마라.
- 보이지 않는 기호는 추정하지 마라.
                `.trim(),
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64}`,
                detail: "auto",
              },
            ],
          },
        ],
      });

      const result = response.output_text || "응답이 비어 있습니다.";

      await addUsageLog(user.id, "read");
      await saveHistory({
        userId: user.id,
        actionType: "read",
        recognizedText: result,
      });

      return NextResponse.json({ result });
    }

    if (mode === "solve") {
      const recognizedProblem = String(formData.get("recognizedProblem") || "");

      if (!recognizedProblem.trim()) {
        return NextResponse.json(
          { error: "인식된 문제 텍스트가 없습니다." },
          { status: 400 }
        );
      }

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        max_output_tokens: 700,
        input: `
다음은 이미 이미지에서 읽어낸 한국 고등학교 수학 문제다.

${recognizedProblem}

할 일:
1. 문제를 풀어라.
2. 최종 답을 분명히 제시하라.
3. 핵심 풀이를 짧지만 실제 계산이 보이게 써라.
4. 마지막에 한 번 더 검산하거나 핵심 확인을 해라.
5. 문제를 다시 재작성하지 말고 풀이와 답에 집중하라.

출력 형식:
## 최종 답
(답만 간단히)

## 풀이
(핵심 계산이 보이도록 4~8줄)

## 검산
(짧게 확인)

규칙:
- 수식은 Markdown LaTeX 형식으로 써라.
- 인라인 수식은 $...$, 블록 수식은 $$...$$ 사용.
- 장황하게 쓰지 마라.
- 확실하지 않으면 그 점을 솔직히 말하라.
        `.trim(),
      });

      const result = response.output_text || "응답이 비어 있습니다.";

      await addUsageLog(user.id, "solve");
      await saveHistory({
        userId: user.id,
        actionType: "solve",
        recognizedText: recognizedProblem,
        solveResult: result,
      });

      return NextResponse.json({ result });
    }

    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버에서 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}