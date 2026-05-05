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
  sourceEvidence: string;
  sourceUsage: string;
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

export type GenerationSeed = {
  id: string;
  subject?: string | null;
  unit?: string | null;
  difficulty?: number | null;
  core_concepts?: string[] | null;
  key_idea?: string | null;
  solution_strategy?: string | null;
  trap_point?: string | null;
  common_mistake?: string | null;
  variation_points?: string[] | null;
  similar_problem_seed?: string | null;
  abstraction_summary?: string | null;
  solver_hint?: string | null;
  generation_instruction?: string | null;
};

const generatedProblemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "problemText", "answer", "solution", "sourceEvidence", "sourceUsage"],
        properties: {
          number: { type: "number" },
          problemText: { type: "string" },
          answer: { type: "string" },
          solution: { type: "string" },
          sourceEvidence: { type: "string" },
          sourceUsage: { type: "string" },
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
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?rac(?=\s*\{)/g, "$1\\frac")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?sqrt(?=\s*\{)/g, "$1\\sqrt")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?left\b/g, "$1\\left")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?right\b/g, "$1\\right")
    .replace(/(^|[^\\a-zA-Z])(?:\?|\uFFFD)?cdot\b/g, "$1\\cdot")
    .trim();
}

function hasEnoughGeneratedContent(item: GeneratedProblemItem) {
  const problemText = normalizeMathText(item.problemText || "");
  const answer = normalizeMathText(item.answer || "");
  const solution = normalizeMathText(item.solution || "");

  return problemText.length >= 30 && answer.length > 0 && solution.length >= 20;
}

function hasSourceEvidence(item: GeneratedProblemItem, referenceFiles: GenerationReferenceFile[]) {
  const evidence = `${item.sourceEvidence || ""}\n${item.sourceUsage || ""}`.trim();
  if (evidence.length < 30) return false;

  const negativePatterns = [
    /확인\s*못/u,
    /찾지\s*못/u,
    /참고하지\s*않/u,
    /자료\s*없/u,
    /not\s+found/i,
    /not\s+used/i,
    /unable/i,
  ];
  if (negativePatterns.some((pattern) => pattern.test(evidence))) return false;

  const referencesUpload =
    /업로드|원본|자료|파일|문항|발문|수식|조건|그림|도표|그래프|보기/u.test(evidence);
  const referencesFileName = referenceFiles.some((file) => {
    const stem = file.name.replace(/\.[^.]+$/u, "").slice(0, 20);
    return stem.length >= 3 && evidence.includes(stem);
  });

  return referencesUpload || referencesFileName;
}

