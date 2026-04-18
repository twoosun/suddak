import katex from "katex";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { type SimilarExportPayload } from "@/lib/similar-export";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMathExpression(expression: string, displayMode: boolean) {
  return katex.renderToString(expression, {
    throwOnError: false,
    displayMode,
    output: "htmlAndMathml",
    strict: "ignore",
  });
}

function renderInlineRichText(value: string) {
  const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g;
  let cursor = 0;
  let html = "";

  for (const match of value.matchAll(mathRegex)) {
    const matchIndex = match.index ?? 0;
    html += escapeHtml(value.slice(cursor, matchIndex));

    if (match[1]) {
      html += renderMathExpression(match[1].trim(), true);
    } else if (match[2]) {
      html += renderMathExpression(match[2].trim(), false);
    }

    cursor = matchIndex + match[0].length;
  }

  html += escapeHtml(value.slice(cursor));
  return html.replace(/\n/g, "<br />");
}

function renderListBlock(lines: string[], ordered: boolean) {
  const tag = ordered ? "ol" : "ul";
  const itemRegex = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
  const items = lines
    .map((line) => line.replace(itemRegex, "").trim())
    .filter(Boolean)
    .map((line) => `<li>${renderInlineRichText(line)}</li>`)
    .join("");

  return `<${tag}>${items}</${tag}>`;
}

function renderMarkdownLikeHtml(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return `<p>내용이 없습니다.</p>`;

  const blocks = normalized.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return "";

      if (trimmedBlock.startsWith("$$") && trimmedBlock.endsWith("$$")) {
        const expression = trimmedBlock.slice(2, -2).trim();
        return `<div class="similar-export-display-math">${renderMathExpression(expression, true)}</div>`;
      }

      const lines = trimmedBlock.split("\n");

      if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
        return renderListBlock(lines, false);
      }

      if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
        return renderListBlock(lines, true);
      }

      return `<p>${renderInlineRichText(trimmedBlock)}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function renderMetaField(label: string, value: string) {
  return `
    <div class="similar-export-meta-field">
      <div class="similar-export-meta-label">${escapeHtml(label)}</div>
      <div class="similar-export-meta-line">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderSection(label: string, title: string, content: string, compact = false) {
  return `
    <section class="similar-export-section ${compact ? "similar-export-section-compact" : ""}">
      <div class="similar-export-section-label">${escapeHtml(label)}</div>
      <h2 class="similar-export-section-title">${escapeHtml(title)}</h2>
      <div class="similar-export-markdown">${renderMarkdownLikeHtml(content)}</div>
    </section>
  `;
}

