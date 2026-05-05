import OpenAI from "openai";

import type {
  BlueprintItem,
  DifficultyLevel,
  ExamBlueprint,
  ProblemFormat,
  ReferenceAnalysisResult,
  ReferenceFileKind,
  TransformStrength,
} from "./types";
import { analyzeReferenceFile, createInitialBlueprint } from "./utils";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AnalyzeFileInput = {
  id: string;
  name: string;
  kind: ReferenceFileKind;
  mimeType: string;
  size: number;
  base64: string;
};

type AiAnalysisResult = {
  analysis: ReferenceAnalysisResult;
  blueprint: ExamBlueprint;
};

const difficultyValues: DifficultyLevel[] = ["기본", "중간", "상", "고난도"];
const transformValues: TransformStrength[] = ["낮음", "중간", "높음"];
const formatValues: ProblemFormat[] = ["객관식", "서술형"];

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["analysis", "blueprint"],
  properties: {
    analysis: {
      type: "object",
      additionalProperties: false,
      required: [
        "detectedSubject",
        "majorUnits",
        "detectedProblemCount",
        "majorTypes",
        "examPoints",
        "difficultyDistribution",
        "transformablePoints",
        "sourceRange",
        "sourceReferences",
      ],
      properties: {
        detectedSubject: { type: "string" },
        majorUnits: { type: "array", items: { type: "string" } },
        detectedProblemCount: { type: "number" },
        majorTypes: { type: "array", items: { type: "string" } },
        examPoints: { type: "array", items: { type: "string" } },
        difficultyDistribution: {
          type: "object",
          additionalProperties: false,
          required: difficultyValues,
          properties: {
            기본: { type: "number" },
            중간: { type: "number" },
            상: { type: "number" },
            고난도: { type: "number" },
          },
        },
        transformablePoints: { type: "array", items: { type: "string" } },
        sourceRange: { type: "string" },
        sourceReferences: { type: "array", items: { type: "string" } },
      },
    },
    blueprint: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "subject",
        "totalProblems",
        "multipleChoiceCount",
        "writtenCount",
        "overallDifficulty",
        "overallTransformStrength",
        "examMinutes",
        "sourceRange",
        "referenceSummary",
        "items",
      ],
      properties: {
        title: { type: "string" },
        subject: { type: "string" },
        totalProblems: { type: "number" },
        multipleChoiceCount: { type: "number" },
        writtenCount: { type: "number" },
        overallDifficulty: { type: "string", enum: difficultyValues },
        overallTransformStrength: { type: "string", enum: transformValues },
        examMinutes: { type: "number" },
        sourceRange: { type: "string" },
        referenceSummary: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "number",
              "format",
              "referenceLocation",
              "topic",
              "problemType",
              "score",
              "difficulty",
              "transformStrength",
              "intent",
            ],
            properties: {
              id: { type: "string" },
              number: { type: "number" },
              format: { type: "string", enum: formatValues },
              referenceLocation: { type: "string" },
              topic: { type: "string" },
              problemType: { type: "string" },
              score: { type: "number" },
              difficulty: { type: "string", enum: difficultyValues },
              transformStrength: { type: "string", enum: transformValues },
              intent: { type: "string" },
            },
          },
        },
      },
    },
  },
};

function coerceDifficulty(value: unknown): DifficultyLevel {
  return difficultyValues.includes(value as DifficultyLevel)
    ? (value as DifficultyLevel)
    : "중간";
}

function coerceTransform(value: unknown): TransformStrength {
  return transformValues.includes(value as TransformStrength)
    ? (value as TransformStrength)
    : "높음";
}

function coerceFormat(value: unknown): ProblemFormat {
  return value === "서술형" ? "서술형" : "객관식";
}

function normalizeItems(items: BlueprintItem[], totalProblems: number) {
  return items.slice(0, totalProblems).map((item, index) => ({
    ...item,
    id: item.id || `item-${index + 1}`,
    number: index + 1,
    format: coerceFormat(item.format),
    referenceLocation: String(item.referenceLocation || `업로드 자료 ${index + 1} p.${index + 1} 문항 ${index + 1}`),
    topic: String(item.topic || "핵심 개념"),
    problemType: String(item.problemType || "내신형"),
    score: Number.isFinite(Number(item.score)) ? Number(Number(item.score).toFixed(1)) : 4,
    difficulty: coerceDifficulty(item.difficulty),
    transformStrength: coerceTransform(item.transformStrength),
    intent: String(item.intent || "참고 자료의 풀이 구조를 새 조건으로 재구성합니다."),
  }));
}

