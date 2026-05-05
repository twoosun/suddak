import fs from "node:fs/promises";
import path from "node:path";

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import JSZip from "jszip";
import { jsPDF } from "jspdf";

import type { ExamBlueprint, ReferenceAnalysisResult } from "./types";

type FileRole = "exam" | "solution" | "analysis";

const templatePath = path.join(process.cwd(), "assets", "exam-builder", "exam-template.docx");
const koreanFontCandidates =
  process.platform === "win32"
    ? [
        "C:\\Windows\\Fonts\\malgun.ttf",
        "C:\\Windows\\Fonts\\malgunbd.ttf",
        "C:\\Windows\\Fonts\\batang.ttc",
      ]
    : process.platform === "darwin"
      ? [
          "/System/Library/Fonts/AppleSDGothicNeo.ttc",
          "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        ]
      : [
          "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
          "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
          "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        ];

let koreanPdfFontBase64: string | null | undefined;

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

function getParagraphProperties(paragraphXml: string) {
  return paragraphXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
}

function getRunProperties(paragraphXml: string) {
  return paragraphXml.match(/<w:rPr[\s\S]*?<\/w:rPr>/)?.[0] ?? '<w:rPr><w:lang w:eastAsia="ko-KR"/></w:rPr>';
}

function replaceParagraphText(paragraphXml: string, value: string) {
  const pPr = getParagraphProperties(paragraphXml);
  const rPr = getRunProperties(paragraphXml);
  const runs = escapeXml(value)
    .split(/\r?\n/)
    .map((line, index) => `<w:r>${rPr}${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${line}</w:t></w:r>`)
    .join("");

  return `<w:p>${pPr}${runs}</w:p>`;
}

function withProblemParagraphLayout(pPr: string, spacingAfterTwips: number) {
  const layout = `<w:keepLines/><w:spacing w:after="${spacingAfterTwips}" w:line="276" w:lineRule="auto"/>`;

  if (!pPr) return `<w:pPr>${layout}</w:pPr>`;
  if (/<w:keepLines\/>/.test(pPr)) {
    return pPr.replace(/<w:spacing\b[^>]*\/>/, "").replace("</w:pPr>", `${layout.replace("<w:keepLines/>", "")}</w:pPr>`);
  }

  return pPr.replace(/<w:spacing\b[^>]*\/>/, "").replace("</w:pPr>", `${layout}</w:pPr>`);
}

function buildTemplateParagraph(pPr: string, rPr: string, value: string, options?: { keepTogether?: boolean; spacingAfterTwips?: number }) {
  const nextPPr = options?.keepTogether
    ? withProblemParagraphLayout(pPr, options.spacingAfterTwips ?? 360)
    : pPr;
  const runs = escapeXml(value)
    .split(/\r?\n/)
    .map((line, index) => `<w:r>${rPr}${index > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${line}</w:t></w:r>`)
    .join("");

  return `<w:p>${nextPPr}${runs}</w:p>`;
}

function replaceParagraphs(xml: string, replacements: Map<number, string>) {
  let index = 0;
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const replacement = replacements.get(index);
    index += 1;
    return replacement ?? paragraph;
  });
}

function setTwoColumnSeparator(sectPr: string) {
  if (/<w:cols\b[^>]*\bw:sep=/.test(sectPr)) return sectPr;
  return sectPr.replace(/<w:cols\b([^>]*)\/>/, "<w:cols$1 w:sep=\"1\"/>");
}