function buildExportStyles() {
  return `
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #efe7da;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family:
        "Times New Roman",
        "Noto Serif KR",
        "Nanum Myeongjo",
        serif;
    }

    .similar-export-shell {
      display: grid;
      gap: 24px;
      padding: 0;
    }

    .similar-export-sheet {
      width: 794px;
      height: 1123px;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }

    .similar-export-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .similar-export-paper {
      width: 794px;
      min-height: 1123px;
      padding: 48px 44px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(252, 249, 243, 0.98)),
        #fffdfa;
      border: 1px solid #d6cec1;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
    }

    .similar-export-header {
      position: relative;
      padding: 24px 24px 22px;
      border: 1px solid #212a39;
    }

    .similar-export-header::before,
    .similar-export-header::after {
      content: "";
      position: absolute;
      width: 28px;
      height: 28px;
      border-top: 1px solid #212a39;
    }

    .similar-export-header::before {
      top: -1px;
      left: -1px;
      border-left: 1px solid #212a39;
    }

    .similar-export-header::after {
      top: -1px;
      right: -1px;
      border-right: 1px solid #212a39;
    }

    .similar-export-kicker {
      font-size: 11px;
      letter-spacing: 0.18em;
      color: #50627f;
      font-weight: 700;
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
    }

    .similar-export-heading-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      margin-top: 12px;
    }

    .similar-export-title {
      margin: 0;
      font-size: 32px;
      line-height: 1.15;
      letter-spacing: -0.03em;
    }

    .similar-export-subtitle {
      margin: 10px 0 0;
      color: #5a6578;
      font-size: 13px;
      line-height: 1.6;
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
    }

    .similar-export-badge {
      flex-shrink: 0;
      padding: 8px 14px;
      border: 1px solid #7f8aa1;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
    }

    .similar-export-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px 18px;
      margin-top: 22px;
    }

    .similar-export-meta-label,
    .similar-export-section-label,
    .similar-export-question-label,
    .similar-export-score,
    .similar-export-note,
    .similar-export-warning {
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
    }

    .similar-export-meta-label {
      margin-bottom: 8px;
      color: #5a6578;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    .similar-export-meta-line {
      min-height: 24px;
      border-bottom: 1px solid #aeb8c7;
      font-size: 16px;
    }

    .similar-export-note,
    .similar-export-warning {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid #d8d1c5;
      background: rgba(255, 255, 255, 0.72);
      color: #596270;
      font-size: 12px;
      line-height: 1.8;
    }

    .similar-export-section,
    .similar-export-problem-card {
      margin-top: 22px;
      padding: 24px 24px 26px;
      border: 1px solid #d6cec1;
      background: rgba(255, 255, 255, 0.9);
    }

    .similar-export-section-compact {
      padding-top: 20px;
      padding-bottom: 22px;
    }

    .similar-export-section-label {
      display: inline-block;
      padding: 5px 10px;
      border: 1px solid #9eb0c9;
      background: #f2f6fb;
      color: #41536e;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .similar-export-section-title {
      margin: 16px 0 14px;
      font-size: 26px;
      line-height: 1.2;
    }

    .similar-export-problem-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .similar-export-score {
      padding: 6px 12px;
      border: 1px solid #d0d8e2;
      color: #435168;
      font-size: 12px;
    }

    .similar-export-question-heading {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-top: 20px;
    }

    .similar-export-question-number {
      display: inline-flex;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      border: 1px solid #212a39;
      font-size: 18px;
      font-weight: 700;
    }

    .similar-export-question-label {
      color: #667489;
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .similar-export-question-title {
      margin: 8px 0 0;
      font-size: 28px;
      line-height: 1.25;
    }

    .similar-export-problem-body {
      margin-top: 18px;
    }

    .similar-export-answer-lines {
      display: grid;
      gap: 18px;
      margin-top: 36px;
    }

    .similar-export-answer-line {
      height: 26px;
      border-bottom: 1px solid #c9c1b4;
    }

    .similar-export-markdown {
      color: #121826;
      font-size: 19px;
      line-height: 1.9;
      word-break: keep-all;
      overflow-wrap: break-word;
    }

    .similar-export-markdown p,
    .similar-export-markdown ol,
    .similar-export-markdown ul,
    .similar-export-markdown blockquote,
    .similar-export-display-math {
      margin: 0 0 14px;
    }

    .similar-export-markdown ol,
    .similar-export-markdown ul {
      padding-left: 28px;
    }

    .similar-export-markdown li {
      margin-bottom: 8px;
    }

    .similar-export-markdown .katex {
      font-size: 1.05em;
    }

    .similar-export-markdown .katex-display,
    .similar-export-display-math .katex-display {
      margin: 0.7em 0;
      overflow: visible;
      text-align: center;
    }

    .similar-export-markdown .katex-display > .katex,
    .similar-export-display-math .katex-display > .katex {
      white-space: nowrap;
      max-width: 100%;
    }

    .similar-export-markdown .katex-html,
    .similar-export-display-math .katex-html {
      white-space: nowrap;
    }
  `;
}