function assertGeneratedItem(
  item: GeneratedProblemItem | undefined,
  number: number,
  referenceFiles: GenerationReferenceFile[],
): asserts item is GeneratedProblemItem {
  if (!item || !hasEnoughGeneratedContent(item)) {
    throw new Error(`${number}번 문항 생성 결과가 충분하지 않습니다. 원본 자료 기반 생성이 중단되었습니다.`);
  }

  if (!hasSourceEvidence(item, referenceFiles)) {
    throw new Error(`${number}번 문항이 업로드 자료를 실제로 확인했다는 근거가 없어 생성을 중단했습니다.`);
  }
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

function pickRelevantSeeds(item: BlueprintItem, seeds: GenerationSeed[]) {
  const topic = `${item.topic} ${item.problemType}`.toLowerCase();
  const scored = seeds.map((seed) => {
    const seedText = [
      seed.subject,
      seed.unit,
      seed.core_concepts?.join(" "),
      seed.key_idea,
      seed.similar_problem_seed,
      seed.abstraction_summary,
      seed.generation_instruction,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const score = topic
      .split(/\s+/)
      .filter((word) => word.length >= 2 && seedText.includes(word)).length;
    return { seed, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ seed }) => seed);
}

export async function generateProblemsWithAI(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  referenceFiles: GenerationReferenceFile[] = [],
  trainingSeeds: GenerationSeed[] = [],
  onProgress?: (event: GenerationProgressEvent) => Promise<void>,
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 없어 원본 자료 기반 문항 생성을 진행할 수 없습니다.");
  }

  if (referenceFiles.length === 0) {
    throw new Error("업로드 원본 자료를 찾지 못했습니다. 참고 파일을 먼저 업로드한 뒤 다시 생성해 주세요.");
  }

  await onProgress?.({ progress: 23, step: "references:files" });
  await onProgress?.({ progress: 25, step: `references:seeds:${trainingSeeds.length}` });

  const generatedItems: GeneratedProblemItem[] = [];
  const totalItems = Math.max(1, blueprint.items.length);

  for (const [index, item] of blueprint.items.entries()) {
    const startProgress = 25 + Math.floor((index / totalItems) * 45);
    const relevantSeeds = pickRelevantSeeds(item, trainingSeeds);
    await onProgress?.({ progress: startProgress, step: `draft:${item.number}` });

    const response = await client.responses.create({
      model: process.env.EXAM_BUILDER_GENERATION_MODEL || "gpt-4.1",
      store: false,
      max_output_tokens: 5200,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "너는 한국 고등학교 수학 내신 동형문항 출제자다.",
                "업로드 자료는 절대적인 1순위 근거다. 업로드 자료를 실제로 확인하지 못하면 문항을 생성하지 말고 sourceEvidence에 확인 실패를 명시하라.",
                "딱씨앗 seed는 보조 참고자료일 뿐이며, 업로드 자료와 충돌하면 반드시 업로드 자료를 우선한다.",
                "각 문항 생성 전에 referenceLocation과 가장 가까운 업로드 원본 문항을 찾아라.",
                "원본 문항의 발문, 수식, 조건, 주어진 정보, 그림, 도표, 그래프, 좌표축, 범례, 보기 개수, 선택지 구조, 풀이 단계, 난도, 정답 도출 흐름을 확인하라.",
                "100% 동일하게 생성하는 것은 금지한다. 다만 유사문항의 의의는 유사도를 유지하는 데 있으므로 유형, 풀이 구조, 난도, 정답 도출 흐름은 원본과 유사할 수 있고 유사해야 한다.",
                "바꿀 수 있는 것은 핵심 수치 일부, 문자 이름, 상수, 함수 이름, 맥락 표현, 조건 배열의 일부다. 유형이나 풀이 구조가 달라지면 실패다.",
                "원본이 5지선다이면 반드시 ①②③④⑤ 선택지를 모두 포함하라. 서술형이면 채점 가능한 단계형 조건과 답안을 포함하라.",
                "수식은 Markdown LaTeX로 작성하라. 인라인은 $...$, 블록은 $$...$$만 사용하고, \\frac, \\sqrt 같은 명령 앞의 역슬래시를 절대 빠뜨리지 마라.",
                "문항 본문에는 참고 위치, 업로드 자료명, 생성 지시문을 쓰지 마라.",
                "반환 JSON에는 sourceEvidence와 sourceUsage를 반드시 채워라. sourceEvidence에는 업로드 자료에서 확인한 원본 문항의 발문/수식/조건/그림/보기 중 실제 근거를 요약하고, sourceUsage에는 그 근거를 새 문항에 어떻게 반영했는지 설명하라.",
                "sourceEvidence/sourceUsage는 검증용 내부 필드이며 학생용 문제 본문에는 노출하지 않는다.",
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
                  "업로드 원본 자료를 확인하지 못한 상태에서 일반적인 문제를 생성하면 실패다. 업로드 자료의 실제 발문, 수식, 조건, 정보, 그림/도표/그래프, 보기 구조를 근거로 삼아 동형문항을 만들고, sourceEvidence/sourceUsage에 그 근거를 구체적으로 적어라. 100% 동일하게 만들지는 말고 유사도와 풀이 구조는 유지한다.",
                uploadedReferenceFiles: referenceFiles.map((file) => ({
                  name: file.name,
                  kind: file.kind,
                  mimeType: file.mimeType,
                })),
                analysis,
                approvedTrainingSeeds: relevantSeeds,
                blueprint: {
                  title: blueprint.title,
                  subject: blueprint.subject,
                  sourceRange: blueprint.sourceRange,
                  referenceSummary: blueprint.referenceSummary,
                  item: {
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
                },
              }),
            },
            ...referenceFiles.slice(0, 8).map((file) => {
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
                filename: file.name,
              };
            }),
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
    if (!rawText.trim()) {
      throw new Error(`${item.number}번 문항 생성 응답이 비어 있습니다.`);
    }

    const parsed = JSON.parse(rawText) as GeneratedProblemResponse;
    const generatedItem = parsed.items?.find((entry) => Math.round(entry.number) === item.number);
    assertGeneratedItem(generatedItem, item.number, referenceFiles);
    generatedItems.push(generatedItem);

    await onProgress?.({
      progress: 25 + Math.floor(((index + 1) / totalItems) * 45),
      step: `check:${item.number}`,
    });
  }

  if (generatedItems.length !== blueprint.items.length) {
    throw new Error("일부 문항이 생성되지 않아 파일 생성을 중단했습니다.");
  }

  await onProgress?.({ progress: 72, step: "solution" });
  return mergeGeneratedItems(blueprint, generatedItems);
}
