import fs from "node:fs/promises";
import path from "node:path";

import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import JSZip from "jszip";
import { jsPDF } from "jspdf";

import type { ExamBlueprint, ReferenceAnalysisResult } from "./types";

type FileRole = "exam" | "solution" | "analysis";

const templatePath = path.join(process.cwd(), "assets", "exam-builder", "exam-template.docx");

function text(value: unknown) {
  return String(value ?? "").trim();
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeLatex(value: string) {
  return value
    .replace(/^\$\$?|\$\$?$/g, "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .replace(/\\left|\\right/g, "")
    .trim();
}

function takeBraced(value: string, start: number) {
  if (value[start] !== "{") return null;
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return {
        content: value.slice(start + 1, index),
        end: index + 1,
      };
    }
  }
  return null;
}

function linearMathText(value: string) {
  return value
    .replace(/\\to/g, "→")
    .replace(/\\infty/g, "∞")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

function mathComponents(value: string): string {
  let output = "";
  let index = 0;

  while (index < value.length) {
    if (value.startsWith("\\frac", index)) {
      const numerator = takeBraced(value, index + "\\frac".length);
      const denominator = numerator ? takeBraced(value, numerator.end) : null;
      if (numerator && denominator) {
        output += `<m:f><m:num>${mathComponents(numerator.content)}</m:num><m:den>${mathComponents(denominator.content)}</m:den></m:f>`;
        index = denominator.end;
        continue;
      }
    }

    if (value.startsWith("\\sqrt", index)) {
      const radicand = takeBraced(value, index + "\\sqrt".length);
      if (radicand) {
        output += `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${mathComponents(radicand.content)}</m:e></m:rad>`;
        index = radicand.end;
        continue;
      }
    }

    const nextSpecial = value.indexOf("\\", index + 1);
    const raw = nextSpecial === -1 ? value.slice(index) : value.slice(index, nextSpecial);
    output += `<m:r><m:t>${escapeXml(linearMathText(raw))}</m:t></m:r>`;
    index = nextSpecial === -1 ? value.length : nextSpecial;
  }

  return output || `<m:r><m:t>${escapeXml(linearMathText(value))}</m:t></m:r>`;
}

function mathXml(value: string) {
  return `<m:oMath>${mathComponents(normalizeLatex(value))}</m:oMath>`;
}

function splitMathSegments(value: string) {
  const segments: Array<{ type: "text" | "math"; value: string }> = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\\frac\{[\s\S]+?\}\{[\s\S]+?\}|\\sqrt\{[\s\S]+?\})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    segments.push({ type: "math", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({ type: "text", value: value.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value }];
}

function textRunXml(value: string, rPr: string) {
  const lines = escapeXml(value).split(/\r?\n/);
  return `<w:r>${rPr}${lines
    .map((line, index) => `${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${line}</w:t>`)
    .join("")}</w:r>`;
}

function stripXml(value: string) {
  return value
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function replaceParagraphText(paragraphXml: string, value: string) {
  const pPr = paragraphXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const firstRun = paragraphXml.match(/<w:r\b[\s\S]*?<\/w:r>/)?.[0] ?? "";
  const rPr = firstRun.match(/<w:rPr[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  const escapedLines = escapeXml(value)
    .split(/\r?\n/)
    .map((line, index) => (index === 0 ? line : `<w:br/>${line}`))
    .join("");

  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapedLines}</w:t></w:r></w:p>`;
}

function buildTemplateParagraph(pPr: string, textValue: string, options?: { bold?: boolean }) {
  const runProperty = [
    '<w:rFonts w:ascii="HY신명조" w:eastAsia="HY신명조" w:hint="eastAsia"/>',
    options?.bold ? "<w:b/>" : "",
    '<w:sz w:val="18"/>',
    '<w:lang w:eastAsia="ko-KR"/>',
  ].join("");
  const rPr = `<w:rPr>${runProperty}</w:rPr>`;
  const runs = splitMathSegments(textValue)
    .map((segment) => (segment.type === "math" ? mathXml(segment.value) : textRunXml(segment.value, rPr)))
    .join("");

  return `<w:p>${pPr}${runs}</w:p>`;
}

function buildProblemText(item: ExamBlueprint["items"][number]) {
  const problemText = item.problemText || `${item.topic} ${item.problemType} 문항`;
  const hasChoices = /[①②③④⑤]/.test(problemText);

  return [
    `${item.number}. ${problemText} [${item.score.toFixed(1)}점]`,
    item.format === "객관식" && !hasChoices ? "①  ②  ③  ④  ⑤" : "",
    item.format === "서술형" ? "답: ______________________________" : "",
  ].join("\n");
}

async function patchTemplateHeader(zip: JSZip, blueprint: ExamBlueprint) {
  for (const headerPath of ["word/header1.xml", "word/header2.xml"]) {
    const headerFile = zip.file(headerPath);
    if (!headerFile) continue;

    const headerXml = await headerFile.async("string");
    const paragraphs = headerXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    if (!paragraphs.length) continue;

    let usedTitle = false;
    let usedSubject = false;
    const patchedParagraphs = paragraphs.map((paragraph) => {
      const paragraphText = stripXml(paragraph).replace(/\s+/g, " ").trim();

      if (!usedTitle && /문제지|시험지/.test(paragraphText)) {
        usedTitle = true;
        return replaceParagraphText(paragraph, blueprint.title);
      }

      if (!usedSubject && /언어와 매체|수학|미적|확률|기하|고\s*3/.test(paragraphText)) {
        usedSubject = true;
        return replaceParagraphText(paragraph, blueprint.subject);
      }

      return paragraph;
    });

    let index = 0;
    const nextHeaderXml = headerXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, () => patchedParagraphs[index++] ?? "");
    zip.file(headerPath, nextHeaderXml);
  }
}

async function buildTemplateExamDocxBuffer(blueprint: ExamBlueprint) {
  const templateBuffer = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("시험지 템플릿의 word/document.xml을 찾을 수 없습니다.");

  const documentXml = await documentFile.async("string");
  const bodyMatch = documentXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) throw new Error("시험지 템플릿 본문을 읽지 못했습니다.");

  const bodyXml = bodyMatch[1];
  const sectPr = bodyXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const paragraphs = bodyXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const firstQuestionIndex = paragraphs.findIndex((paragraph) => /^\s*1\./.test(stripXml(paragraph)));
  const preservedParagraphs = firstQuestionIndex >= 0 ? paragraphs.slice(0, firstQuestionIndex) : paragraphs.slice(0, 5);
  const questionParagraph = firstQuestionIndex >= 0 ? paragraphs[firstQuestionIndex] : paragraphs[paragraphs.length - 1];
  const questionPPr = questionParagraph?.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? "";

  const patchedIntro = preservedParagraphs.map((paragraph) => {
    const paragraphText = stripXml(paragraph);
    if (paragraphText.includes("선택형") && paragraphText.includes("문항")) {
      return replaceParagraphText(paragraph, `〇 선택형 ${blueprint.multipleChoiceCount}문항, 서술형 ${blueprint.writtenCount}문항입니다.`);
    }
    if (paragraphText.includes("시험 범위")) {
      return replaceParagraphText(paragraph, `〇 시험 범위: ${blueprint.sourceRange}`);
    }
    return paragraph;
  });

  await patchTemplateHeader(zip, blueprint);

  const problemParagraphs = blueprint.items.map((item) =>
    buildTemplateParagraph(questionPPr, buildProblemText(item), { bold: false })
  );

  const newBody = [...patchedIntro, ...problemParagraphs, sectPr].join("");
  const nextDocumentXml = documentXml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${newBody}</w:body>`);
  zip.file("word/document.xml", nextDocumentXml);

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

function buildRows(blueprint: ExamBlueprint, role: FileRole) {
  if (role === "exam") {
    return blueprint.items.map((item) => [
      `${item.number}`,
      item.format,
      item.problemText || `${item.topic} ${item.problemType} 문항`,
      `${item.score.toFixed(1)}점`,
    ]);
  }

  if (role === "solution") {
    return blueprint.items.map((item) => [
      `${item.number}`,
      item.answer || "정답 생성 필요",
      item.solution || item.intent,
    ]);
  }

  return blueprint.items.map((item) => [
    `${item.number}`,
    item.referenceLocation,
    item.topic,
    item.difficulty,
    item.transformStrength,
    item.intent,
  ]);
}

function getTitle(blueprint: ExamBlueprint, role: FileRole) {
  if (role === "exam") return `${blueprint.title} - 시험지`;
  if (role === "solution") return `${blueprint.title} - 정답 및 해설`;
  return `${blueprint.title} - 출제 분석표`;
}

export async function buildExamDocxBuffer(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  role: FileRole
) {
  if (role === "exam") {
    try {
      return await buildTemplateExamDocxBuffer(blueprint);
    } catch {
      // Fall through to the generated DOCX when the local template is unavailable.
    }
  }

  const headers =
    role === "exam"
      ? ["번호", "형식", "문항", "배점"]
      : role === "solution"
        ? ["번호", "정답", "해설"]
        : ["번호", "참고 위치", "주제", "난이도", "변형강도", "출제 의도"];

  const rows = [headers, ...buildRows(blueprint, role)].map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: cell })],
            })
        ),
      })
  );

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: getTitle(blueprint, role), bold: true, size: 32 })],
          }),
          new Paragraph({ text: `과목: ${blueprint.subject}` }),
          new Paragraph({ text: `범위: ${blueprint.sourceRange}` }),
          new Paragraph({ text: `문항 수: ${blueprint.totalProblems}문항` }),
          new Paragraph({ text: `참고 자료: ${blueprint.referenceSummary}` }),
          new Paragraph({ text: `주요 단원: ${analysis.majorUnits.join(", ")}` }),
          new Paragraph({ text: "" }),
          new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export function buildExamPdfBuffer(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  role: FileRole
) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 42;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(getTitle(blueprint, role), margin, y);
  y += 28;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  [
    `Subject: ${blueprint.subject}`,
    `Range: ${blueprint.sourceRange}`,
    `Problems: ${blueprint.totalProblems}`,
    `References: ${blueprint.referenceSummary}`,
    `Units: ${analysis.majorUnits.join(", ")}`,
  ].forEach((line) => {
    pdf.text(line, margin, y);
    y += 16;
  });

  y += 12;
  buildRows(blueprint, role).forEach((row) => {
    const line = row.map(text).join(" | ");
    const wrapped = pdf.splitTextToSize(line, 510);
    if (y + wrapped.length * 13 > 790) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(wrapped, margin, y);
    y += wrapped.length * 13 + 8;
  });

  return Buffer.from(pdf.output("arraybuffer"));
}

export const generatedFileDefinitions: Array<{
  role: FileRole;
  label: string;
  format: "DOCX" | "PDF";
}> = [
  { role: "exam", label: "시험지 원문", format: "DOCX" },
  { role: "exam", label: "시험지 원문", format: "PDF" },
  { role: "solution", label: "정답 및 해설지", format: "DOCX" },
  { role: "solution", label: "정답 및 해설지", format: "PDF" },
  { role: "analysis", label: "출제 분석표", format: "DOCX" },
  { role: "analysis", label: "출제 분석표", format: "PDF" },
];
