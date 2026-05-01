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

export type GenerationReferenceFile = {
  name: string;
  kind: string;
  mimeType: string;
  base64: string;
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
      ? "서로 다른 두 조건을 결합한 매개변수 상황에서 가능한 값을 모두 구하여라."
      : item.difficulty === "상"
        ? "그래프와 식의 조건을 동시에 만족하는 값을 구하여라."
        : "새롭게 제시된 조건에 맞게 값을 구하여라.";

  return {
    problemText: `${item.topic} 단원의 ${item.problemType} 문항이다. 원자료와 다른 상황, 다른 수치, 다른 조건 배열을 사용하여 ${baseCondition}`,
    answer: "생성 엔진 검토 필요",
    solution: `${item.intent} 실제 배포 전 수치와 조건을 한 번 더 검산하세요.`,
  };
}

function normalizeMathText(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
        problemText: normalizeMathText(generatedItem?.problemText?.trim() || fallback.problemText),
        answer: normalizeMathText(generatedItem?.answer?.trim() || fallback.answer),
        solution: normalizeMathText(generatedItem?.solution?.trim() || fallback.solution),
      };
    }),
  };
}

export async function generateProblemsWithAI(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  referenceFiles: GenerationReferenceFile[] = []
) {
  if (!process.env.OPENAI_API_KEY) {
    return mergeGeneratedItems(blueprint, []);
  }

  try {
    const response = await client.responses.create({
      model: process.env.EXAM_BUILDER_GENERATION_MODEL || "gpt-4.1-mini",
      store: false,
      max_output_tokens: Math.min(24000, Math.max(7000, blueprint.items.length * 900)),
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 고등학교 수학 내신 변형문항 출제자다.",
                "원자료 문장, 숫자, 조건 배열, 선지 표현을 직접 복제하지 않는다.",
                "변형 수준은 높음이다. 원자료의 난도, 풀이 단계 수, 함정, 계산량은 최대한 유지한다.",
                "똑같이는 금지지만, 출제 의도와 해결 구조는 유사해야 한다. 쉬운 개념 확인형으로 낮추지 않는다.",
                "원자료가 4점/고난도형이면 새 문항도 조건 해석, 식 세우기, 케이스 분류, 검산 중 2개 이상을 요구해야 한다.",
                "문항 본문에는 참고 위치, 업로드 자료명, 원자료라는 말을 쓰지 않는다.",
                "수식은 가능하면 LaTeX 인라인 수식 $...$로 작성한다. 분수, 극한, 루트, 지수는 LaTeX를 써도 된다.",
                "각 설계표 행마다 실제 학생에게 제시할 수 있는 한국어 문제, 정답, 풀이를 만든다.",
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
                instruction:
                  "첨부된 원자료를 우선 참고하라. 각 문항은 설계표의 referenceLocation에 해당하는 원문 문항과 난도/풀이구조가 비슷하되 문장과 수치와 조건은 새로 구성한다.",
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
            ...referenceFiles.slice(0, 8).map((file) => ({
              type: "input_file" as const,
              file_data: `data:${file.mimeType || "application/octet-stream"};base64,${file.base64}`,
              filename: file.name,
            })),
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
