import katex from "katex";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { SIMILAR_PROBLEM_COST } from "@/lib/rewards";
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

type SimilarBlueprint = {
  problemType?: string;
  coreStructure?: string;
  fixedElements?: string[];
  variableElements?: string[];
  safeGenerationPlan?: string;
  numericStrategy?: string;
  validationChecklist?: string[];
  riskPoints?: string[];
};

type SimilarOutline = Omit<SimilarDraft, "solution">;

type SimilarVerificationResult = {
  isValid?: boolean;
  issues?: string[];
  correctedAnswer?: string;
  reasoningSummary?: string;
};

type SimilarSolutionResult = {
  answer?: string;
  solution?: string;
};

type CreditActionRow = {
  ok: boolean;
  credits: number;
  amount: number;
};

type GenerationSeed = {
  id: string;
  subject: string | null;
  unit: string | null;
  difficulty: string | null;
  core_concepts: string[] | null;
  key_idea: string | null;
  solution_strategy: string | null;
  trap_point: string | null;
  common_mistake: string | null;
  variation_points: string[] | null;
  similar_problem_seed: string | null;
  abstraction_summary: string | null;
  generation_instruction: string | null;
};

const DEFAULT_WARNING = "변형 문제 생성 결과입니다. 수치와 조건은 반드시 다시 확인해 주세요.";
const SIMILAR_MODEL = process.env.SIMILAR_MODEL || "gpt-4o-mini";
const SIMILAR_MAX_OUTPUT_TOKENS = 2000;
const SIMILAR_MAX_RETRIES = 3;

class SimilarGenerationError extends Error {
  public readonly publicMessage: string;
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `유사문제 생성 검증에 반복 실패했습니다. ${
        issues.length > 0 ? issues.join(", ") : "unknown error"
      }`,
    );
    this.name = "SimilarGenerationError";
    this.issues = issues;
    this.publicMessage =
      "생성된 초안이 검수 단계에서 조건 모순 또는 정답 불일치로 걸러졌습니다. 사용한 딱은 자동으로 환불되며, 원본 OCR을 한 번 확인한 뒤 다시 시도해 주세요.";
  }
}

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

function seedSearchText(seed: GenerationSeed) {
  return [
    seed.subject,
    seed.unit,
    seed.difficulty,
    ...(seed.core_concepts ?? []),
    seed.key_idea,
    seed.solution_strategy,
    seed.trap_point,
    seed.common_mistake,
    ...(seed.variation_points ?? []),
    seed.similar_problem_seed,
    seed.abstraction_summary,
    seed.generation_instruction,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreSeed(seed: GenerationSeed, sourceText: string) {
  const haystack = seedSearchText(seed);
  const words = Array.from(
    new Set(
      sourceText
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\\]+/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 2),
    ),
  ).slice(0, 80);

  return words.filter((word) => haystack.includes(word)).length;
}

async function getRelevantGenerationSeeds(recognizedText: string, solveResult: string) {
  const { data, error } = await supabaseAdmin
    .from("problem_idea_seeds")
    .select(
      "id, subject, unit, difficulty, core_concepts, key_idea, solution_strategy, trap_point, common_mistake, variation_points, similar_problem_seed, abstraction_summary, generation_instruction",
    )
    .eq("use_for_generation", true)
    .order("quality_score", { ascending: false })
    .limit(24);

  if (error) {
    console.error("[api/similar] seed lookup failed:", error);
    return [] as GenerationSeed[];
  }

  const sourceText = `${recognizedText}\n${solveResult}`;
  return ((data ?? []) as GenerationSeed[])
    .map((seed) => ({ seed, score: scoreSeed(seed, sourceText) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ seed }) => seed);
}

function buildGenerationSeedContext(seeds: GenerationSeed[]) {
  if (seeds.length === 0) return "";

  return [
    "[Approved 딱씨앗 generation data]",
    "Use these reviewed abstract seeds as reference for topic, key idea, traps, variation direction, and solution structure.",
    "Do not copy any source wording. If the current source problem conflicts with a seed, prioritize the current source problem.",
    JSON.stringify(
      seeds.map((seed) => ({
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
      })),
      null,
      2,
    ),
  ].join("\n");
}

