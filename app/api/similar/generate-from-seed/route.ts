import katex from "katex";
import OpenAI from "openai";
import { NextResponse } from "next/server";

import { SIMILAR_PROBLEM_COST } from "@/lib/rewards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader } from "@/lib/training/auth";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CreditActionRow = {
  ok: boolean;
  credits: number;
  amount: number;
};

type SeedProblemResult = {
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
  };
};

async function spendCredits(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("spend_user_credits", {
    p_user_id: userId,
    p_amount: SIMILAR_PROBLEM_COST,
    p_type: "SIMILAR_PROBLEM",
    p_reason: "similar_problem:seed_generation",
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CreditActionRow | null;
}

async function refundCredits(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("grant_user_credits", {
    p_user_id: userId,
    p_amount: SIMILAR_PROBLEM_COST,
    p_type: "SIMILAR_PROBLEM_REFUND",
    p_reason: "similar_problem:seed_generation_failed",
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CreditActionRow | null;
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
    if (textParts.length > 0) return textParts.join("\n");
  }

  return "";
}

function parseJson<T>(text: string) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")) as T;
}

function validateLatex(content: string) {
  const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g;
  for (const match of content.matchAll(mathRegex)) {
    const expression = (match[1] ?? match[2] ?? "").trim();
    if (!expression) continue;
    katex.renderToString(expression, {
      throwOnError: true,
      strict: "error",
      output: "htmlAndMathml",
      displayMode: Boolean(match[1]),
    });
  }
}

function buildPrompt(seed: Record<string, unknown>) {
  return [
    "아래 정보는 원본 문제의 문장을 복제하기 위한 것이 아니라, 문제의 핵심 수학적 발상만 추상화한 것이다.",
    "원본 문항의 표현, 보기, 수치, 도표 구조를 그대로 따라 하지 말고, 같은 핵심 개념과 풀이 발상을 요구하는 새로운 고등학교 수학 문제를 생성하라.",
    "원본 문제 전문이나 해설 전문은 제공되지 않으며, 제공된 추상화 seed만 사용한다.",
    "새 문제는 문장, 수치, 조건 배열, 보기 구조가 기존 원본과 과도하게 유사하지 않도록 구성한다.",
    "반드시 JSON 객체 하나만 반환한다. 모든 수식은 $...$ 또는 $$...$$만 사용한다.",
    "",
    "반환 형식:",
    "{",
    '  "title": "문제 제목",',
    '  "problem": "새 문제 본문",',
    '  "answer": "정답",',
    '  "solution": "풀이",',
    '  "variationNote": "어떤 추상 발상을 유지하고 무엇을 바꾸었는지",',
    '  "warning": "검토 안내",',
    '  "meta": { "subjectLabel": "과목", "subtopic": "단원", "difficulty": "easy | medium | hard", "difficultyLabel": "쉬움 | 보통 | 어려움" }',
    "}",
    "",
    "[추상화 seed]",
    JSON.stringify(
      {
        subject: seed.subject,
        unit: seed.unit,
        difficulty: seed.difficulty,
        core_concepts: seed.core_concepts,
        key_idea: seed.key_idea,
        solution_strategy: seed.solution_strategy,
        trap_point: seed.trap_point,
        common_mistake: seed.common_mistake,
        variation_points: seed.variation_points,
        similar_problem_seed: seed.similar_problem_seed,
        abstraction_summary: seed.abstraction_summary,
        generation_instruction: seed.generation_instruction,
      },
      null,
      2,
    ),
  ].join("\n");
}

export async function POST(req: Request) {
  const user = await getUserFromAuthHeader(req);

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let charged = false;

  try {
    const body = (await req.json()) as { seedId?: string };
    const seedId = String(body.seedId || "").trim();

    if (!seedId) {
      return NextResponse.json({ error: "seedId가 필요합니다." }, { status: 400 });
    }

    const { data: seed, error } = await supabaseAdmin
      .from("problem_idea_seeds")
      .select("*")
      .eq("id", seedId)
      .eq("use_for_generation", true)
      .maybeSingle();

    if (error) throw error;
    if (!seed) {
      return NextResponse.json({ error: "사용 가능한 seed를 찾을 수 없습니다." }, { status: 404 });
    }

    const creditCharge = await spendCredits(user.id);
    charged = Boolean(creditCharge?.ok);

    if (!creditCharge?.ok) {
      return NextResponse.json(
        {
          error: `딱이 부족합니다. 유사문제 생성에는 ${SIMILAR_PROBLEM_COST.toLocaleString("ko-KR")}딱이 필요합니다.`,
          credits: creditCharge?.credits ?? 0,
          similarProblemCost: SIMILAR_PROBLEM_COST,
        },
        { status: 402 },
      );
    }

    const response = await client.responses.create({
      model: process.env.SEED_SIMILAR_MODEL || "gpt-4o-mini",
      store: false,
      max_output_tokens: 2200,
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: "너는 한국 고등학교 수학 유사문제 생성 및 검수 전문가다." }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildPrompt(seed) }],
        },
      ],
    });

    const parsed = parseJson<SeedProblemResult>(extractResponseText(response));
    const problem = String(parsed.problem || "").trim();
    const answer = String(parsed.answer || "").trim();
    const solution = String(parsed.solution || "").trim();

    if (!problem || !answer || !solution) {
      throw new Error("생성 결과가 비어 있습니다.");
    }

    validateLatex(`${problem}\n${answer}\n${solution}`);

    return NextResponse.json({
      result: {
        title: String(parsed.title || "딱씨앗 유사문제").trim(),
        problem,
        answer,
        solution,
        variationNote: String(parsed.variationNote || "").trim(),
        warning: String(parsed.warning || "생성된 문제는 풀이 전 조건과 정답을 한 번 더 확인해 주세요.").trim(),
        meta: parsed.meta ?? {
          subjectLabel: seed.subject ?? "수학",
          subtopic: seed.unit ?? "",
          difficulty: "medium",
          difficultyLabel: "보통",
        },
      },
      credits: creditCharge.credits,
      chargedAmount: SIMILAR_PROBLEM_COST,
    });
  } catch (error) {
    console.error("[api/similar/generate-from-seed] error:", error);

    if (charged) {
      try {
        await refundCredits(user.id);
      } catch (refundError) {
        console.error("[api/similar/generate-from-seed] refund error:", refundError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "seed 기반 유사문제를 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}
