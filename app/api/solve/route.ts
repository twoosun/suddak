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

type StrategyType =
  | "algebraic"
  | "graphical"
  | "geometric"
  | "structural"
  | "sign_analysis"
  | "case_analysis"
  | "sequence_pattern"
  | "mixed";

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
  strategy_primary: StrategyType;
  strategy_secondary: StrategyType;
  strategy_reason: string;
  key_observation: string;
  conditions: string[];
  key_equations: string[];
  candidate_answer: string;
  validation_checks: string[];
  is_valid: boolean;
  final_answer: string;
  concise_solution: string;
  verification: string;
  caution: string;
  graph_needed: boolean;
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

const CURRICULUM_GUIDE = {
  highschool_math_1st_year: {
    label: "고1 수학",
    majorUnits: [
      "집합",
      "명제",
      "절대부등식",
      "산술평균과 기하평균",
      "함수",
      "유리식과 유리함수",
      "무리식과 무리함수",
      "경우의 수",
      "순열",
      "조합",
      "다항식의 연산",
      "항등식과 미정계수법",
      "나머지정리",
      "인수분해",
      "복소수",
      "이차방정식",
      "이차함수",
      "이차함수의 최대 최소",
      "삼차방정식과 사차방정식",
      "연립방정식",
      "부등식",
      "평면좌표",
      "직선의 방정식",
      "원의 방정식",
      "도형의 이동",
      "부등식이 포함된 영역",
    ],
    banned: ["미분", "적분", "벡터", "조건부확률", "정규분포", "공간좌표"],
  },
  math1: {
    label: "수학 I",
    majorUnits: [
      "거듭제곱근",
      "지수",
      "로그",
      "지수함수",
      "로그함수",
      "지수방정식",
      "지수부등식",
      "로그방정식",
      "로그부등식",
      "삼각함수",
      "일반각과 호도법",
      "삼각함수의 성질",
      "삼각함수의 그래프",
      "사인법칙과 코사인법칙",
      "삼각형의 넓이",
      "등차수열",
      "등비수열",
      "합의 기호 Σ",
      "여러 가지 수열",
      "수학적 귀납법",
    ],
    banned: ["극한", "미분", "적분", "벡터", "조건부확률", "정규분포"],
  },
  math2: {
    label: "수학 II",
    majorUnits: [
      "함수의 극한",
      "함수의 극한의 성질",
      "함수의 연속",
      "연속함수의 성질",
      "미분계수",
      "도함수",
      "접선의 방정식",
      "평균값 정리",
      "함수의 증가와 감소",
      "극대와 극소",
      "함수의 그래프",
      "함수의 최대와 최소",
      "방정식과 부등식의 활용",
      "속도와 가속도",
      "부정적분",
      "정적분",
      "정적분으로 정의된 함수",
      "넓이",
      "속도와 거리",
    ],
    banned: ["벡터", "조건부확률", "정규분포", "공간도형"],
  },
  calculus: {
    label: "미적분",
    majorUnits: [
      "수열의 극한",
      "등비수열의 수렴과 발산",
      "급수",
      "등비급수",
      "지수함수와 로그함수의 극한",
      "지수함수와 로그함수의 미분",
      "삼각함수의 덧셈정리",
      "삼각함수의 합성",
      "삼각함수의 극한",
      "삼각함수의 미분",
      "여러 가지 미분법",
      "함수의 몫의 미분법",
      "합성함수의 미분법",
      "매개변수로 나타낸 함수의 미분법",
      "음함수의 미분법",
      "역함수의 미분법",
      "이계도함수",
      "곡선의 접선의 방정식",
      "함수의 극대와 극소",
      "곡선의 오목과 볼록",
      "여러 가지 함수의 부정적분",
      "치환적분법",
      "부분적분법",
      "정적분의 활용",
      "구분구적법",
      "넓이",
      "부피",
      "속도와 거리",
    ],
    banned: ["벡터", "조건부확률", "정규분포", "공간좌표"],
  },
  probability_statistics: {
    label: "확률과 통계",
    majorUnits: [
      "순열",
      "여러 가지 순열",
      "조합",
      "중복조합",
      "이항정리",
      "이항계수의 성질",
      "시행과 사건",
      "확률의 뜻",
      "확률의 덧셈정리",
      "조건부확률",
      "독립시행의 확률",
      "이산확률분포",
      "이항분포",
      "연속확률분포",
      "정규분포",
      "모집단과 표본",
      "모평균의 추정",
    ],
    banned: ["미분", "적분", "벡터", "포물선", "공간좌표"],
  },
  geometry: {
    label: "기하",
    majorUnits: [
      "포물선",
      "타원",
      "쌍곡선",
      "이차곡선과 직선의 위치 관계",
      "포물선의 접선의 방정식",
      "타원의 접선의 방정식",
      "쌍곡선의 접선의 방정식",
      "벡터의 뜻",
      "벡터의 연산",
      "위치벡터",
      "평면벡터의 성분",
      "평면벡터의 내적",
      "직선의 방향벡터",
      "원의 방정식",
      "직선과 평면의 위치 관계",
      "평행과 수직",
      "정사영",
      "공간에서의 점의 좌표",
      "선분의 내분점과 외분점",
      "구의 방정식",
    ],
    banned: ["조건부확률", "정규분포", "적분", "급수"],
  },
} as const;

