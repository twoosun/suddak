import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { READ_DAILY_LIMIT, SOLVE_DAILY_LIMIT } from "@/lib/limits";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ActionType = "read" | "solve";

type SubjectCategory =
  | "highschool_math_1st_year"
  | "math1"
  | "math2"
  | "calculus"
  | "probability_statistics"
  | "geometry";

type DifficultyLevel = "easy" | "medium" | "hard";

type GraphPoint = {
  x: number;
  y: number;
  label: string;
};

type GraphSpec = {
  graph_type: "function" | "points";
  equation: string;
  x_min: number;
  x_max: number;
  y_min: number | null;
  y_max: number | null;
  points: GraphPoint[];
  note: string;
};

type ParsedSolveResult = {
  subject: SubjectCategory;
  subtopic: string;
  confidence: "high" | "medium" | "low";
  difficulty: DifficultyLevel;
  graph_needed: boolean;
  final_answer: string;
  concise_solution: string;
  verification: string;
  caution: string;
  graph_spec: GraphSpec | null;
};

const SUBJECT_LABELS: Record<SubjectCategory, string> = {
  highschool_math_1st_year: "고1 수학",
  math1: "수학 I",
  math2: "수학 II",
  calculus: "미적분",
  probability_statistics: "확률과 통계",
  geometry: "기하",
};

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

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
    .select("is_approved, is_admin")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function checkDailyLimit(userId: string, actionType: ActionType) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", actionType)
    .gte("created_at", start.toISOString());

  if (error) throw error;
  return count ?? 0;
}

async function addUsageLog(userId: string, actionType: ActionType) {
  const { error } = await supabaseAdmin.from("usage_logs").insert({
    user_id: userId,
    action_type: actionType,
  });

  if (error) throw error;
}

async function saveHistory(params: {
  userId: string;
  actionType: ActionType;
  recognizedText?: string;
  solveResult?: string;
}) {
  const { userId, actionType, recognizedText, solveResult } = params;

  const { error } = await supabaseAdmin.from("problem_history").insert({
    user_id: userId,
    action_type: actionType,
    recognized_text: recognizedText ?? null,
    solve_result: solveResult ?? null,
  });

  if (error) throw error;
}

