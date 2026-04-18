import katex from "katex";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeMathMarkdown } from "@/lib/math-markdown";
import { type SimilarExportPayload } from "@/lib/similar-export";
import { parseWorksheetProblem } from "@/lib/worksheet";

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
  const normalized = normalizeMathMarkdown(content).trim();
  if (!normalized) return "<p>내용이 없습니다.</p>";

  const blocks = normalized.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return "";

      if (trimmedBlock.startsWith("$$") && trimmedBlock.endsWith("$$")) {
        const expression = trimmedBlock.slice(2, -2).trim();
        return `<div class="worksheet-display-math">${renderMathExpression(expression, true)}</div>`;
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

function renderChoiceRow(choices: string[]) {
  if (choices.length === 0) return "";

  return `
    <div class="worksheet-choice-row">
      ${choices
        .map(
          (choice, index) => `
            <div class="worksheet-choice-item">
              <span class="worksheet-choice-marker">${index + 1}.</span>
              <span class="worksheet-choice-content">${renderInlineRichText(choice)}</span>
            </div>`,
        )
        .join("")}
    </div>
  `;
}

function buildStyles() {
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
      background: #d8d6d1;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family:
        "KoPub Batang",
        "KoPubWorld Batang",
        "Noto Serif KR",
        "Nanum Myeongjo",
        "Batang",
        serif;
    }

    .worksheet-shell {
      display: grid;
      gap: 24px;
    }

    .worksheet-sheet {
      width: 794px;
      min-height: 1123px;
      page-break-after: always;
      break-after: page;
    }

    .worksheet-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .worksheet-paper {
      position: relative;
      width: 794px;
      min-height: 1123px;
      overflow: hidden;
      background: #fff;
    }

    .worksheet-paper-cover {
      padding: 56px 48px;
      background: linear-gradient(180deg, #fefefe 0%, #fbfbf7 100%);
    }

    .worksheet-header {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      min-height: 220px;
      border-top: 1px solid #d7d7d7;
    }

    .worksheet-header-band {
      background: linear-gradient(180deg, #d7f4cf 0%, #eef9e8 100%);
      border-right: 1px solid #d9d9d9;
      display: flex;
      align-items: flex-start;
      padding: 18px 10px;
    }

    .worksheet-header-band-label,
    .worksheet-header-badge,
    .worksheet-header-subtitle,
    .worksheet-meta-item,
    .worksheet-history-code,
    .worksheet-solution-label,
    .worksheet-solution-index,
    .worksheet-solution-block-label,
    .worksheet-solution-note,
    .worksheet-solution-warning {
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
    }

    .worksheet-header-band-label {
      color: #1a9f48;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .worksheet-header-main {
      padding: 18px 24px 0;
    }

    .worksheet-header-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .worksheet-header-title {
      margin: 0;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .worksheet-header-badge {
      border: 1px solid #6fcf7e;
      color: #1d9b47;
      background: #f5fff5;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
    }

    .worksheet-header-subtitle {
      margin: 14px 0 0;
      color: #5f665f;
      font-size: 13px;
      line-height: 1.7;
    }

    .worksheet-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 18px;
      margin-top: 24px;
    }

    .worksheet-meta-item {
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: #555;
    }

    .worksheet-meta-line {
      min-height: 22px;
      border-bottom: 1px solid #bfc5bf;
      color: #111;
      font-size: 15px;
    }

    .worksheet-paper-suneung {
      padding: 36px 44px 48px;
    }

    .worksheet-suneung-frame {
      position: absolute;
      top: 120px;
      bottom: 42px;
      left: 88px;
      width: 1px;
      background: #dfdfdf;
    }

    .worksheet-suneung-topline {
      position: absolute;
      top: 66px;
      left: 0;
      right: 0;
      height: 1px;
      background: #dfdfdf;
    }

    .worksheet-suneung-sidebar {
      position: absolute;
      left: 32px;
      bottom: 110px;
      color: #38a156;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
      font-size: 10px;
      letter-spacing: 0.18em;
    }

    .worksheet-history-code {
      position: absolute;
      top: 80px;
      right: 62px;
      color: rgba(0, 0, 0, 0.35);
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    .worksheet-history-code-naesin {
      position: static;
      color: rgba(0, 0, 0, 0.28);
      font-size: 10px;
    }

    .worksheet-problem-head-suneung {
      margin-left: 62px;
      padding-top: 68px;
    }

    .worksheet-problem-number {
      color: #21a446;
      font-size: 36px;
      font-weight: 700;
      line-height: 1;
    }

    .worksheet-problem-body-shell-suneung {
      margin: 16px 44px 0 62px;
    }

    .worksheet-paper-naesin {
      padding: 18px 14px 14px;
    }

    .worksheet-naesin-grid {
      position: relative;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      min-height: 1024px;
      border: 1px solid #d3d3d3;
    }

    .worksheet-naesin-grid::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 1px;
      background: #b9b9b9;
      transform: translateX(-0.5px);
      pointer-events: none;
    }

    .worksheet-naesin-cell {
      padding: 14px 14px 12px;
      overflow: hidden;
    }

    .worksheet-naesin-cell-empty {
      background: linear-gradient(180deg, rgba(248, 248, 248, 0.7), rgba(255, 255, 255, 0.9));
    }

    .worksheet-naesin-cell-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .worksheet-naesin-chip {
      font-size: 15px;
      font-weight: 700;
    }

    .worksheet-paper-solution {
      padding: 40px 44px;
      background: linear-gradient(180deg, #fffefa 0%, #faf7ef 100%);
    }

    .worksheet-solution-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .worksheet-solution-label {
      color: #1c8c43;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .worksheet-solution-index {
      color: #666;
      font-size: 12px;
      font-weight: 700;
    }

    .worksheet-solution-title {
      margin: 0 0 22px;
      font-size: 28px;
      line-height: 1.3;
    }

    .worksheet-solution-block {
      margin-top: 16px;
      border: 1px solid #d8d0bf;
      background: rgba(255, 255, 255, 0.85);
      padding: 18px 20px;
    }

    .worksheet-solution-block-label {
      margin-bottom: 10px;
      color: #666;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .worksheet-solution-note,
    .worksheet-solution-warning {
      font-size: 14px;
      line-height: 1.8;
    }

    .worksheet-solution-warning {
      margin-top: 16px;
      padding: 14px 16px;
      border: 1px solid #dfd8c8;
      background: rgba(255, 255, 255, 0.8);
      color: #666;
    }

    .worksheet-choice-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      align-items: start;
      margin-top: 16px;
    }

    .worksheet-choice-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
      font-size: 13px;
      line-height: 1.35;
    }

    .worksheet-choice-marker {
      flex: 0 0 auto;
      min-width: 18px;
      font-family:
        "Malgun Gothic",
        "Apple SD Gothic Neo",
        "Noto Sans KR",
        sans-serif;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.6;
    }

    .worksheet-choice-content {
      min-width: 0;
    }

    .worksheet-problem-markdown {
      color: #111;
      word-break: keep-all;
      overflow-wrap: break-word;
    }

    .worksheet-problem-markdown-suneung {
      font-size: 15px;
      line-height: 1.48;
      min-height: 0;
    }

    .worksheet-problem-markdown-naesin {
      font-size: 13px;
      line-height: 1.42;
      max-height: 418px;
      overflow: hidden;
    }

    .worksheet-problem-markdown p,
    .worksheet-problem-markdown ol,
    .worksheet-problem-markdown ul,
    .worksheet-display-math {
      margin: 0 0 6px;
    }

    .worksheet-problem-markdown ol,
    .worksheet-problem-markdown ul {
      padding-left: 24px;
    }

    .worksheet-problem-markdown li {
      margin-bottom: 3px;
    }

    .worksheet-problem-markdown .katex {
      font-size: 0.9em;
    }

    .worksheet-choice-content .katex {
      font-size: 0.85em;
    }

    .worksheet-problem-markdown .katex-display,
    .worksheet-display-math .katex-display,
    .worksheet-choice-content .katex-display {
      margin: 0.28em 0;
      overflow: visible;
      text-align: center;
    }

    .worksheet-problem-markdown .katex-display > .katex,
    .worksheet-display-math .katex-display > .katex,
    .worksheet-choice-content .katex-display > .katex {
      display: inline-block;
      max-width: 100%;
      white-space: nowrap;
      transform-origin: center top;
      transform: scale(0.96);
    }

    .worksheet-problem-markdown .katex-html,
    .worksheet-display-math .katex-html,
    .worksheet-choice-content .katex-html {
      white-space: nowrap;
    }

    .worksheet-problem-markdown-naesin .katex-display > .katex {
      transform: scale(0.88);
    }
  `;
}

function renderMetaRow(label: string, value: string) {
  return `
    <div class="worksheet-meta-item">
      <span>${escapeHtml(label)}</span>
      <span class="worksheet-meta-line">${escapeHtml(value)}</span>
    </div>
  `;
}

function renderHeader(payload: SimilarExportPayload, title: string) {
  const subtitle =
    payload.layoutStyle === "suneung"
      ? "한 페이지에 한 문제를 배치해 풀이 공간을 넉넉하게 확보한 수능형"
      : "한 페이지당 네 문제를 2x2로 배치한 내신형";

  return `
    <article class="worksheet-sheet" data-export-sheet="true">
      <div class="worksheet-paper worksheet-paper-cover">
        <header class="worksheet-header">
          <div class="worksheet-header-band">
            <div class="worksheet-header-band-label">${payload.layoutStyle === "suneung" ? "LECTURE 01" : "MOCK TEST"}</div>
          </div>
          <div class="worksheet-header-main">
            <div class="worksheet-header-title-row">
              <h1 class="worksheet-header-title">${escapeHtml(title)}</h1>
              <span class="worksheet-header-badge">${payload.layoutStyle === "suneung" ? "수능형" : "내신형"}</span>
            </div>
            <p class="worksheet-header-subtitle">${subtitle}</p>
            <div class="worksheet-meta-grid">
              ${renderMetaRow("학교", payload.meta.school)}
              ${renderMetaRow("학년", payload.meta.grade)}
              ${renderMetaRow("이름", payload.meta.studentName)}
              ${renderMetaRow("시험명", payload.meta.examTitle)}
              ${renderMetaRow("날짜", payload.meta.examDate)}
              ${renderMetaRow("회차", payload.meta.round)}
            </div>
          </div>
        </header>
      </div>
    </article>
  `;
}

function renderSuneungPage(index: number, problem: string, historyCode?: string) {
  const parsed = parseWorksheetProblem(problem);

  return `
    <article class="worksheet-sheet" data-export-sheet="true">
      <div class="worksheet-paper worksheet-paper-suneung">
        <div class="worksheet-suneung-frame"></div>
        <div class="worksheet-suneung-topline"></div>
        <div class="worksheet-suneung-sidebar"><span>SUDAK AI WORKSHEET</span></div>
        <div class="worksheet-history-code">${escapeHtml(historyCode || "")}</div>
        <div class="worksheet-problem-head worksheet-problem-head-suneung">
          <div class="worksheet-problem-number">${String(index + 1).padStart(2, "0")}</div>
        </div>
        <div class="worksheet-problem-body-shell-suneung">
          <div class="worksheet-problem-markdown worksheet-problem-markdown-suneung">${renderMarkdownLikeHtml(parsed.body)}</div>
          ${renderChoiceRow(parsed.choices)}
        </div>
      </div>
    </article>
  `;
}

function renderNaesinPage(problem: string, historyCode?: string) {
  const parsed = parseWorksheetProblem(problem);

  return `
    <article class="worksheet-sheet" data-export-sheet="true">
      <div class="worksheet-paper worksheet-paper-naesin">
        <div class="worksheet-naesin-grid">
          <section class="worksheet-naesin-cell">
            <div class="worksheet-naesin-cell-head">
              <span class="worksheet-naesin-chip">1번</span>
              <span class="worksheet-history-code worksheet-history-code-naesin">${escapeHtml(historyCode || "")}</span>
            </div>
            <div class="worksheet-problem-markdown worksheet-problem-markdown-naesin">${renderMarkdownLikeHtml(parsed.body)}</div>
            ${renderChoiceRow(parsed.choices)}
          </section>
          <section class="worksheet-naesin-cell worksheet-naesin-cell-empty"><div class="worksheet-naesin-empty"></div></section>
          <section class="worksheet-naesin-cell worksheet-naesin-cell-empty"><div class="worksheet-naesin-empty"></div></section>
          <section class="worksheet-naesin-cell worksheet-naesin-cell-empty"><div class="worksheet-naesin-empty"></div></section>
        </div>
      </div>
    </article>
  `;
}

function renderSolutionPage(payload: SimilarExportPayload) {
  if (payload.mode !== "problem-with-solution") return "";

  return `
    <article class="worksheet-sheet" data-export-sheet="true">
      <div class="worksheet-paper worksheet-paper-solution">
        <div class="worksheet-solution-top">
          <span class="worksheet-solution-label">Solution</span>
          <span class="worksheet-solution-index">문항 1</span>
        </div>
        <h2 class="worksheet-solution-title">${escapeHtml(payload.title)}</h2>
        <div class="worksheet-solution-block">
          <div class="worksheet-solution-block-label">정답</div>
          <div class="worksheet-problem-markdown">${renderMarkdownLikeHtml(payload.answer || "정답 정보가 없습니다.")}</div>
        </div>
        <div class="worksheet-solution-block">
          <div class="worksheet-solution-block-label">풀이</div>
          <div class="worksheet-problem-markdown">${renderMarkdownLikeHtml(payload.solution || "풀이 정보가 없습니다.")}</div>
        </div>
        <div class="worksheet-solution-block">
          <div class="worksheet-solution-block-label">변형 포인트</div>
          <div class="worksheet-solution-note">${escapeHtml(payload.variationNote || "변형 메모가 없습니다.")}</div>
        </div>
        <div class="worksheet-solution-warning">${escapeHtml(payload.warning || "")}</div>
      </div>
    </article>
  `;
}

export function buildSimilarExportHtml(payload: SimilarExportPayload) {
  const title = payload.meta.examTitle.trim() || payload.title;
  const sourceProblem = payload.sourceProblem?.trim() ?? "";
  const katexBaseUrl = pathToFileURL(path.join(process.cwd(), "node_modules", "katex", "dist") + path.sep).href;

  const originalPage =
    payload.includeOriginalProblem && sourceProblem
      ? payload.layoutStyle === "suneung"
        ? renderSuneungPage(0, sourceProblem, payload.historyCode)
        : renderNaesinPage(sourceProblem, payload.historyCode)
      : "";

  const problemPage =
    payload.layoutStyle === "suneung"
      ? renderSuneungPage(0, payload.problem, payload.historyCode)
      : renderNaesinPage(payload.problem, payload.historyCode);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${katexBaseUrl}" />
    <link rel="stylesheet" href="katex.min.css" />
    <title>${escapeHtml(title)}</title>
    <style>${buildStyles()}</style>
  </head>
  <body>
    <div class="worksheet-shell">
      ${renderHeader(payload, title)}
      ${originalPage}
      ${problemPage}
      ${renderSolutionPage(payload)}
    </div>
  </body>
</html>`;
}
