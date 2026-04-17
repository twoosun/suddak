import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getUserFromRequest(req: NextRequest) {
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

async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? { is_admin: false };
}

async function getHistoryItem(historyId: number, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("problem_history")
    .select("id, user_id, action_type, recognized_text, solve_result, created_at")
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const historyId = Number(new URL(req.url).searchParams.get("historyId") || "");

    if (!historyId || Number.isNaN(historyId)) {
      return NextResponse.json({ error: "historyId가 올바르지 않습니다." }, { status: 400 });
    }

    const historyItem = await getHistoryItem(historyId, user.id);

    if (!historyItem) {
      return NextResponse.json(
        { error: "연결된 풀이 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      item: {
        id: historyItem.id,
        actionType: historyItem.action_type,
        recognizedText: historyItem.recognized_text ?? "",
        solveResult: historyItem.solve_result ?? "",
        createdAt: historyItem.created_at,
      },
    });
  } catch (error) {
    console.error("[api/similar][GET] error:", error);
    return NextResponse.json(
      { error: "유사문제 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);

    if (!profile.is_admin) {
      return NextResponse.json(
        { error: "유사문제 생성기는 현재 관리자 테스트 중인 기능입니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const historyId = Number(body.historyId || "");

    if (!historyId || Number.isNaN(historyId)) {
      return NextResponse.json({ error: "historyId가 올바르지 않습니다." }, { status: 400 });
    }

    const historyItem = await getHistoryItem(historyId, user.id);

    if (!historyItem) {
      return NextResponse.json(
        { error: "연결된 풀이 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const recognizedText = String(historyItem.recognized_text || "").trim();
    const solveResult = String(historyItem.solve_result || "").trim();

    if (!recognizedText) {
      return NextResponse.json(
        { error: "원본 문제 텍스트가 없어 유사문제를 만들 수 없습니다." },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      max_output_tokens: 1400,
      store: false,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 고등학교 수학 문제를 바탕으로 베타용 유사문제를 만드는 도우미다.",
                "출력은 반드시 JSON 객체만 반환하라.",
                "문항 품질은 완벽하지 않아도 되지만, 원문과 주제는 비슷하고 수치나 조건은 일부 변형하라.",
                "과도하게 어려운 변형이나 교육과정 밖 개념은 피하라.",
                "정답과 짧은 해설, 변형 포인트를 함께 작성하라.",
                "",
                "반환 형식:",
                "{",
                '  "title": "유사문제 제목",',
                '  "problem": "문제 본문",',
                '  "answer": "정답",',
                '  "solution": "짧은 풀이",',
                '  "variationNote": "어떤 점을 바꿨는지 설명",',
                '  "warning": "베타 품질 안내 문구"',
                "}",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "[원본 문제]",
                recognizedText,
                "",
                "[기존 풀이 참고]",
                solveResult || "없음",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const rawText = response.output_text?.trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "유사문제 생성 결과가 비어 있습니다." },
        { status: 502 }
      );
    }

    let parsed: {
      title?: string;
      problem?: string;
      answer?: string;
      solution?: string;
      variationNote?: string;
      warning?: string;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      console.error("[api/similar][POST] parse error:", error);
      console.error("[api/similar][POST] rawText:", rawText);
      return NextResponse.json(
        { error: "유사문제 결과를 정리하지 못했습니다." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result: {
        title: parsed.title?.trim() || "유사문제 Beta",
        problem: parsed.problem?.trim() || "",
        answer: parsed.answer?.trim() || "",
        solution: parsed.solution?.trim() || "",
        variationNote: parsed.variationNote?.trim() || "",
        warning:
          parsed.warning?.trim() ||
          "베타 생성 결과입니다. 수치와 조건을 한 번 더 확인해 주세요.",
      },
    });
  } catch (error) {
    console.error("[api/similar][POST] error:", error);
    return NextResponse.json(
      { error: "유사문제 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