function buildSolveMarkdown(parsed: ParsedSolveResult) {
  const sections = [
    `## 과목 분류\n${SUBJECT_LABELS[parsed.subject]}${parsed.subtopic ? ` · ${parsed.subtopic}` : ""}`,
    `## 최종 답\n${parsed.final_answer}`,
    `## 풀이\n${parsed.concise_solution}`,
    `## 검산\n${parsed.verification}`,
  ];

  if (parsed.caution?.trim()) {
    sections.push(`## 주의\n${parsed.caution}`);
  }

  if (parsed.graph_needed && parsed.graph_spec) {
    const pointText =
      parsed.graph_spec.points.length > 0
        ? parsed.graph_spec.points
            .map((p) => `- ${p.label || `(${p.x}, ${p.y})`} : (${p.x}, ${p.y})`)
            .join("\n")
        : "- 없음";

    sections.push(
      [
        "## 그래프 정보",
        `- 유형: ${parsed.graph_spec.graph_type}`,
        `- 식: ${parsed.graph_spec.equation}`,
        `- x 범위: ${parsed.graph_spec.x_min} ~ ${parsed.graph_spec.x_max}`,
        `- y 범위: ${
          parsed.graph_spec.y_min === null || parsed.graph_spec.y_max === null
            ? "자동"
            : `${parsed.graph_spec.y_min} ~ ${parsed.graph_spec.y_max}`
        }`,
        `- 핵심 점:\n${pointText}`,
        parsed.graph_spec.note ? `- 설명: ${parsed.graph_spec.note}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return sections.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);

    if (!profile?.is_approved) {
      return NextResponse.json(
        { error: "관리자 승인 후 이용 가능합니다." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const mode = String(formData.get("mode") || "");

    if (mode === "read") {
      if (!profile.is_admin) {
        const usedReadToday = await checkDailyLimit(user.id, "read");

        if (usedReadToday >= READ_DAILY_LIMIT) {
          return NextResponse.json(
            {
              error: `오늘 문제 인식 횟수를 모두 썼습니다. (하루 ${READ_DAILY_LIMIT}회)`,
            },
            { status: 429 }
          );
        }
      }

      const image = formData.get("image");

      if (!image || !(image instanceof File)) {
        return NextResponse.json(
          { error: "이미지 파일이 없습니다." },
          { status: 400 }
        );
      }

      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = image.type || "image/jpeg";

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        max_output_tokens: 500,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
이 이미지는 한국 고등학교 수학 문제다.

할 일:
1. 문제를 최대한 정확히 읽어라.
2. 풀이하지 마라.
3. 정답을 추측하지 마라.
4. 사람이 읽기 좋은 형태로 정리하라.

출력 형식:
## 인식한 문제
(문제 원문)

## 불확실
(헷갈리는 기호나 잘 안 보이는 부분. 없으면 "없음")

규칙:
- 수식은 Markdown LaTeX 형식으로 써라.
- 인라인 수식은 $...$, 블록 수식은 $$...$$ 사용.
- \\( \\), \\[ \\], \\begin, \\end 는 쓰지 마라.
- 보이지 않는 기호는 추정하지 마라.
                `.trim(),
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64}`,
                detail: "auto",
              },
            ],
          },
        ],
      });

      const result = response.output_text || "응답이 비어 있습니다.";

      await addUsageLog(user.id, "read");
      await saveHistory({
        userId: user.id,
        actionType: "read",
        recognizedText: result,
      });

      return NextResponse.json({
        result,
        meta: {
          model: response.model,
        },
      });
    }

    if (mode === "solve") {
      if (!profile.is_admin) {
        const usedSolveToday = await checkDailyLimit(user.id, "solve");

        if (usedSolveToday >= SOLVE_DAILY_LIMIT) {
          return NextResponse.json(
            {
              error: `오늘 풀이 횟수를 모두 썼습니다. (하루 ${SOLVE_DAILY_LIMIT}회)`,
            },
            { status: 429 }
          );
        }
      }

      const recognizedProblem = String(formData.get("recognizedProblem") || "");
      const graphRequested =
        profile.is_admin &&
        String(formData.get("includeGraph") || "false") === "true";

      if (!recognizedProblem.trim()) {
        return NextResponse.json(
          { error: "인식된 문제 텍스트가 없습니다." },
          { status: 400 }
        );
      }

      const solveModel = profile.is_admin ? "gpt-5.4-mini" : "gpt-4o-mini";
      const solveMaxTokens = profile.is_admin ? 1200 : 800;

      const response = await client.responses.create({
        model: solveModel,
        reasoning: profile.is_admin ? { effort: "medium" } : undefined,
        max_output_tokens: solveMaxTokens,
        store: false,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: `
Formatting re-enabled

너는 대한민국 고등학교 수학 문제 풀이 엔진이다.

반드시 지킬 규칙:
- 문제를 먼저 과목별로 분류하라.
- 과목은 반드시 다음 6개 중 하나만 선택하라:
  1) highschool_math_1st_year
  2) math1
  3) math2
  4) calculus
  5) probability_statistics
  6) geometry
- 세부 단원도 함께 추정하라.
- 한국 고등학교 교육과정 범위 안에서만 풀어라.
- 상위 과목 개념을 함부로 끌어오지 마라.
- 조건을 누락하지 마라.
- 최종 답은 분명하게 써라.
- 장황하게 쓰지 말고 핵심 계산이 실제로 보이게 써라.
- 마지막에 검산 또는 핵심 확인을 반드시 넣어라.

그래프 규칙:
- 그래프는 정말 필요한 경우에만 graph_needed를 true로 하라.
- 그래프 요청이 허용되지 않으면 graph_needed는 false여야 한다.
- 그래프가 필요한 경우에도 고등학교 함수/좌표 수준에서 해석 가능한 간단한 spec만 생성하라.
- graph_type은 "function" 또는 "points"만 사용하라.
- 식은 사람이 읽을 수 있는 문자열로 써라. 예: y = x^2 - 4x + 3
- 핵심 점이 있으면 points에 넣어라.
- 그래프가 필요 없으면 graph_spec은 null로 하라.

