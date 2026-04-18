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

type SimilarReviewResult = {
  isValid?: boolean;
  issues?: string[];
  candidate?: SimilarDraft | null;
};

const DEFAULT_WARNING = "베타 생성 결과입니다. 수치와 조건은 반드시 다시 확인해 주세요.";
const SIMILAR_MODEL = "gpt-4o-mini";
const SIMILAR_MAX_OUTPUT_TOKENS = 2000;

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
    "너는 수능/내신 스타일 고등 수학 유사문제를 만드는 출제 검토자다.",
    "반드시 JSON 객체 하나만 반환하라.",
    "원본과 같은 개념, 학년군, 난이도를 유지하되 숫자와 조건, 보기 구성을 자연스럽게 변형하라.",
    "문제 본문, 보기, 정답, 풀이가 서로 논리적으로 완전히 일치해야 한다.",
    "풀이에는 핵심 관찰과 계산 과정을 충분히 적고, variationNote에는 무엇을 어떻게 바꿨는지 구체적으로 적어라.",
    "수식은 반드시 LaTeX로 작성하고 inline 수식은 $...$, 블록 수식은 $$...$$ 만 사용하라.",
    "\\(...\\), \\[...\\], \\begin, \\end 는 쓰지 마라.",
    "객관식이면 보기를 줄바꿈하여 `1.`, `2.`, `3.`, `4.`, `5.` 형식으로 작성하라.",
    "meta에는 subjectLabel, subtopic, difficulty, difficultyLabel을 채워라.",
    "",
    "반환 형식:",
    "{",
    '  "title": "유사문제 제목",',
    '  "problem": "문제 본문",',
    '  "answer": "정답",',
    '  "solution": "풀이",',
    '  "variationNote": "변형 사항",',
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
    "아래 JSON 초안을 내부 검수하고 필요하면 바로 수정하라.",
    "반드시 JSON 객체 하나만 반환하라.",
    "반환 형식:",
    "{",
    '  "isValid": true,',
    '  "issues": ["issue"],',
    '  "candidate": {',
    '    "title": "유사문제 제목",',
    '    "problem": "문제 본문",',
    '    "answer": "정답",',
    '    "solution": "풀이",',
    '    "variationNote": "변형 사항",',
    '    "warning": "검토 안내 문구",',
    '    "meta": {',
    '      "subjectLabel": "과목",',
    '      "subtopic": "주제",',
    '      "difficulty": "easy | medium | hard",',
    '      "difficultyLabel": "쉬움 | 보통 | 어려움"',
    "    }",
    "  }",
    "}",
    "",
    "검수 기준:",
    "1. 문제, 정답, 풀이가 서로 모순 없이 맞아야 한다.",
    "2. 객관식 보기 구성이 정답과 일치해야 한다.",
    "3. 수식 표기는 $...$, $$...$$ 만 사용해야 한다.",
    "4. 고등 수학 문항 톤으로 자연스러워야 한다.",
    "5. variationNote는 실제 변형 포인트를 구체적으로 설명해야 한다.",
    "6. meta 정보는 문제와 맞아야 한다.",
    "",
    "[검수 대상 JSON]",
    candidate,
  ].join("\n");
}

function buildRepairPrompt(candidate: string, issues: string[]) {
  return [
    "아래 JSON의 오류를 고쳐라.",
    "반드시 수정된 JSON 객체 하나만 반환하라.",
    "문제, 정답, 풀이의 일관성을 최우선으로 맞춰라.",
    "warning은 비우지 마라.",
    "variationNote에는 어떤 요소를 바꿨는지 구체적으로 적어라.",
    "",
    "[발견된 문제]",
    issues.length > 0 ? issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n") : "- 없음",
    "",
    "[현재 JSON]",
    candidate,
  ].join("\n");
}

async function requestSimilarDraft(prompt: string, recognizedText: string, solveResult: string) {
  const response = await client.responses.create({
    model: SIMILAR_MODEL,
    max_output_tokens: SIMILAR_MAX_OUTPUT_TOKENS,
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

function parseJsonText<T>(rawText: string) {
  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

function parseSimilarDraft(rawText: string) {
  return parseJsonText<SimilarDraft>(rawText);
}

function parseSimilarReviewResult(rawText: string) {
  return parseJsonText<SimilarReviewResult>(rawText);
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

function validateSimilarDraft(draft: SimilarDraft) {
  const issues: string[] = [];
  const mergedText = [draft.problem, draft.answer, draft.solution].join("\n");

  if (!draft.title?.trim()) issues.push("title is empty");
  if ((draft.problem?.trim().length || 0) < 12) issues.push("problem is too short");
  if (!draft.answer?.trim()) issues.push("answer is empty");
  if (!draft.solution?.trim()) issues.push("solution is empty");
  if (!draft.variationNote?.trim()) issues.push("variationNote is empty");
  if (!draft.warning?.trim()) issues.push("warning is empty");
  if (!draft.meta?.subjectLabel?.trim()) issues.push("meta.subjectLabel is empty");
  if (!draft.meta?.difficultyLabel?.trim()) issues.push("meta.difficultyLabel is empty");
  if (/[\\]\(|[\\]\)|[\\]\[|[\\]\]|\\begin|\\end/.test(mergedText)) {
    issues.push("latex delimiters must use $...$ or $$...$$ only");
  }

  return issues;
}

async function generateValidatedSimilarProblem(recognizedText: string, solveResult: string) {
  const draftText = await requestSimilarDraft(buildGenerationPrompt(), recognizedText, solveResult);
  if (!draftText) {
    throw new Error("유사문제 생성 결과가 비어 있습니다.");
  }

  let candidate = parseSimilarDraft(draftText);

  const reviewText = await requestSimilarDraft(
    buildReviewPrompt(JSON.stringify(candidate, null, 2)),
    recognizedText,
    solveResult,
  );

  if (reviewText) {
    try {
      const review = parseSimilarReviewResult(reviewText);
      if (review.candidate) {
        candidate = review.candidate;
      }

      const mergedIssues = [...(review.issues ?? []), ...validateSimilarDraft(candidate)];
      if (review.isValid === false || mergedIssues.length > 0) {
        const repairedText = await requestSimilarDraft(
          buildRepairPrompt(JSON.stringify(candidate, null, 2), mergedIssues),
          recognizedText,
          solveResult,
        );

        if (repairedText) {
          candidate = parseSimilarDraft(repairedText);
        }
      }
    } catch (error) {
      console.error("[api/similar] review parse error:", error);
      console.error("[api/similar] review raw:", reviewText);
    }
  }

  const finalIssues = validateSimilarDraft(candidate);
  if (finalIssues.length > 0) {
    console.error("[api/similar] final validation issues:", finalIssues);
    throw new Error("유사문제 검증에 실패했습니다.");
  }

  return candidate;
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

    let parsed: SimilarDraft;

    try {
      parsed = await generateValidatedSimilarProblem(recognizedText, solveResult);
    } catch (error) {
      console.error("[api/similar][POST] generation error:", error);
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