function formatExamDate(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function normalizeSubject(value: string) {
  const subject = text(value)
    .replace(/^수학\s*[([]\s*/u, "")
    .replace(/\s*[\])]\s*$/u, "")
    .replace(/^수학\s*[-:]\s*/u, "")
    .replace(/^수학\s*/u, "");

  if (/미적/u.test(subject)) return "미적분";
  if (/확률|통계/u.test(subject)) return "확률과 통계";
  if (/공통/u.test(subject)) return "공통수학";
  if (/수학\s*I|수학Ⅰ|수학1/u.test(subject)) return "수학Ⅰ";
  if (/수학\s*II|수학Ⅱ|수학2/u.test(subject)) return "수학Ⅱ";
  return subject || "수학";
}

function getProblemCountLine(blueprint: ExamBlueprint) {
  if (blueprint.writtenCount > 0) {
    return `〇 선택형 ${blueprint.multipleChoiceCount}문항, 서술형 ${blueprint.writtenCount}문항입니다.`;
  }

  return `〇 선택형 ${blueprint.totalProblems}문항입니다.`;
}

function normalizePlainMath(value: string) {
  return value
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)")
    .replace(/\\lim_\{([^{}]+)\}/g, "lim $1")
    .replace(/\\lim/g, "lim")
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
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/\{([^{}]+)\}/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildProblemText(item: ExamBlueprint["items"][number]) {
  const problemText = normalizePlainMath(item.problemText || `${item.topic} ${item.problemType} 문항`);
  const numbered = new RegExp(`^\\s*${item.number}\\s*[.)]`).test(problemText);
  const score = Number(item.score || 0).toFixed(1).replace(/\.0$/, "");
  const scoreText = score === "0" ? "" : ` [${score}점]`;

  return numbered ? `${problemText}${scoreText}` : `${item.number}. ${problemText}${scoreText}`;
}

function estimateProblemWeight(item: ExamBlueprint["items"][number]) {
  const body = normalizePlainMath(item.problemText || "");
  const difficulty = String(item.difficulty || "");
  const type = `${item.format} ${item.problemType}`.toLowerCase();
  let weight = Math.ceil(body.length / 90);

  if (item.format === "서술형") weight += 2;
  if (/고난도|상/u.test(difficulty)) weight += difficulty === "고난도" ? 3 : 1;
  if (/증명|추론|그래프|도표|그림|복합/u.test(type)) weight += 2;
  if (/\$\$|\\frac|\\lim|\\sum|\\int|\\sqrt/u.test(item.problemText || "")) weight += 1;

  return Math.max(2, Math.min(10, weight));
}

function getCalculationSpaceLines(item: ExamBlueprint["items"][number]) {
  const weight = estimateProblemWeight(item);
  if (weight >= 8) return 13;
  if (weight >= 6) return 10;
  if (weight >= 4) return 7;
  return 4;
}

function getProblemSpacingTwips(item: ExamBlueprint["items"][number]) {
  const weight = estimateProblemWeight(item);
  if (weight >= 8) return 980;
  if (weight >= 6) return 760;
  if (weight >= 4) return 560;
  return 360;
}

function buildProblemBlockText(item: ExamBlueprint["items"][number]) {
  const spaceLines = Array.from({ length: getCalculationSpaceLines(item) }, () => "").join("\n");
  return `${buildProblemText(item)}\n${spaceLines}`;
}

async function readKoreanPdfFont() {
  if (koreanPdfFontBase64 !== undefined) return koreanPdfFontBase64;

  for (const fontPath of koreanFontCandidates) {
    try {
      koreanPdfFontBase64 = (await fs.readFile(fontPath)).toString("base64");
      return koreanPdfFontBase64;
    } catch {}
  }

  koreanPdfFontBase64 = null;
  return null;
}

async function setPdfFont(pdf: jsPDF) {
  const fontBase64 = await readKoreanPdfFont();

  if (!fontBase64) {
    pdf.setFont("helvetica", "normal");
    return;
  }

  pdf.addFileToVFS("korean.ttf", fontBase64);
  pdf.addFont("korean.ttf", "Korean", "normal");
  pdf.setFont("Korean", "normal");
}

function buildRows(blueprint: ExamBlueprint, role: FileRole) {
  if (role === "exam") {
    return blueprint.items.map((item) => [
      `${item.number}`,
      item.format,
      item.problemText || `${item.topic} ${item.problemType} 문항`,
      `${Number(item.score || 0).toFixed(1).replace(/\.0$/, "")}점`,
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
  if (role === "exam") return `${getExamTitle(blueprint)} 문제지`;
  if (role === "solution") return `${blueprint.title} 정답 및 해설`;
  return `${blueprint.title} 출제 분석표`;
}

function getExamTitle(blueprint: ExamBlueprint) {
  const subject = normalizeSubject(blueprint.subject);
  return text(blueprint.title)
    .replace(/수학\s*[\[(]\s*미적분\s*[\])]/gu, subject)
    .replace(/수학\s*[\[(]\s*확률과\s*통계\s*[\])]/gu, subject)
    .replace(/수학\s*[\[(]\s*공통수학\s*[\])]/gu, subject)
    .replace(/^수학\s+/u, `${subject} `);
}

async function patchTemplateHeader(zip: JSZip, blueprint: ExamBlueprint) {
  const subject = normalizeSubject(blueprint.subject);
  const title = getExamTitle(blueprint);

  const header1 = zip.file("word/header1.xml");
  if (header1) {
    const headerXml = await header1.async("string");
    zip.file("word/header1.xml", headerXml.replace(/언어와 매체/g, escapeXml(subject)));
  }

  const header2 = zip.file("word/header2.xml");
  if (!header2) return;

  const headerXml = await header2.async("string");
  const paragraphs = headerXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const replacements = new Map<number, string>();

  if (paragraphs[3]) replacements.set(3, replaceParagraphText(paragraphs[3], `${title} 문제지`));
  if (paragraphs[4]) replacements.set(4, replaceParagraphText(paragraphs[4], `( 고 3 ) ${subject}`));
  if (paragraphs[5]) {
    replacements.set(
      5,
      replaceParagraphText(paragraphs[5], `${formatExamDate()} 1교시 실시  \t                                                                 과목코드: 01                SUDDAK`),
    );
  }

  zip.file("word/header2.xml", replaceParagraphs(headerXml, replacements));
}

async function patchTemplateFooters(zip: JSZip, blueprint: ExamBlueprint) {
  const subject = normalizeSubject(blueprint.subject);

  for (const footerPath of ["word/footer1.xml", "word/footer2.xml"]) {
    const footer = zip.file(footerPath);
    if (!footer) continue;

    const footerXml = await footer.async("string");
    zip.file(footerPath, footerXml.replace(/언어와 매체/g, escapeXml(subject)));
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
  const sectPr = setTwoColumnSeparator(bodyXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "");
  const paragraphs = bodyXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const firstQuestionIndex = paragraphs.findIndex((paragraph) => /^\s*1[.)]/.test(stripXml(paragraph).trim()));
  const introEnd = firstQuestionIndex >= 0 ? firstQuestionIndex : Math.min(6, paragraphs.length);
  const introParagraphs = paragraphs.slice(0, introEnd);
  const questionParagraph = firstQuestionIndex >= 0 ? paragraphs[firstQuestionIndex] : paragraphs[paragraphs.length - 1];
  const questionPPr = getParagraphProperties(questionParagraph);
  const questionRPr = getRunProperties(questionParagraph);
  const blankParagraph = paragraphs.find((paragraph) => !stripXml(paragraph).trim()) ?? "<w:p/>";

  const patchedIntro = introParagraphs.map((paragraph) => {
    const paragraphText = stripXml(paragraph);
    if (/선택형\s*\d+\s*문항|서술형\s*\d+\s*문항/u.test(paragraphText)) {
      return replaceParagraphText(paragraph, getProblemCountLine(blueprint));
    }
    if (paragraphText.includes("시험 범위")) {
      return replaceParagraphText(paragraph, `〇 시험 범위: ${blueprint.sourceRange}`);
    }
    return paragraph;
  });

  await patchTemplateHeader(zip, blueprint);
  await patchTemplateFooters(zip, blueprint);

  const problemParagraphs = blueprint.items.map((item) =>
    buildTemplateParagraph(questionPPr, questionRPr, buildProblemBlockText(item), {
      keepTogether: true,
      spacingAfterTwips: getProblemSpacingTwips(item),
    }),
  );

  const newBody = [...patchedIntro, blankParagraph, ...problemParagraphs, sectPr].join("");
  const nextDocumentXml = documentXml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${newBody}</w:body>`);
  zip.file("word/document.xml", nextDocumentXml);

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

export async function buildExamDocxBuffer(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  role: FileRole,
) {
  if (role === "exam") return buildTemplateExamDocxBuffer(blueprint);

  const headers =
    role === "solution"
      ? ["번호", "정답", "해설"]
      : ["번호", "참고 위치", "주제", "난이도", "변형 강도", "출제 의도"];

  const rows = [headers, ...buildRows(blueprint, role)].map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: cell })],
            }),
        ),
      }),
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

function addPdfHeader(pdf: jsPDF, blueprint: ExamBlueprint) {
  const subject = normalizeSubject(blueprint.subject);
  const title = getExamTitle(blueprint);

  pdf.setFontSize(18);
  pdf.text(`${title} 문제지`, 297.5, 48, { align: "center" });
  pdf.setFontSize(11);
  pdf.text(`( 고 3 ) ${subject}`, 297.5, 68, { align: "center" });
  pdf.setFontSize(9);
  pdf.text(`${formatExamDate()} 1교시 실시`, 42, 86);
  pdf.text("과목코드: 01                SUDDAK", 430, 86);
  pdf.setLineWidth(0.6);
  pdf.line(42, 96, 553, 96);
}

function addPdfExamPageDecorations(pdf: jsPDF) {
  pdf.setLineWidth(0.4);
  pdf.line(297.5, 118, 297.5, 790);
}

function writeWrapped(pdf: jsPDF, value: string, x: number, y: number, width: number) {
  const lines = pdf.splitTextToSize(value, width) as string[];
  pdf.text(lines, x, y);
  return y + lines.length * 12;
}

async function buildTemplateExamPdfBuffer(blueprint: ExamBlueprint) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await setPdfFont(pdf);

  const columnWidth = 232;
  const leftX = 42;
  const rightX = 322;
  const topY = 118;
  const bottomY = 790;
  let column = 0;
  let y = topY;

  addPdfHeader(pdf, blueprint);
  addPdfExamPageDecorations(pdf);
  pdf.setFontSize(8.5);
  [
    "〇 답안지의 해당란에 성명, 반, 번호 등을 정확히 쓰시오.",
    "〇 문항에 따라 배점이 다르니 각 물음의 끝에 표시된 배점을 참고하시오.",
    getProblemCountLine(blueprint),
    `〇 시험 범위: ${blueprint.sourceRange}`,
  ].forEach((line) => {
    y = writeWrapped(pdf, line, leftX, y, columnWidth);
  });
  y += 8;

  pdf.setFontSize(9);
  blueprint.items.forEach((item) => {
    const x = column === 0 ? leftX : rightX;
    const textBlock = buildProblemText(item);
    const lines = pdf.splitTextToSize(textBlock, columnWidth) as string[];
    const nextY = y + lines.length * 12 + 12;

    if (nextY > bottomY) {
      if (column === 0) {
        column = 1;
        y = topY;
      } else {
        pdf.addPage();
        addPdfHeader(pdf, blueprint);
        addPdfExamPageDecorations(pdf);
        column = 0;
        y = topY;
      }
    }

    pdf.text(lines, x, y);
    y += lines.length * 12 + 12;
  });

  return Buffer.from(pdf.output("arraybuffer"));
}

export async function buildExamPdfBuffer(
  blueprint: ExamBlueprint,
  analysis: ReferenceAnalysisResult,
  role: FileRole,
) {
  if (role === "exam") return buildTemplateExamPdfBuffer(blueprint);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  await setPdfFont(pdf);
  const margin = 42;
  let y = margin;

  pdf.setFontSize(16);
  pdf.text(getTitle(blueprint, role), margin, y);
  y += 28;

  pdf.setFontSize(10);
  [
    `과목: ${blueprint.subject}`,
    `범위: ${blueprint.sourceRange}`,
    `문항 수: ${blueprint.totalProblems}`,
    `참고 자료: ${blueprint.referenceSummary}`,
    `주요 단원: ${analysis.majorUnits.join(", ")}`,
  ].forEach((line) => {
    pdf.text(line, margin, y);
    y += 16;
  });

  y += 12;
  buildRows(blueprint, role).forEach((row) => {
    const line = row.map(text).join(" | ");
    const wrapped = pdf.splitTextToSize(line, 510) as string[];
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
  format: "DOCX";
}> = [
  { role: "exam", label: "시험지 원문", format: "DOCX" },
  { role: "solution", label: "정답 및 해설지", format: "DOCX" },
  { role: "analysis", label: "출제 분석표", format: "DOCX" },
];