async function spendSimilarProblemCredits(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("spend_user_credits", {
    p_user_id: userId,
    p_amount: SIMILAR_PROBLEM_COST,
    p_type: "SIMILAR_PROBLEM",
    p_reason: "similar_problem:generation",
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as CreditActionRow | null;
}

async function refundSimilarProblemCredits(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("grant_user_credits", {
    p_user_id: userId,
    p_amount: SIMILAR_PROBLEM_COST,
    p_type: "SIMILAR_PROBLEM_REFUND",
    p_reason: "similar_problem:generation_failed",
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as CreditActionRow | null;
}

function buildBlueprintPrompt(seedContext = "") {
  return [
    "You are a Korean high-school math problem designer.",
    "Before writing a similar problem, analyze the source and produce a safe generation blueprint.",
    "Return exactly one JSON object and nothing else.",
    "The blueprint must explain how to choose or transform numbers so the generated problem remains solvable.",
    "Do not write the final problem yet.",
    "If the source problem has fragile numeric conditions such as extrema, interval range, tangency, roots, sequences, probability counts, or parameter constraints, describe a reverse-engineering strategy instead of guessing numbers.",
    seedContext
      ? "Use the approved 딱씨앗 generation data as reference for the core idea, allowed variations, traps, and common mistakes."
      : "",
    seedContext,
    "",
    "Return format:",
    "{",
    '  "problemType": "short type name",',
    '  "coreStructure": "what must be preserved from the original",',
    '  "fixedElements": ["elements that must stay structurally equivalent"],',
    '  "variableElements": ["elements that may change"],',
    '  "safeGenerationPlan": "step-by-step plan to generate a mathematically valid variant",',
    '  "numericStrategy": "how to choose numbers/conditions without contradictions",',
    '  "validationChecklist": ["checks the draft must pass"],',
    '  "riskPoints": ["likely ways the draft can become invalid"]',
    "}",
  ].join("\n");
}

function buildDraftPrompt(blueprint: SimilarBlueprint | null, previousIssues: string[] = [], seedContext = "") {
  const retrySection =
    previousIssues.length > 0
      ? ["", "[Previous failures to fix]", ...previousIssues.map((issue, index) => `${index + 1}. ${issue}`)]
      : [];

  return [
    "You create a similar Korean high-school math problem from the source problem.",
    "Stage order is strict: stage 1 creates only the draft problem and final answer.",
    "Do not write the full solution in this stage.",
    "Return exactly one JSON object and nothing else.",
    "The new problem must be solvable, internally consistent, and appropriate for Korean high-school math.",
    "Change numbers or conditions enough to make it a distinct similar problem while preserving the topic and level.",
    "First follow the safe generation blueprint. Do not invent fragile numeric conditions by intuition.",
    "For extrema/range/tangency/root/sequence/counting conditions, choose numbers by reverse-engineering from valid equations or by using the blueprint's numericStrategy.",
    "After choosing numbers, mentally verify the final answer before returning JSON.",
    "All math must use valid LaTeX.",
    "Inline math uses $...$ and display math uses $$...$$ only.",
    "Do not use \\(...\\), \\[...\\], \\begin, or \\end.",
    "If the problem is multiple-choice, choices must use `1.`, `2.`, `3.`, `4.`, `5.`.",
    "variationNote must clearly explain what changed from the source problem.",
    "Fill meta.subjectLabel, meta.subtopic, meta.difficulty, and meta.difficultyLabel.",
    seedContext
      ? "Use the approved 딱씨앗 generation data below as a quality reference for mathematical structure and variation strategy."
      : "",
    seedContext,
    "",
    "[Safe generation blueprint]",
    JSON.stringify(blueprint ?? {}, null, 2),
    "",
    "Return format:",
    "{",
    '  "title": "similar problem title",',
    '  "problem": "problem statement",',
    '  "answer": "final answer only",',
    '  "variationNote": "what changed",',
    '  "warning": "short caution text",',
    '  "meta": {',
    '    "subjectLabel": "subject",',
    '    "subtopic": "subtopic",',
    '    "difficulty": "easy | medium | hard",',
    '    "difficultyLabel": "쉬움 | 보통 | 어려움"',
    "  }",
    "}",
    ...retrySection,
  ].join("\n");
}

function buildVerificationPrompt(candidate: string) {
  return [
    "You are the verifier for a generated Korean high-school math problem.",
    "Stage 2 verifies the draft by independently checking solvability and answer consistency.",
    "Do not write the full solution in this stage.",
    "Return exactly one JSON object and nothing else.",
    "If the problem itself is broken, contradictory, unsolvable, or malformed, set isValid to false.",
    "If the problem is valid but the proposed answer is wrong, provide correctedAnswer.",
    "List every issue you find, including malformed LaTeX or unreadable math text.",
    "",
    "Return format:",
    "{",
    '  "isValid": true,',
    '  "issues": ["issue"],',
    '  "correctedAnswer": "answer or empty string",',
    '  "reasoningSummary": "brief verification summary"',
    "}",
    "",
    "[Candidate JSON]",
    candidate,
  ].join("\n");
}

function buildRepairPrompt(candidate: string, verification: string, blueprint: SimilarBlueprint | null) {
  return [
    "You repair a generated Korean high-school math problem that failed verification.",
    "Return exactly one JSON object and nothing else.",
    "Keep the same problem type and level, but fix every mathematical inconsistency.",
    "You may change numbers, interval endpoints, options, or the requested value if needed.",
    "Do not preserve a broken condition. Prefer a simpler valid variant over a clever invalid one.",
    "Use the safe generation blueprint and verification issues as constraints.",
    "All math must use valid LaTeX with $...$ or $$...$$ only.",
    "",
    "Return format:",
    "{",
    '  "title": "similar problem title",',
    '  "problem": "repaired problem statement",',
    '  "answer": "final answer only",',
    '  "variationNote": "what changed and what was repaired",',
    '  "warning": "short caution text",',
    '  "meta": {',
    '    "subjectLabel": "subject",',
    '    "subtopic": "subtopic",',
    '    "difficulty": "easy | medium | hard",',
    '    "difficultyLabel": "쉬움 | 보통 | 어려움"',
    "  }",
    "}",
    "",
    "[Safe generation blueprint]",
    JSON.stringify(blueprint ?? {}, null, 2),
    "",
    "[Failed candidate JSON]",
    candidate,
    "",
    "[Verification result JSON]",
    verification,
  ].join("\n");
}

function buildSolutionPrompt(candidate: string, verification: string) {
  return [
    "You are the solver for a verified Korean high-school math problem.",
    "Stage 3 writes the full solution only after stage 2 verification has finished.",
    "Use the verified answer exactly unless it is obviously equivalent notation.",
    "Return exactly one JSON object and nothing else.",
    "The solution must be complete, logically valid, and consistent with the verified answer.",
    "All math must use valid LaTeX.",
    "Inline math uses $...$ and display math uses $$...$$ only.",
    "",
    "Return format:",
    "{",
    '  "answer": "final answer only",',
    '  "solution": "full solution text"',
    "}",
    "",
    "[Verified candidate JSON]",
    candidate,
    "",
    "[Verification result JSON]",
    verification,
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

function extractJsonCandidates(text: string) {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();

  const candidates = new Set<string>();

  if (cleaned) {
    candidates.add(cleaned);
  }

  const firstBraceIndex = cleaned.indexOf("{");
  const lastBraceIndex = cleaned.lastIndexOf("}");

  if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    candidates.add(cleaned.slice(firstBraceIndex, lastBraceIndex + 1));
  }

  for (const value of Array.from(candidates)) {
    candidates.add(value.replace(/,\s*([}\]])/g, "$1"));
  }

  return Array.from(candidates).filter(Boolean);
}

function parseJsonText<T>(rawText: string) {
  const candidates = extractJsonCandidates(rawText);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {}
  }

  throw new Error("JSON parse failed");
}

function parseSimilarOutline(rawText: string) {
  return parseJsonText<SimilarOutline>(rawText);
}

function parseSimilarBlueprint(rawText: string) {
  return parseJsonText<SimilarBlueprint>(rawText);
}

function parseSimilarVerificationResult(rawText: string) {
  return parseJsonText<SimilarVerificationResult>(rawText);
}

function parseSimilarSolutionResult(rawText: string) {
  return parseJsonText<SimilarSolutionResult>(rawText);
}

function repairCommonLatexCorruption(content: string) {
  const commandRepairs: Array<[RegExp, string]> = [
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*rac)(?=\s*\{)/g, "$1\\frac"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*frac)(?=\s*\{)/g, "$1\\frac"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*sqrt)(?=\s*\{)/g, "$1\\sqrt"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*left)(?=\b)/g, "$1\\left"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*right)(?=\b)/g, "$1\\right"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*cdot)(?=\b)/g, "$1\\cdot"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*times)(?=\b)/g, "$1\\times"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*pm)(?=\b)/g, "$1\\pm"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*mp)(?=\b)/g, "$1\\mp"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*leq)(?=\b)/g, "$1\\leq"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*geq)(?=\b)/g, "$1\\geq"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*neq)(?=\b)/g, "$1\\neq"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*sin)(?=\b)/g, "$1\\sin"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*cos)(?=\b)/g, "$1\\cos"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*tan)(?=\b)/g, "$1\\tan"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*log)(?=\b)/g, "$1\\log"],
    [/(^|[^\\a-zA-Z])(\\?[?�]?\s*ln)(?=\b)/g, "$1\\ln"],
  ];

  let repaired = content
    .replace(/\r\n/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/�/g, "?");

  for (const [pattern, replacement] of commandRepairs) {
    repaired = repaired.replace(pattern, replacement);
  }

  return repaired;
}