export function buildSimilarExportHtml(payload: SimilarExportPayload) {
  const includeSolution = payload.mode === "problem-with-solution";
  const sourceProblem = payload.includeOriginalProblem ? payload.sourceProblem?.trim() ?? "" : "";
  const sheetTitle = payload.meta.examTitle.trim() || payload.title;
  const katexBaseUrl = pathToFileURL(path.join(process.cwd(), "node_modules", "katex", "dist") + path.sep).href;

  const originalSection = sourceProblem
    ? renderSection("Original Problem", "원본 문제", sourceProblem)
    : "";

  const answerLines = includeSolution
    ? ""
    : `
      <div class="similar-export-answer-lines" aria-hidden="true">
        <div class="similar-export-answer-line"></div>
        <div class="similar-export-answer-line"></div>
        <div class="similar-export-answer-line"></div>
        <div class="similar-export-answer-line"></div>
        <div class="similar-export-answer-line"></div>
        <div class="similar-export-answer-line"></div>
      </div>
    `;

  const solutionPages = includeSolution
    ? `
      <article class="similar-export-sheet" data-export-sheet="true">
        <div class="similar-export-paper">
          ${renderSection("Answer", "정답", payload.answer || "정답 정보가 없습니다.", true)}
          ${renderSection("Solution", "풀이", payload.solution || "풀이 정보가 없습니다.")}
          ${renderSection(
            payload.solutionStyle === "handwritten-future" ? "Handwriting Ready" : "Variation Note",
            payload.solutionStyle === "handwritten-future" ? "손풀이 확장 메모" : "변형 포인트",
            payload.variationNote || "변형 포인트 정보가 없습니다.",
            true,
          )}
        </div>
      </article>
    `
    : "";

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${katexBaseUrl}" />
    <link rel="stylesheet" href="katex.min.css" />
    <title>${escapeHtml(sheetTitle)}</title>
    <style>${buildExportStyles()}</style>
  </head>
  <body>
    <div class="similar-export-shell">
      <article class="similar-export-sheet" data-export-sheet="true">
        <div class="similar-export-paper">
          <header class="similar-export-header">
            <div class="similar-export-kicker">SIMILAR TEST SHEET</div>
            <div class="similar-export-heading-row">
              <div>
                <h1 class="similar-export-title">${escapeHtml(sheetTitle)}</h1>
                <p class="similar-export-subtitle">
                  ${
                    includeSolution
                      ? "문제와 풀이가 함께 포함된 해설형 출력본"
                      : "시험지 스타일의 문제 출력본"
                  }
                </p>
              </div>
              <div class="similar-export-badge">${includeSolution ? "해설 포함" : "문제지"}</div>
            </div>
            <div class="similar-export-meta-grid">
              ${renderMetaField("학교", payload.meta.school)}
              ${renderMetaField("학년", payload.meta.grade)}
              ${renderMetaField("이름", payload.meta.studentName)}
              ${renderMetaField("날짜", payload.meta.examDate)}
              ${renderMetaField("회차", payload.meta.round)}
              ${renderMetaField("형식", includeSolution ? "문제 + 풀이" : "문제만")}
            </div>
          </header>

          <div class="similar-export-note">
            export는 웹 화면과 분리된 전용 시험지 템플릿으로 렌더링되며, 수식은 서버에서 KaTeX 기준으로 고정 렌더링됩니다.
          </div>

          ${originalSection}
        </div>
      </article>

      <article class="similar-export-sheet" data-export-sheet="true">
        <div class="similar-export-paper">
          <section class="similar-export-problem-card">
            <div class="similar-export-problem-topline">
              <div class="similar-export-section-label">Imitation Problem</div>
              <div class="similar-export-score">배점 4점</div>
            </div>

            <div class="similar-export-question-heading">
              <span class="similar-export-question-number">1</span>
              <div>
                <div class="similar-export-question-label">유사문제</div>
                <h2 class="similar-export-question-title">${escapeHtml(payload.title)}</h2>
              </div>
            </div>

            <div class="similar-export-markdown similar-export-problem-body">
              ${renderMarkdownLikeHtml(payload.problem)}
            </div>

            ${answerLines}
          </section>

          <div class="similar-export-warning">${escapeHtml(payload.warning)}</div>
        </div>
      </article>

      ${solutionPages}
    </div>
  </body>
</html>`;
}
