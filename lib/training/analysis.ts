import OpenAI from "openai";

import {
  TRAINING_MAX_ITEMS,
  TRAINING_MODEL,
  TRAINING_PROMPT_VERSION,
} from "@/lib/training/constants";
import {
  buildTrainingAnalysisDeveloperPrompt,
  buildTrainingAnalysisUserPrompt,
} from "@/lib/prompts/training-analysis";
import type { TrainingAnalysisItem, TrainingAnalysisResult } from "@/lib/training/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AnalyzeFileInput = {
  name: string;
  mimeType: string;
  base64: string;
  role: "problem" | "solution";
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["detected_problem_count", "matched_problem_count", "items"],
  properties: {
    detected_problem_count: { type: "number" },
    matched_problem_count: { type: "number" },
    items: {
      type: "array",
      maxItems: TRAINING_MAX_ITEMS,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "problem_number",
          "problem_text",
          "solution_text",
          "answer",
          "subject",
          "unit",
          "difficulty",
          "core_concepts",
          "key_idea",
          "solution_strategy",
          "trap_point",
          "common_mistake",
          "variation_points",
          "similar_problem_seed",
          "abstraction_summary",
          "solver_hint",
          "generation_instruction",
          "quality_grade",
          "confidence",
        ],
        properties: {
          problem_number: { type: "string" },
          problem_text: { type: "string" },
          solution_text: { type: "string" },
          answer: { type: "string" },
          subject: { type: "string" },
          unit: { type: "string" },
          difficulty: { type: "number" },
          core_concepts: { type: "array", items: { type: "string" } },
          key_idea: { type: "string" },
          solution_strategy: { type: "string" },
          trap_point: { type: "string" },
          common_mistake: { type: "string" },
          variation_points: { type: "array", items: { type: "string" } },
          similar_problem_seed: { type: "string" },
          abstraction_summary: { type: "string" },
          solver_hint: { type: "string" },
          generation_instruction: { type: "string" },
          quality_grade: { type: "string", enum: ["A", "B", "C", "D"] },
          confidence: { type: "number" },
        },
      },
    },
  },
};

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

function extractJsonCandidates(text: string) {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();

  const candidates = new Set<string>();
  if (cleaned) candidates.add(cleaned);

  const firstBraceIndex = cleaned.indexOf("{");
  const lastBraceIndex = cleaned.lastIndexOf("}");
  if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    candidates.add(cleaned.slice(firstBraceIndex, lastBraceIndex + 1));
  }

  for (const candidate of Array.from(candidates)) {
    candidates.add(candidate.replace(/,\s*([}\]])/g, "$1"));
  }

  return Array.from(candidates).filter(Boolean);
}

function parseJson<T>(rawText: string) {
  for (const candidate of extractJsonCandidates(rawText)) {
    try {
      return JSON.parse(candidate) as T;
    } catch {}
  }

  throw new Error("AI 분석 결과를 JSON으로 해석하지 못했습니다.");
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, next));
}

function normalizeItem(item: Partial<TrainingAnalysisItem>, index: number): TrainingAnalysisItem {
  const qualityGrade = ["A", "B", "C", "D"].includes(String(item.quality_grade))
    ? (String(item.quality_grade) as TrainingAnalysisItem["quality_grade"])
    : "C";

  return {
    problem_number: stringValue(item.problem_number, String(index + 1)),
    problem_text: stringValue(item.problem_text),
    solution_text: stringValue(item.solution_text),
    answer: stringValue(item.answer),
    subject: stringValue(item.subject),
    unit: stringValue(item.unit),
    difficulty: clampNumber(item.difficulty, 1, 5, 3),
    core_concepts: stringArray(item.core_concepts, 8),
    key_idea: stringValue(item.key_idea),
    solution_strategy: stringValue(item.solution_strategy),
    trap_point: stringValue(item.trap_point),
    common_mistake: stringValue(item.common_mistake),
    variation_points: stringArray(item.variation_points, 8),
    similar_problem_seed: stringValue(item.similar_problem_seed),
    abstraction_summary: stringValue(item.abstraction_summary),
    solver_hint: stringValue(item.solver_hint),
    generation_instruction: stringValue(item.generation_instruction),
    quality_grade: qualityGrade,
    confidence: clampNumber(item.confidence, 0, 1, 0.5),
  };
}

function normalizeAnalysisResult(value: Partial<TrainingAnalysisResult>): TrainingAnalysisResult {
  const items = Array.isArray(value.items)
    ? value.items.slice(0, TRAINING_MAX_ITEMS).map((item, index) => normalizeItem(item, index))
    : [];

  return {
    detected_problem_count: Math.max(
      items.length,
      Math.round(Number(value.detected_problem_count) || items.length),
    ),
    matched_problem_count: Math.max(
      0,
      Math.min(items.length, Math.round(Number(value.matched_problem_count) || items.length)),
    ),
    items,
  };
}

export async function analyzeTrainingFilesWithAI(params: {
  title: string;
  subject: string;
  files: AnalyzeFileInput[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되어 있지 않습니다.");
  }

  const content = [
    {
      type: "input_text" as const,
      text: buildTrainingAnalysisUserPrompt({
        title: params.title,
        subject: params.subject,
        maxItems: TRAINING_MAX_ITEMS,
      }),
    },
    ...params.files.map((file) => {
      const dataUrl = `data:${file.mimeType || "application/octet-stream"};base64,${file.base64}`;
      if (file.mimeType.startsWith("image/")) {
        return {
          type: "input_image" as const,
          image_url: dataUrl,
          detail: "auto" as const,
        };
      }

      return {
        type: "input_file" as const,
        file_data: dataUrl,
        filename: `${file.role}-${file.name}`,
      };
    }),
  ];

  const response = await client.responses.create({
    model: TRAINING_MODEL,
    store: false,
    max_output_tokens: 7000,
    input: [
      {
        role: "developer",
        content: [{ type: "input_text", text: buildTrainingAnalysisDeveloperPrompt() }],
      },
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "training_analysis",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  const rawText = extractResponseText(response);
  if (!rawText) {
    const status = String((response as { status?: string }).status ?? "unknown");
    throw new Error(`AI 분석 응답이 비어 있습니다. status=${status}`);
  }

  return {
    result: normalizeAnalysisResult(parseJson<Partial<TrainingAnalysisResult>>(rawText)),
    model: response.model || TRAINING_MODEL,
    promptVersion: TRAINING_PROMPT_VERSION,
  };
}
