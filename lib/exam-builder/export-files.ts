import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { jsPDF } from "jspdf";

import type { ExamBlueprint, ReferenceAnalysisResult } from "./types";

type FileRole = "exam" | "solution" | "analysis";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function buildRows(blueprint: ExamBlueprint, role: FileRole) {
  if (role === "exam") {
    return blueprint.items.map((item) => [
      `${item.number}`,
      item.format,
      item.topic,
      item.problemType,
      `${item.score.toFixed(1)}점`,
    ]);
  }

  if (role === "solution") {
    return blueprint.items.map((item) => [
      `${item.number}`,
      item.topic,
      "정답은 생성 엔진 연결 후 자동 채점 기준으로 채워집니다.",
      item.intent,
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
  const headers =
    role === "exam"
      ? ["번호", "형식", "주제", "유형", "배점"]
      : role === "solution"
        ? ["번호", "주제", "정답", "해설 방향"]
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
