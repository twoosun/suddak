import OpenAI from "openai";
import { NextResponse } from "next/server";

import { getUserFromAuthHeader } from "@/lib/training/auth";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start < 0 || end < start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as { latex?: unknown };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "손글씨 이미지가 없습니다." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 인식할 수 있습니다." }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type || "image/png";

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      max_output_tokens: 180,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "손글씨로 적힌 수학 수식만 읽어서 Markdown LaTeX로 변환해줘.",
                "반드시 JSON 객체 하나만 반환해.",
                '형식: {"latex":"$...$"}',
                "인라인 수식은 $...$로 감싸고, 블록 수식이나 설명 문장은 만들지 마.",
                "확실하지 않은 기호는 추측하지 말고 보이는 범위에서만 작성해.",
                "수식이 없으면 latex를 빈 문자열로 반환해.",
              ].join("\n"),
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

    const outputText = (response as { output_text?: string }).output_text || "";
    const parsed = extractJsonObject(outputText);
    const latex = typeof parsed?.latex === "string" ? parsed.latex.trim() : outputText.trim();

    return NextResponse.json({
      latex,
      model: response.model,
    });
  } catch (error) {
    console.error("[api/formula-recognize] error:", error);
    return NextResponse.json(
      { error: "손글씨 수식 인식 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
