import OpenAI from "openai";

import type { BlueprintItem, ExamBlueprint, ReferenceAnalysisResult } from "./types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type GeneratedProblemItem = {
  number: number;
  problemText: string;
  answer: string;
  solution: string;
};

type GeneratedProblemResponse = {
  items: GeneratedProblemItem[];
};

const generatedProblemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "problemText", "answer", "solution"],
        properties: {
          number: { type: "number" },
          problemText: { type: "string" },
          answer: { type: "string" },
          solution: { type: "string" },
        },
      },
    },
  },
};

function fallbackProblem(item: BlueprintItem) {
  const baseCondition =
    item.difficulty === "고난도"
      ? "매개변수 조건을 추가하여 가능한 값을 모두 구하여라."
      : item.difficulty === "상"
        ? "두 조건을 동시에 만족하는 값을 구하여라."
        : "기본 개념을 적용하여 값을 구하여라.";

  return {
    problemText: `${item.topic} 단원의 ${item.problemType} 문항이다. 참고 위치 ${item.referenceLocation}의 풀이 아이디어를 직접 복제하지 말고, 새 조건으로 ${baseCondition}`,
    answer: "생성 엔진 검토 필요",
    solution: `${item.intent} 실제 배포 전 수치와 조건을 한 번 더 검산하세요.`,
  };
}

function mergeGeneratedItems(blueprint: ExamBlueprint, generated: GeneratedProblemItem[]) {
  const byNumber = new Map(generated.map((item) => [Math.round(item.number), item]));

  return {
    ...blueprint,
    items: blueprint.items.map((item) => {
      const generatedItem = byNumber.get(item.number);
      const fallback = fallbackProblem(item);

      return {
        ...item,
        problemText: generatedItem?.problemText?.trim() || fallback.problemText,
        answer: generatedItem?.answer?.trim() || fallback.answer,
        solution: generatedItem?.solution?.trim() || fallback.solution,
      };
    }),
  };
}

export async function generateProblemsWithAI(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult
) {
  if (!process.env.OPENAI_API_KEY) {
    return mergeGeneratedItems(blueprint, []);
  }

  try {
    const response = await client.responses.create({
      model: process.env.EXAM_BUILDER_GENERATION_MODEL || "gpt-4.1-mini",
      store: false,
      max_output_tokens: Math.min(16000, Math.max(5000, blueprint.items.length * 700)),
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 고등학교 수학 내신 변형문항 출제자다.",
                "원자료 문장, 숫자, 조건 배열, 선지 표현을 직접 복제하지 않는다.",
                "각 설계표 행마다 실제 학생에게 제시할 수 있는 한국어 문제, 정답, 풀이를 만든다.",
                "수식은 일반 텍스트와 LaTeX를 섞어도 되지만, 문제/정답/풀이가 자체적으로 이해 가능해야 한다.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                analysis,
                blueprint: {
                  title: blueprint.title,
                  subject: blueprint.subject,
                  sourceRange: blueprint.sourceRange,
                  referenceSummary: blueprint.referenceSummary,
                  items: blueprint.items.map((item) => ({
                    number: item.number,
                    format: item.format,
                    referenceLocation: item.referenceLocation,
                    topic: item.topic,
                    problemType: item.problemType,
                    score: item.score,
                    difficulty: item.difficulty,
                    transformStrength: item.transformStrength,
                    intent: item.intent,
                  })),
                },
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "exam_builder_generated_problems",
          strict: true,
          schema: generatedProblemSchema,
        },
      },
    });

    const rawText = response.output_text || "";
    if (!rawText.trim()) return mergeGeneratedItems(blueprint, []);

    const parsed = JSON.parse(rawText) as GeneratedProblemResponse;
    return mergeGeneratedItems(blueprint, parsed.items || []);
  } catch {
    return mergeGeneratedItems(blueprint, []);
  }
}
