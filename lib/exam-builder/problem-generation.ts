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

export type GenerationProgressEvent = {
  progress: number;
  step: string;
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
  return {
    problemText:
      item.problemText ||
      `${item.number}. ${item.topic} 단원의 ${item.problemType} 문항입니다. 원본 문항의 조건 배열과 풀이 구조를 유지해 다시 생성해야 합니다.`,
    answer: "정답 생성 필요",
    solution: item.intent || "원본 문항의 풀이 구조를 기준으로 해설을 작성해야 합니다.",
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
  referenceFiles: GenerationReferenceFile[] = [],
  onProgress?: (event: GenerationProgressEvent) => Promise<void>,
) {
  if (!process.env.OPENAI_API_KEY) {
    return mergeGeneratedItems(blueprint, []);
  }

  try {
    await onProgress?.({ progress: 25, step: "draft" });

    const generatedItems: GeneratedProblemItem[] = [];
    const totalItems = Math.max(1, blueprint.items.length);

    for (const [index, item] of blueprint.items.entries()) {
      const startProgress = 25 + Math.floor((index / totalItems) * 45);
      await onProgress?.({ progress: startProgress, step: `draft:${item.number}` });

      const response = await client.responses.create({
      model: process.env.EXAM_BUILDER_GENERATION_MODEL || "gpt-4.1",
      store: false,
      max_output_tokens: 5000,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 고등학교 수학 내신 동형문항 출제자다.",
                "목표는 창작형 변형이 아니라 원본과 거의 같은 동형문항이다.",
                "첨부 원자료에서 각 referenceLocation에 해당하는 원본 문항을 찾아, 문항 골격을 99%에 가깝게 유지하라.",
                "유지해야 할 것: 발문 방식, 조건 제시 순서, 보기/선택지 개수, 풀이 단계 수, 계산량, 함정, 난도, 정답 도출 구조.",
                "바꿀 수 있는 것: 핵심 수치 일부, 문자 이름, 상수, 함수 이름, 맥락 표현. 단, 풀이 구조가 달라질 정도로 바꾸면 안 된다.",
                "원본이 수열 극한이면 수열 극한으로, 원본이 함수 극한이면 함수 극한으로, 원본이 미적분 그래프 추론이면 같은 유형으로 유지하라.",
                "문항이 5지선다이면 반드시 ①②③④⑤ 선택지를 모두 포함하라.",
                "서술형이면 원본과 같은 단계의 조건과 채점 가능한 답 형태를 유지하라.",
                "수식은 Markdown LaTeX로 작성하되 깨진 명령을 만들지 마라. 인라인은 $...$, 블록은 $$...$$만 사용하라.",
                "문항 본문에는 참고 위치, 업로드 자료명, 생성 지시문을 쓰지 마라.",
                "각 문항은 실제 학생에게 그대로 제시할 수 있는 완성 문항이어야 한다.",
                "이번 호출에서는 요청된 단 하나의 문항만 만든다.",
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
                  "첨부 원자료를 최우선으로 읽고, 설계표의 각 referenceLocation과 가장 가까운 원본 문항을 기준으로 동형문항을 만든다. 추상적인 새 문제로 바꾸지 말고 원본 문항의 배열과 풀이 구조를 거의 그대로 유지한다.",
                analysis,
                blueprint: {
                  title: blueprint.title,
                  subject: blueprint.subject,
                  sourceRange: blueprint.sourceRange,
                  referenceSummary: blueprint.referenceSummary,
                  items: [
                    {
                    number: item.number,
                    format: item.format,
                    referenceLocation: item.referenceLocation,
                    topic: item.topic,
                    problemType: item.problemType,
                    score: item.score,
                    difficulty: item.difficulty,
                    transformStrength: item.transformStrength,
                    intent: item.intent,
                    },
                  ],
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
      if (rawText.trim()) {
        const parsed = JSON.parse(rawText) as GeneratedProblemResponse;
        const generatedItem = parsed.items?.find((entry) => Math.round(entry.number) === item.number);
        if (generatedItem) generatedItems.push(generatedItem);
      }

      await onProgress?.({
        progress: 25 + Math.floor(((index + 1) / totalItems) * 45),
        step: `check:${item.number}`,
      });
    }

    await onProgress?.({ progress: 72, step: "solution" });
    return mergeGeneratedItems(blueprint, generatedItems);
  } catch {
    return mergeGeneratedItems(blueprint, []);
  }
}
