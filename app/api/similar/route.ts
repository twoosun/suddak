import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { type SimilarProblemMeta } from "@/types/similar";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SimilarDraft = {
  title?: string;
  problem?: string;
  answer?: string;
  solution?: string;
  variationNote?: string;
  warning?: string;
  meta?: {
    subjectLabel?: string;
    subtopic?: string;
    difficulty?: "easy" | "medium" | "hard";
    difficultyLabel?: string;
  } | null;
};

const DEFAULT_WARNING = "베타 생성 결과입니다. 수치와 조건을 한 번 더 확인해 주세요.";

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

function buildGenerationPrompt() {
  return [
    "너는 한국 고등학교 수학 문제를 바탕으로 유사문제를 만드는 엄격한 출제 검토자다.",
    "출력은 반드시 JSON 객체 하나만 반환하라.",
    "원문과 같은 핵심 개념, 학년군, 난이도를 유지하되 숫자, 조건, 보기 구성은 자연스럽게 변형하라.",
    "문제 본문과 보기, 정답, 풀이가 서로 논리적으로 완전히 일치해야 한다.",
    "수식은 반드시 LaTeX 표기로 작성하고, inline 수식은 $...$, 블록 수식은 $$...$$ 를 사용하라.",
    "절대로 \\(...\\), \\[...\\] 형태를 쓰지 마라.",
    "객관식이면 보기는 한 줄에 하나씩 `1.`, `2.`, `3.`, `4.`, `5.` 형식으로 작성하라.",
    "풀이에는 핵심 계산 과정을 충분히 적고, 변형 포인트에는 무엇을 어떻게 바꿨는지 구체적으로 적어라.",
    "meta에는 과목명(subjectLabel), 세부 주제(subtopic), 난이도(difficulty, difficultyLabel)를 넣어라.",
    "",
    "반환 형식:",
    "{",
    '  "title": "유사문제 제목",',
    '  "problem": "문제 본문",',
    '  "answer": "정답",',
    '  "solution": "풀이",',
    '  "variationNote": "변형 포인트",',
    '  "warning": "검토 안내 문구",',
    '  "meta": {',
    '    "subjectLabel": "과목",',
    '    "subtopic": "주제",',
    '    "difficulty": "easy | medium | hard",',
    '    "difficultyLabel": "쉬움 | 보통 | 어려움"',
    "  }",
    "}",
  ].join("\n");
}

function buildReviewPrompt(candidate: string) {
  return [
    "아래 JSON 초안을 검토해 오류를 고쳐라.",
    "반드시 JSON 객체 하나만 반환하라.",
    "검토 기준:",
    "1. 문제 본문, 보기, 정답, 풀이가 서로 모순 없이 맞아야 한다.",
    "2. 보기 개수와 정답이 실제 내용과 맞아야 한다.",
    "3. 수식은 모두 $...$ 또는 $$...$$ 로만 표기해야 한다.",
    "4. 한국어 표현과 문항 형식이 자연스러워야 한다.",
    "5. meta 정보는 비워 두지 말고 문제와 일치하게 유지하라.",
    "",
    "[검토 대상 JSON]",
    candidate,
  ].join("\n");
}

async function requestSimilarDraft(prompt: string, recognizedText: string, solveResult: string) {
  const response = await client.responses.create({
    model: "gpt-5.4",
    reasoning: { effort: "high" },
    max_output_tokens: 2400,
    store: false,
    input: [
      {
        role: "developer",
        content: [{ type: "input_text", text: prompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: ["[원본 문제]", recognizedText, "", "[기존 풀이 참고]", solveResult || "없음"].join("\n"),
          },
        ],
      },
    ],
  });

  return extractResponseText(response);
}

function parseSimilarDraft(rawText: string) {
  return JSON.parse(rawText) as SimilarDraft;
}

function extractResponseText(response: OpenAI.Responses.Response) {
  const rawText = response.output_text?.trim() || "";
  if (rawText) return rawText;

  for (const item of response.output ?? []) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;

    const textParts = item.content
      .filter(
        (
          part,
        ): part is Extract<(typeof item.content)[number], { type: "output_text"; text: string }> =>
          part.type === "output_text" && typeof part.text === "string",
      )
      .map((part) => part.text.trim())
      .filter(Boolean);

    if (textParts.length > 0) {
      return textParts.join("\n");
    }
  }

  return "";
}

function normalizeMeta(meta: SimilarDraft["meta"]): SimilarProblemMeta | null {
  if (!meta) return null;

  const difficulty = meta.difficulty === "easy" || meta.difficulty === "hard" ? meta.difficulty : "medium";
  const difficultyLabel =
    meta.difficultyLabel?.trim() ||
    (difficulty === "easy" ? "쉬움" : difficulty === "hard" ? "어려움" : "보통");

  return {
    subjectLabel: meta.subjectLabel?.trim() || "수학",
    subtopic: meta.subtopic?.trim() || "",
    difficulty,
    difficultyLabel,
  };
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
      return NextResponse.json({ error: "연결된 원본 기록을 찾을 수 없습니다." }, { status: 404 });
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
    return NextResponse.json({ error: "유사문제 정보를 불러오지 못했습니다." }, { status: 500 });
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
        { status: 403 },
      );
    }

    const body = await req.json();
    const historyId = Number(body.historyId || "");

    if (!historyId || Number.isNaN(historyId)) {
      return NextResponse.json({ error: "historyId가 올바르지 않습니다." }, { status: 400 });
    }

    const historyItem = await getHistoryItem(historyId, user.id);

    if (!historyItem) {
      return NextResponse.json({ error: "연결된 원본 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    const recognizedText = String(historyItem.recognized_text || "").trim();
    const solveResult = String(historyItem.solve_result || "").trim();

    if (!recognizedText) {
      return NextResponse.json(
        { error: "원본 문제 텍스트가 없어 유사문제를 만들 수 없습니다." },
        { status: 400 },
      );
    }

    const draftText = await requestSimilarDraft(buildGenerationPrompt(), recognizedText, solveResult);

    if (!draftText) {
      return NextResponse.json({ error: "유사문제 생성 결과가 비어 있습니다." }, { status: 502 });
    }

    const reviewedText = await requestSimilarDraft(buildReviewPrompt(draftText), recognizedText, solveResult);
    const rawText = reviewedText || draftText;

    let parsed: SimilarDraft;

    try {
      parsed = parseSimilarDraft(rawText);
    } catch (error) {
      console.error("[api/similar][POST] parse error:", error);
      console.error("[api/similar][POST] rawText:", rawText);
      return NextResponse.json({ error: "유사문제 결과를 정리하지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json({
      result: {
        title: parsed.title?.trim() || "유사문제 Beta",
        problem: parsed.problem?.trim() || "",
        answer: parsed.answer?.trim() || "",
        solution: parsed.solution?.trim() || "",
        variationNote: parsed.variationNote?.trim() || "",
        warning: parsed.warning?.trim() || DEFAULT_WARNING,
        meta: normalizeMeta(parsed.meta),
      },
    });
  } catch (error) {
    console.error("[api/similar][POST] error:", error);
    return NextResponse.json({ error: "유사문제 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