function sanitizeSimilarOutline(draft: SimilarOutline): SimilarOutline {
  return {
    ...draft,
    title: draft.title?.trim(),
    problem: draft.problem ? repairCommonLatexCorruption(draft.problem).trim() : draft.problem,
    answer: draft.answer ? repairCommonLatexCorruption(draft.answer).trim() : draft.answer,
    variationNote: draft.variationNote ? repairCommonLatexCorruption(draft.variationNote).trim() : draft.variationNote,
    warning: draft.warning?.trim(),
    meta: draft.meta
      ? {
          ...draft.meta,
          subjectLabel: draft.meta.subjectLabel?.trim(),
          subtopic: draft.meta.subtopic?.trim(),
          difficultyLabel: draft.meta.difficultyLabel?.trim(),
        }
      : draft.meta,
  };
}

function sanitizeSimilarDraft(draft: SimilarDraft): SimilarDraft {
  const sanitizedOutline = sanitizeSimilarOutline(draft);

  return {
    ...sanitizedOutline,
    solution: draft.solution ? repairCommonLatexCorruption(draft.solution).trim() : draft.solution,
  };
}

function sanitizeStringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? repairCommonLatexCorruption(item).trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeBlueprint(blueprint: SimilarBlueprint): SimilarBlueprint {
  return {
    problemType: blueprint.problemType?.trim(),
    coreStructure: blueprint.coreStructure?.trim(),
    fixedElements: sanitizeStringArray(blueprint.fixedElements),
    variableElements: sanitizeStringArray(blueprint.variableElements),
    safeGenerationPlan: blueprint.safeGenerationPlan?.trim(),
    numericStrategy: blueprint.numericStrategy?.trim(),
    validationChecklist: sanitizeStringArray(blueprint.validationChecklist),
    riskPoints: sanitizeStringArray(blueprint.riskPoints),
  };
}