async function getUserFromRequest(req: Request) {
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
  const sections: string[] = [];

  sections.push(
    `## 과목 분류\n${SUBJECT_LABELS[parsed.subject]}${parsed.subtopic ? ` · ${parsed.subtopic}` : ""}`
  );
  sections.push(`## 핵심 관찰\n${parsed.key_observation}`);
  sections.push(
    `## 풀이 전략\n1차: ${parsed.strategy_primary}\n2차: ${parsed.strategy_secondary}\n이유: ${parsed.strategy_reason}`
  );

  if (parsed.conditions?.length) {
    sections.push(`## 문제 조건\n${parsed.conditions.map((v) => `- ${v}`).join("\n")}`);
  }

  if (parsed.key_equations?.length) {
    sections.push(`## 핵심 식\n${parsed.key_equations.map((v) => `- ${v}`).join("\n")}`);
  }

  sections.push(`## 후보 답\n${parsed.candidate_answer || "없음"}`);

  if (parsed.validation_checks?.length) {
    sections.push(
      `## 조건 검증\n${parsed.validation_checks.map((v) => `- ${v}`).join("\n")}`
    );
  }

  if (parsed.is_valid) {
    sections.push(`## 최종 답\n${parsed.final_answer}`);
  } else {
    sections.push(`## 최종 답\n검산 결과 조건을 완전히 만족하지 않아 최종 답을 확정하지 않았습니다.`);
  }

  sections.push(`## 풀이\n${parsed.concise_solution}`);
  sections.push(`## 검산 요약\n${parsed.verification}`);

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
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
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
      try {
        if (!profile.is_admin) {
          const usedReadToday = await checkDailyLimit(user.id, "read");
          if (usedReadToday >= READ_DAILY_LIMIT) {
            return NextResponse.json(
              { error: `오늘 문제 인식 횟수를 모두 썼습니다. (하루 ${READ_DAILY_LIMIT}회)` },
              { status: 429 }
            );
          }
        }

        const image = formData.get("image");
        if (!image || !(image instanceof File)) {
          return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
        }

        const bytes = await image.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = image.type || "image/jpeg";

        const response = await client.responses.create({
          model: "gpt-4o-mini",
          max_output_tokens: 700,
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

        const result = (response as any).output_text || "응답이 비어 있습니다.";

        await addUsageLog(user.id, "read");
        await saveHistory({
          userId: user.id,
          actionType: "read",
          recognizedText: result,
        });

        return NextResponse.json({
          result,
          meta: { model: response.model },
        });
      } catch (error) {
        console.error("[solve/read] error:", error);
        return NextResponse.json(
          {
            error: "read 단계에서 오류가 발생했습니다.",
            detail: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    if (mode === "solve") {
      if (!profile.is_admin) {
        const usedSolveToday = await checkDailyLimit(user.id, "solve");
        if (usedSolveToday >= SOLVE_DAILY_LIMIT) {
          return NextResponse.json(
            { error: `오늘 풀이 횟수를 모두 썼습니다. (하루 ${SOLVE_DAILY_LIMIT}회)` },
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
      const solveMaxTokens = profile.is_admin ? 2600 : 1800;

      const response = await client.responses.create({
        model: solveModel,
        max_output_tokens: solveMaxTokens,
        store: false,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: [
                  "너는 대한민국 고등학교 수학 문제 풀이 엔진이다.",
                  "",
                  "반드시 JSON 객체만 출력하라.",
                  "설명문, 인삿말, 코드블록, 백틱은 절대 출력하지 마라.",
                  "",
                  "교육과정 가이드:",
                  JSON.stringify(CURRICULUM_GUIDE, null, 2),
                  "",
                  "반드시 지킬 규칙:",
                  "1. 문제를 먼저 아래 6개 과목 중 하나로 분류하라.",
                  "   - highschool_math_1st_year",
                  "   - math1",
                  "   - math2",
                  "   - calculus",
                  "   - probability_statistics",
                  "   - geometry",
                  "",
                  "2. 분류한 과목의 교육과정 범위 안에서만 풀이하라.",
                  "3. 해당 과목의 banned 개념은 사용하지 마라.",
                  "4. 문제를 바로 계산하지 말고, 먼저 가장 자연스러운 풀이 관점을 선택하라.",
                  "5. 가능한 풀이 관점은 아래 중 하나다.",
                  "   - algebraic",
                  "   - graphical",
                  "   - geometric",
                  "   - structural",
                  "   - sign_analysis",
                  "   - case_analysis",
                  "   - sequence_pattern",
                  "   - mixed",
                  "",
                  "6. 고등학교 수학에서는 단순 계산보다 다음이 핵심일 수 있다.",
                  "   - 그래프 해석",
                  "   - 기하적 해석",
                  "   - 식의 구조 분석",
                  "   - 부호 분석",
                  "   - 경우 나누기",
                  "   - 수열의 패턴 관찰",
                  "",
                  "7. 따라서 먼저",
                  "   - 문제 조건을 추출하고",
                  "   - 핵심 관찰을 적고",
                  "   - 가장 적절한 1차 접근을 선택한 뒤",
                  "   - 그 이유를 설명하고",
                  "   - 그 접근으로 풀이하라.",
                  "",
                  "8. 불필요한 전개나 과도한 계산은 피하라.",
                  "9. 후보 답을 구한 뒤, 각 조건에 실제로 대입하여 검증하라.",
                  "10. 검증이 완전하지 않으면 is_valid=false로 하라.",
                  "11. is_valid=true일 때만 final_answer를 확정적으로 작성하라.",
                  "12. 수식은 문자열 안에서 $...$ 또는 $$...$$ 형식으로 써라.",
                  "13. graphRequested가 false면 graph_needed=false, graph_spec=null이어야 한다.",
                  "",
                  "출력 JSON 형식:",
                  "{",
                  '  "subject": "math1",',
                  '  "subtopic": "다항함수",',
                  '  "confidence": "medium",',
                  '  "difficulty": "medium",',
                  '  "strategy_primary": "structural",',
                  '  "strategy_secondary": "algebraic",',
                  '  "strategy_reason": "식의 형태와 조건이 먼저 핵심이며, 계산은 그 다음이다.",',
                  '  "key_observation": "주어진 조건은 함수값 계산보다 구조적 성질을 먼저 보아야 한다.",',
                  '  "conditions": ["조건1", "조건2"],',
                  '  "key_equations": ["식1", "식2"],',
                  '  "candidate_answer": "후보 답",',
                  '  "validation_checks": ["검증1", "검증2"],',
                  '  "is_valid": true,',
                  '  "final_answer": "최종 답",',
                  '  "concise_solution": "핵심 풀이",',
                  '  "verification": "검산 요약",',
                  '  "caution": "주의점",',
                  '  "graph_needed": false,',
                  '  "graph_spec": null',
                  "}",
                  "",
                  "strategy_primary, strategy_secondary는 아래 값 중에서만 선택:",
                  "- algebraic",
                  "- graphical",
                  "- geometric",
                  "- structural",
                  "- sign_analysis",
                  "- case_analysis",
                  "- sequence_pattern",
                  "- mixed",
                  "",
                  "graph_spec 형식:",
                  "{",
                  '  "graph_type": "function" 또는 "points",',
                  '  "equation": "y = ...",',
                  '  "x_min": 숫자,',
                  '  "x_max": 숫자,',
                  '  "y_min": 숫자 또는 null,',
                  '  "y_max": 숫자 또는 null,',
                  '  "points": [',
                  '    { "x": 숫자, "y": 숫자, "label": "문자열" }',
                  "  ],",
                  '  "note": "설명"',
                  "}",
                  "",
                  `graphRequested: ${graphRequested ? "true" : "false"}`,
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "[문제]",
                  recognizedProblem,
                  "",
                  "[할 일]",
                  "- 과목 분류",
                  "- 세부 단원 추정",
                  "- 조건 추출",
                  "- 핵심 식 정리",
                  "- 후보 답 계산",
                  "- 조건 검증",
                  "- 최종 답 확정 여부 판단",
                ].join("\n"),
              },
            ],
          },
        ],
      });

      const debugResponse = {
        id: response.id,
        model: response.model,
        status: (response as any).status,
        incomplete_details: (response as any).incomplete_details ?? null,
        output: (response as any).output ?? null,
      };

      console.log("[solve] response summary:", JSON.stringify(debugResponse, null, 2));

      const rawText = (response as any).output_text || "";
      let extractedText = rawText;

      if (!extractedText) {
        const outputItems = ((response as any).output ?? []) as any[];

        for (const item of outputItems) {
          if (item?.type === "message" && Array.isArray(item?.content)) {
            const textParts = item.content
              .filter(
                (part: any) =>
                  part?.type === "output_text" && typeof part?.text === "string"
              )
              .map((part: any) => part.text);

            if (textParts.length > 0) {
              extractedText = textParts.join("\n").trim();
              break;
            }
          }
        }
      }

      const cleanedText = extractedText
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();

      const firstBraceIndex = cleanedText.indexOf("{");
      const lastBraceIndex = cleanedText.lastIndexOf("}");

      const jsonCandidate =
        firstBraceIndex !== -1 &&
        lastBraceIndex !== -1 &&
        lastBraceIndex > firstBraceIndex
          ? cleanedText.slice(firstBraceIndex, lastBraceIndex + 1)
          : cleanedText;

      let parsed: ParsedSolveResult | null = null;

      try {
        parsed = JSON.parse(jsonCandidate) as ParsedSolveResult;
      } catch (error) {
        console.error("[solve] parse error:", error);
        console.error("[solve] extractedText:", extractedText);
        console.error("[solve] jsonCandidate:", jsonCandidate);

        return NextResponse.json({
          result: [
            "## JSON 파싱 실패",
            "",
            "### status",
            String((response as any).status ?? "(unknown)"),
            "",
            "### incomplete_details",
            JSON.stringify((response as any).incomplete_details ?? null, null, 2),
            "",
            "### extractedText",
            extractedText || "(empty)",
            "",
            "### jsonCandidate",
            jsonCandidate || "(empty)",
            "",
            "### output",
            JSON.stringify((response as any).output ?? null, null, 2),
          ].join("\n"),
          meta: null,
          graph: null,
        });
      }

      if (!parsed) {
        return NextResponse.json(
          { error: "풀이 결과를 구조화하지 못했습니다." },
          { status: 500 }
        );
      }

      const normalizedSubject: SubjectCategory = SUBJECT_LABELS[parsed.subject]
        ? parsed.subject
        : "highschool_math_1st_year";

      const normalizedGraphNeeded =
        graphRequested && parsed.graph_needed === true && parsed.graph_spec !== null;

      const normalizedParsed: ParsedSolveResult = {
        ...parsed,
        subject: normalizedSubject,
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
          isValid: normalizedParsed.is_valid,
        },
        graph: normalizedParsed.graph_spec,
      });
    }

    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  } catch (error) {
    console.error("[api/solve] fatal error:", error);

    return NextResponse.json(
      {
        error: "서버에서 처리 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV !== "production" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}