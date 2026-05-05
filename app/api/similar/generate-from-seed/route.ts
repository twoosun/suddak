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

type SourceTrainingItem = {
  problem_number?: string | null;
  problem_text?: string | null;
  solution_text?: string | null;
  answer?: string | null;
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

function normalizeMathText(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?rac(?=\s*\{)/g, "$1\\frac")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?sqrt(?=\s*\{)/g, "$1\\sqrt")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?left\b/g, "$1\\left")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?right\b/g, "$1\\right")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?cdot\b/g, "$1\\cdot")
    .trim();
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

function compactForCopyCheck(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[.,;:!?'"`~()[\]{}<>·ㆍ…，。]/g, "")
    .trim();
}

function assertNotDirectCopy(generatedProblem: string, sourceItem: SourceTrainingItem | null) {
  const source = compactForCopyCheck(sourceItem?.problem_text || "");
  const generated = compactForCopyCheck(generatedProblem);
  if (!source || !generated) return;

  if (source === generated) {
    throw new Error("생성 문제가 원본 문제와 동일해 다시 생성이 필요합니다.");
  }

  const shorter = Math.min(source.length, generated.length);
  const longer = Math.max(source.length, generated.length);
  if (shorter >= 80 && longer > 0 && source.includes(generated.slice(0, Math.min(generated.length, 160)))) {
    throw new Error("생성 문제가 원본 문항 표현을 과도하게 포함해 다시 생성이 필요합니다.");
  }
}

async function loadSourceItem(seed: Record<string, unknown>) {
  const sourceItemId = String(seed.source_item_id || "").trim();
  if (!sourceItemId) return null;

  const { data, error } = await supabaseAdmin
    .from("training_items")
    .select("problem_number, problem_text, solution_text, answer")
    .eq("id", sourceItemId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as SourceTrainingItem | null;
}

function buildPrompt(seed: Record<string, unknown>, sourceItem: SourceTrainingItem | null) {
  return [
    "아래 자료는 딱씨앗 분석에서 나온 추상화 seed와, 그 seed의 근거가 된 원본 문제/해설 전문이다.",
    "원본 문제와 해설 전문은 풀이 흐름, 조건의 역할, 해설에서 쓰인 핵심 발상, 문제-해설 매칭을 이해하기 위한 참고자료로 적극 활용하라.",
    "단, 새 문제는 원본과 완전히 동일하면 안 된다. 발문 문장, 수치, 문자, 보기 표현, 조건 배열 중 일부를 바꾸어 새로운 문항으로 작성하라.",
    "유형, 핵심 개념, 풀이 단계, 함정, 난도, 해설의 논리 흐름은 원본과 유사하게 유지하라.",
    "원본이 5지선다이면 새 문제도 ①②③④⑤ 선택지를 포함하라. 서술형이면 채점 가능한 풀이 단계를 포함하라.",
    "모든 수식은 Markdown LaTeX로 작성한다. 인라인은 $...$, 블록은 $$...$$만 사용하고, \\frac, \\sqrt 같은 명령 앞의 역슬래시를 빠뜨리지 마라.",
    "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 JSON 밖 설명은 쓰지 마라.",
    "",
    "반환 형식:",
    "{",
    '  "title": "문제 제목",',
    '  "problem": "새 문제 본문",',
    '  "answer": "정답",',
    '  "solution": "풀이",',
    '  "variationNote": "원본 문제/해설에서 어떤 구조를 유지했고 무엇을 바꾸었는지",',
    '  "warning": "검토 안내",',
    '  "meta": { "subjectLabel": "과목", "subtopic": "단원", "difficulty": "easy | medium | hard", "difficultyLabel": "쉬움 | 보통 | 어려움" }',
    "}",
    "",
    "[원본 문제/해설 전문]",
    JSON.stringify(
      {
        problem_number: sourceItem?.problem_number ?? null,
        problem_text: sourceItem?.problem_text ?? "",
        solution_text: sourceItem?.solution_text ?? "",
        answer: sourceItem?.answer ?? "",
      },
      null,
      2,
    ),
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

    const sourceItem = await loadSourceItem(seed);
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
      max_output_tokens: 3200,
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: "너는 한국 고등학교 수학 유사문제 생성 및 검수 전문가다." }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildPrompt(seed, sourceItem) }],
        },
      ],
    });

    const parsed = parseJson<SeedProblemResult>(extractResponseText(response));
    const problem = normalizeMathText(String(parsed.problem || ""));
    const answer = normalizeMathText(String(parsed.answer || ""));
    const solution = normalizeMathText(String(parsed.solution || ""));

    if (!problem || !answer || !solution) {
      throw new Error("생성 결과가 비어 있습니다.");
    }

    assertNotDirectCopy(problem, sourceItem);
    validateLatex(`${problem}\n${answer}\n${solution}`);

    return NextResponse.json({
      result: {
        title: String(parsed.title || "딱씨앗 유사문제").trim(),
        problem,
        answer,
        solution,
        variationNote: String(parsed.variationNote || "").trim(),
        warning: String(parsed.warning || "생성된 문제의 조건과 정답을 한 번 더 확인해 주세요.").trim(),
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