function normalizeAiResult(value: AiAnalysisResult): AiAnalysisResult {
  const totalProblems = Math.max(1, Math.min(40, Math.round(value.blueprint.totalProblems || 20)));
  const items = normalizeItems(value.blueprint.items || [], totalProblems);
  const multipleChoiceCount = items.filter((item) => item.format === "객관식").length;
  const writtenCount = items.filter((item) => item.format === "서술형").length;

  return {
    analysis: {
      detectedSubject: String(value.analysis.detectedSubject || "수학"),
      majorUnits: value.analysis.majorUnits?.length ? value.analysis.majorUnits : ["내신 대비"],
      detectedProblemCount: Math.max(1, Math.round(value.analysis.detectedProblemCount || items.length)),
      majorTypes: value.analysis.majorTypes?.length ? value.analysis.majorTypes : ["내신형"],
      examPoints: value.analysis.examPoints?.length
        ? value.analysis.examPoints
        : ["참고 자료의 유형과 풀이 구조를 분석했습니다."],
      difficultyDistribution: {
        기본: Number(value.analysis.difficultyDistribution?.기본 ?? 0),
        중간: Number(value.analysis.difficultyDistribution?.중간 ?? 0),
        상: Number(value.analysis.difficultyDistribution?.상 ?? 0),
        고난도: Number(value.analysis.difficultyDistribution?.고난도 ?? 0),
      },
      transformablePoints: value.analysis.transformablePoints?.length
        ? value.analysis.transformablePoints
        : ["문장, 수치, 조건 배열을 새롭게 재구성합니다."],
      sourceRange: String(value.analysis.sourceRange || value.blueprint.sourceRange || ""),
      sourceReferences: value.analysis.sourceReferences?.length
        ? value.analysis.sourceReferences
        : items.map((item) => item.referenceLocation),
    },
    blueprint: {
      ...value.blueprint,
      title: String(value.blueprint.title || "내신딱딱 예상기출"),
      subject: String(value.blueprint.subject || value.analysis.detectedSubject || "수학"),
      totalProblems: items.length,
      multipleChoiceCount,
      writtenCount,
      overallDifficulty: coerceDifficulty(value.blueprint.overallDifficulty),
      overallTransformStrength: coerceTransform(value.blueprint.overallTransformStrength),
      examMinutes: Math.max(10, Math.round(value.blueprint.examMinutes || 50)),
      sourceRange: String(value.blueprint.sourceRange || value.analysis.sourceRange || ""),
      referenceSummary: String(value.blueprint.referenceSummary || "업로드 참고 자료 분석"),
      items,
    },
  };
}

function buildFallback(files: AnalyzeFileInput[]): AiAnalysisResult {
  const referenceFiles = files.map((file) => ({
    id: file.id,
    name: file.name,
    kind: file.kind,
    sizeLabel: `${Math.max(1, Math.round(file.size / 1024))}KB`,
    status: "분석 완료" as const,
  }));
  const analysis = analyzeReferenceFile(referenceFiles);
  return { analysis, blueprint: createInitialBlueprint(analysis) };
}

export async function analyzeReferenceFilesWithAI(
  files: AnalyzeFileInput[]
): Promise<AiAnalysisResult> {
  if (!process.env.OPENAI_API_KEY || files.length === 0) {
    return buildFallback(files);
  }

  const content = [
    {
      type: "input_text" as const,
      text: [
        "업로드된 내신 대비 참고 자료를 분석해서 출제 분석 결과와 출제 설계표 초안을 만들어라.",
        "중요 원칙:",
        "- 100% 동일하게 생성하는 것은 금지한다. 다만 동형문항의 의의상 원본과 유사할 수 있고, 풀이 구조와 난도는 유사하게 유지해야 한다.",
        "- 숫자만 바꾼 변형이 아니라 같은 개념과 풀이 아이디어를 새 문항으로 재구성해야 한다.",
        "- 참고 위치는 반드시 '업로드 자료 [파일명] p.[쪽번호] 문항 [번호]' 형태로 작성한다.",
        "- 쪽번호나 문항번호를 확정할 수 없으면 추정값을 쓰되 'p.추정' 또는 '문항 추정'처럼 표시한다.",
        "- blueprint.items 개수는 blueprint.totalProblems와 같아야 한다.",
        "- 객관식 문항 수와 서술형 문항 수의 합은 totalProblems와 같아야 한다.",
        "- 배점은 소수 한 자리까지 허용한다.",
        "",
        "파일 목록:",
        files.map((file, index) => `${index + 1}. ${file.name} (${file.kind}, ${file.mimeType})`).join("\n"),
      ].join("\n"),
    },
    ...files.slice(0, 8).map((file) => {
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
  ];

  const response = await client.responses.create({
    model: process.env.EXAM_BUILDER_ANALYSIS_MODEL || "gpt-4.1-mini",
    store: false,
    max_output_tokens: 6000,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: "너는 한국 고등학교 수학 내신 시험지 제작 전문가다. 반드시 제공된 JSON Schema에 맞춰 한국어로만 응답한다.",
          },
        ],
      },
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "exam_builder_analysis",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  const rawText = response.output_text || "";
  if (!rawText.trim()) return buildFallback(files);

  return normalizeAiResult(JSON.parse(rawText) as AiAnalysisResult);
}