출력 규칙:
- 수식은 Markdown LaTeX 형식으로 써라.
- 인라인 수식은 $...$, 블록 수식은 $$...$$ 사용.
- \\( \\), \\[ \\], \\begin, \\end 는 쓰지 마라.
- 불확실한 부분은 caution에 솔직히 적어라.

현재 그래프 허용 여부:
${graphRequested ? "허용됨" : "허용되지 않음"}
                `.trim(),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
[문제]
${recognizedProblem}

[할 일]
1. 이 문제를 과목 분류하라.
2. 세부 단원을 짧게 추정하라.
3. 한국 고등학교 교육과정 안에서 풀이하라.
4. 최종 답을 명확히 제시하라.
5. 핵심 풀이를 짧지만 실제 계산이 보이게 써라.
6. 마지막에 검산 또는 핵심 확인을 하라.
7. 그래프는 꼭 필요한 경우에만 생성하라.
                `.trim(),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "suddak_math_solution",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                subject: {
                  type: "string",
                  enum: [
                    "highschool_math_1st_year",
                    "math1",
                    "math2",
                    "calculus",
                    "probability_statistics",
                    "geometry",
                  ],
                },
                subtopic: {
                  type: "string",
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                },
                graph_needed: {
                  type: "boolean",
                },
                final_answer: {
                  type: "string",
                },
                concise_solution: {
                  type: "string",
                },
                verification: {
                  type: "string",
                },
                caution: {
                  type: "string",
                },
                graph_spec: {
                  anyOf: [
                    {
                      type: "null",
                    },
                    {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        graph_type: {
                          type: "string",
                          enum: ["function", "points"],
                        },
                        equation: {
                          type: "string",
                        },
                        x_min: {
                          type: "number",
                        },
                        x_max: {
                          type: "number",
                        },
                        y_min: {
                          anyOf: [{ type: "number" }, { type: "null" }],
                        },
                        y_max: {
                          anyOf: [{ type: "number" }, { type: "null" }],
                        },
                        points: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              x: { type: "number" },
                              y: { type: "number" },
                              label: { type: "string" },
                            },
                            required: ["x", "y", "label"],
                          },
                        },
                        note: {
                          type: "string",
                        },
                      },
                      required: [
                        "graph_type",
                        "equation",
                        "x_min",
                        "x_max",
                        "y_min",
                        "y_max",
                        "points",
                        "note",
                      ],
                    },
                  ],
                },
              },
              required: [
                "subject",
                "subtopic",
                "confidence",
                "difficulty",
                "graph_needed",
                "final_answer",
                "concise_solution",
                "verification",
                "caution",
                "graph_spec",
              ],
            },
          },
        },
      });

     const rawText = response.output_text || "";

let parsed: ParsedSolveResult | null = null;

try {
  parsed = JSON.parse(rawText) as ParsedSolveResult;
} catch {
  return NextResponse.json(
    {
      error: "풀이 결과를 JSON으로 해석하지 못했습니다.",
      raw: rawText,
    },
    { status: 500 }
  );
}

if (!parsed) {
  return NextResponse.json(
    { error: "풀이 결과를 구조화하지 못했습니다." },
    { status: 500 }
  );
}

      const normalizedGraphNeeded =
        graphRequested && parsed.graph_needed && parsed.graph_spec !== null;

      const normalizedParsed: ParsedSolveResult = {
        ...parsed,
        graph_needed: normalizedGraphNeeded,
        graph_spec: normalizedGraphNeeded ? parsed.graph_spec : null,
      };

      const result = buildSolveMarkdown(normalizedParsed);

      await addUsageLog(user.id, "solve");
      await saveHistory({
        userId: user.id,
        actionType: "solve",
        recognizedText: recognizedProblem,
        solveResult: result,
      });

      return NextResponse.json({
        result,
        meta: {
          model: response.model,
          subject: normalizedParsed.subject,
          subjectLabel: SUBJECT_LABELS[normalizedParsed.subject],
          subtopic: normalizedParsed.subtopic,
          confidence: normalizedParsed.confidence,
          difficulty: normalizedParsed.difficulty,
          graphRequested,
          graphNeeded: normalizedParsed.graph_needed,
          isAdminModel: profile.is_admin,
        },
        graph: normalizedParsed.graph_spec,
      });
    }

    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버에서 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}