function validateBlueprint(blueprint: SimilarBlueprint) {
  const issues: string[] = [];

  if (!blueprint.problemType?.trim()) issues.push("blueprint.problemType is empty");
  if (!blueprint.coreStructure?.trim()) issues.push("blueprint.coreStructure is empty");
  if (!blueprint.safeGenerationPlan?.trim()) issues.push("blueprint.safeGenerationPlan is empty");
  if (!blueprint.numericStrategy?.trim()) issues.push("blueprint.numericStrategy is empty");
  if (!blueprint.validationChecklist?.length) issues.push("blueprint.validationChecklist is empty");

  return issues;
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

function extractLatexExpressions(content: string) {
  const expressions: Array<{ expression: string; displayMode: boolean }> = [];
  const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g;

  for (const match of content.matchAll(mathRegex)) {
    const expression = (match[1] ?? match[2] ?? "").trim();
    if (!expression) continue;
    expressions.push({ expression, displayMode: Boolean(match[1]) });
  }

  return expressions;
}

function validateLatexText(content: string, fieldName: string) {
  const issues: string[] = [];
  const trimmed = content.trim();
  if (!trimmed) return issues;

  if (/[\\]\(|[\\]\)|[\\]\[|[\\]\]|\\begin|\\end/.test(trimmed)) {
    issues.push(`${fieldName}: latex delimiters must use $...$ or $$...$$ only`);
  }

  const suspiciousPatterns: Array<[RegExp, string]> = [
    [/(^|[^\\])frac\s*\{/u, `${fieldName}: 'frac' is missing a leading backslash`],
    [/(^|[^\\])sqrt\s*\{/u, `${fieldName}: 'sqrt' is missing a leading backslash`],
    [/\?rac/u, `${fieldName}: contains broken latex command '?rac'`],
    [/\?frac/u, `${fieldName}: contains broken latex command '?frac'`],
    [/\?sqrt/u, `${fieldName}: contains broken latex command '?sqrt'`],
  ];

  for (const [pattern, message] of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      issues.push(message);
    }
  }

  for (const { expression, displayMode } of extractLatexExpressions(trimmed)) {
    try {
      katex.renderToString(expression, {
        throwOnError: true,
        strict: "error",
        output: "htmlAndMathml",
        displayMode,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown katex error";
      issues.push(`${fieldName}: invalid latex "${expression}" (${detail})`);
    }
  }

  return issues;
}

function validateSimilarOutline(draft: SimilarOutline) {
  const issues: string[] = [];

  if (!draft.title?.trim()) issues.push("title is empty");
  if ((draft.problem?.trim().length || 0) < 12) issues.push("problem is too short");
  if (!draft.answer?.trim()) issues.push("answer is empty");
  if (!draft.variationNote?.trim()) issues.push("variationNote is empty");
  if (!draft.warning?.trim()) issues.push("warning is empty");
  if (!draft.meta?.subjectLabel?.trim()) issues.push("meta.subjectLabel is empty");
  if (!draft.meta?.difficultyLabel?.trim()) issues.push("meta.difficultyLabel is empty");

  issues.push(...validateLatexText(draft.problem ?? "", "problem"));
  issues.push(...validateLatexText(draft.answer ?? "", "answer"));
  issues.push(...validateLatexText(draft.variationNote ?? "", "variationNote"));

  return issues;
}

function validateFinalDraft(draft: SimilarDraft) {
  const issues = validateSimilarOutline(draft);

  if (!draft.solution?.trim()) issues.push("solution is empty");
  issues.push(...validateLatexText(draft.solution ?? "", "solution"));

  return issues;
}

function getVerificationIssues(verification: SimilarVerificationResult, fallbackAnswer: string) {
  const issues = [...(verification.issues ?? [])].filter(Boolean);
  if (verification.isValid === false) {
    issues.unshift("verifier marked candidate as invalid");
  }

  const verifiedAnswer = repairCommonLatexCorruption(
    verification.correctedAnswer?.trim() || fallbackAnswer.trim() || "",
  );
  if (!verifiedAnswer) {
    issues.push("verification did not produce a usable answer");
  }
  issues.push(...validateLatexText(verifiedAnswer, "verifiedAnswer"));

  return { issues, verifiedAnswer };
}

async function createGenerationBlueprint(recognizedText: string, solveResult: string, seedContext = "") {
  const blueprintText = await requestSimilarDraft(buildBlueprintPrompt(seedContext), recognizedText, solveResult);
  if (!blueprintText) return null;

  try {
    const blueprint = sanitizeBlueprint(parseSimilarBlueprint(blueprintText));
    const issues = validateBlueprint(blueprint);

    if (issues.length > 0) {
      console.error("[api/similar] blueprint validation issues:", issues);
      return null;
    }

    return blueprint;
  } catch (error) {
    console.error("[api/similar] blueprint parse error:", error);
    console.error("[api/similar] blueprint raw:", blueprintText);
    return null;
  }
}

async function verifySimilarOutline(outline: SimilarOutline, recognizedText: string, solveResult: string) {
  const verificationText = await requestSimilarDraft(
    buildVerificationPrompt(JSON.stringify(outline, null, 2)),
    recognizedText,
    solveResult,
  );

  if (!verificationText) {
    return {
      verification: null,
      verificationText: "",
      issues: ["verification response was empty"],
      verifiedAnswer: "",
    };
  }

  try {
    const verification = parseSimilarVerificationResult(verificationText);
    const { issues, verifiedAnswer } = getVerificationIssues(verification, outline.answer?.trim() || "");

    return { verification, verificationText, issues, verifiedAnswer };
  } catch (error) {
    console.error("[api/similar] verification parse error:", error);
    console.error("[api/similar] verification raw:", verificationText);
    return {
      verification: null,
      verificationText,
      issues: ["verification JSON parse failed"],
      verifiedAnswer: "",
    };
  }
}

async function repairSimilarOutline(
  outline: SimilarOutline,
  verification: SimilarVerificationResult | null,
  verificationIssues: string[],
  blueprint: SimilarBlueprint | null,
  recognizedText: string,
  solveResult: string,
) {
  const repairText = await requestSimilarDraft(
    buildRepairPrompt(
      JSON.stringify(outline, null, 2),
      JSON.stringify(verification ?? { isValid: false, issues: verificationIssues }, null, 2),
      blueprint,
    ),
    recognizedText,
    solveResult,
  );

  if (!repairText) {
    return { outline: null, issues: ["repair response was empty"] };
  }

  try {
    const repaired = sanitizeSimilarOutline(parseSimilarOutline(repairText));
    const outlineIssues = validateSimilarOutline(repaired);
    return { outline: outlineIssues.length > 0 ? null : repaired, issues: outlineIssues };
  } catch (error) {
    console.error("[api/similar] repair parse error:", error);
    console.error("[api/similar] repair raw:", repairText);
    return { outline: null, issues: ["repair JSON parse failed"] };
  }
}

async function generateValidatedSimilarProblem(recognizedText: string, solveResult: string, seedContext = "") {
  let retryIssues: string[] = [];
  let lastIssues: string[] = [];
  const blueprint = await createGenerationBlueprint(recognizedText, solveResult, seedContext);

  for (let attempt = 1; attempt <= SIMILAR_MAX_RETRIES; attempt += 1) {
    const outlineText = await requestSimilarDraft(
      buildDraftPrompt(blueprint, retryIssues, seedContext),
      recognizedText,
      solveResult,
    );

    if (!outlineText) {
      lastIssues = ["draft response was empty"];
      retryIssues = lastIssues;
      continue;
    }

    let outline: SimilarOutline;

    try {
      outline = sanitizeSimilarOutline(parseSimilarOutline(outlineText));
    } catch (error) {
      console.error("[api/similar] outline parse error:", error);
      console.error("[api/similar] outline raw:", outlineText);
      lastIssues = ["draft JSON parse failed"];
      retryIssues = lastIssues;
      continue;
    }

    const outlineIssues = validateSimilarOutline(outline);
    if (outlineIssues.length > 0) {
      console.error("[api/similar] outline validation issues:", outlineIssues);
      lastIssues = outlineIssues;
      retryIssues = outlineIssues;
      continue;
    }

    let verificationResult = await verifySimilarOutline(outline, recognizedText, solveResult);

    if (verificationResult.issues.length > 0) {
      console.error("[api/similar] verification issues:", verificationResult.issues);
      const repairResult = await repairSimilarOutline(
        outline,
        verificationResult.verification,
        verificationResult.issues,
        blueprint,
        recognizedText,
        solveResult,
      );

      if (!repairResult.outline) {
        console.error("[api/similar] repair issues:", repairResult.issues);
        lastIssues = [...verificationResult.issues, ...repairResult.issues];
        retryIssues = lastIssues;
        continue;
      }

      outline = repairResult.outline;
      verificationResult = await verifySimilarOutline(outline, recognizedText, solveResult);

      if (verificationResult.issues.length > 0) {
        console.error("[api/similar] repaired verification issues:", verificationResult.issues);
        lastIssues = verificationResult.issues;
        retryIssues = verificationResult.issues;
        continue;
      }
    }

    const verifiedDraft: SimilarDraft = sanitizeSimilarDraft({
      ...outline,
      answer: verificationResult.verifiedAnswer,
    });

    const solutionText = await requestSimilarDraft(
      buildSolutionPrompt(
        JSON.stringify(verifiedDraft, null, 2),
        JSON.stringify(verificationResult.verification ?? { isValid: true }, null, 2),
      ),
      recognizedText,
      solveResult,
    );

    if (!solutionText) {
      lastIssues = ["solution response was empty"];
      retryIssues = lastIssues;
      continue;
    }

    let solutionResult: SimilarSolutionResult;

    try {
      solutionResult = parseSimilarSolutionResult(solutionText);
    } catch (error) {
      console.error("[api/similar] solution parse error:", error);
      console.error("[api/similar] solution raw:", solutionText);
      lastIssues = ["solution JSON parse failed"];
      retryIssues = lastIssues;
      continue;
    }

    const candidate: SimilarDraft = sanitizeSimilarDraft({
      ...verifiedDraft,
      answer: repairCommonLatexCorruption(solutionResult.answer?.trim() || verifiedDraft.answer?.trim() || ""),
      solution: solutionResult.solution?.trim() || "",
    });

    const finalIssues = validateFinalDraft(candidate);
    if (finalIssues.length > 0) {
      console.error("[api/similar] final validation issues:", finalIssues);
      lastIssues = finalIssues;
      retryIssues = finalIssues;
      continue;
    }

    return candidate;
  }

  throw new SimilarGenerationError(lastIssues);
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

    const creditCharge = await spendSimilarProblemCredits(user.id);

    if (!creditCharge) {
      return NextResponse.json({ error: "딱 차감 결과를 확인하지 못했습니다." }, { status: 500 });
    }

    if (!creditCharge.ok) {
      return NextResponse.json(
        {
          error: `딱이 부족합니다. 유사문제 생성에는 ${SIMILAR_PROBLEM_COST.toLocaleString("ko-KR")}딱이 필요합니다.`,
          credits: creditCharge.credits,
          similarProblemCost: SIMILAR_PROBLEM_COST,
        },
        { status: 402 },
      );
    }

    let parsed: SimilarDraft;
    let finalCredits = creditCharge.credits;

    try {
      const generationSeeds = await getRelevantGenerationSeeds(recognizedText, solveResult);
      parsed = await generateValidatedSimilarProblem(
        recognizedText,
        solveResult,
        buildGenerationSeedContext(generationSeeds),
      );
    } catch (error) {
      console.error("[api/similar][POST] generation error:", error);
      try {
        const refund = await refundSimilarProblemCredits(user.id);
        finalCredits = refund?.credits ?? finalCredits + SIMILAR_PROBLEM_COST;
      } catch (refundError) {
        console.error("[api/similar][POST] credit refund error:", refundError);
      }

      return NextResponse.json(
        {
          error:
            error instanceof SimilarGenerationError
              ? error.publicMessage
              : error instanceof Error && error.message
                ? error.message
                : "유사문제 결과를 정리하지 못했습니다.",
          detail:
            error instanceof SimilarGenerationError && process.env.NODE_ENV !== "production"
              ? error.issues.slice(0, 4)
              : undefined,
        },
        { status: 502 },
      );
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
      credits: finalCredits,
      chargedAmount: SIMILAR_PROBLEM_COST,
    });
  } catch (error) {
    console.error("[api/similar][POST] error:", error);
    return NextResponse.json({ error: "유사문제 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
