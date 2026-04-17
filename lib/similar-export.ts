export type SimilarExportMode = "problem-only" | "problem-with-solution";

type BuildSimilarExportDocumentParams = {
  title: string;
  bodyHtml: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeExportFilename(value: string) {
  const trimmed = value.trim() || "similar-problem";
  return trimmed
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function buildSimilarExportDocument({
  title,
  bodyHtml,
}: BuildSimilarExportDocumentParams) {
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      @page {
        size: A4;
        margin: 18mm 16mm 18mm 16mm;
      }

      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #111827;
        background: #ffffff;
        font-family:
          "Malgun Gothic",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          Arial,
          sans-serif;
        line-height: 1.8;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .paper {
        width: 100%;
        max-width: 820px;
        margin: 0 auto;
      }

      .sheet-header {
        border: 2.5px solid #111827;
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 18px;
        page-break-inside: avoid;
      }

      .sheet-header-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px 16px;
        background:
          linear-gradient(135deg, rgba(49, 87, 200, 0.08), rgba(255, 255, 255, 0.96)),
          #ffffff;
        border-bottom: 1.5px solid #111827;
      }

      .sheet-meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border-top: 1px solid #cbd5e1;
      }

      .sheet-meta-cell {
        min-height: 64px;
        padding: 10px 12px;
        border-right: 1px solid #cbd5e1;
        background: #ffffff;
      }

      .sheet-meta-cell:last-child {
        border-right: 0;
      }

      .sheet-brand {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #3157c8;
      }

      .sheet-title {
        margin: 8px 0 0;
        font-size: 26px;
        font-weight: 900;
        line-height: 1.2;
        letter-spacing: -0.04em;
      }

      .sheet-subtitle {
        margin: 8px 0 0;
        font-size: 13px;
        color: #4b5563;
      }

      .sheet-badge {
        flex-shrink: 0;
        border: 1.5px solid #94a3b8;
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 800;
        color: #334155;
        background: #ffffff;
      }

      .meta-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #64748b;
        text-transform: uppercase;
      }

      .meta-value {
        margin-top: 10px;
        min-height: 24px;
        border-bottom: 1px dashed #94a3b8;
      }

      .meta-value.filled {
        border-bottom-style: solid;
        font-size: 14px;
        font-weight: 800;
        color: #111827;
      }

      .exam-frame {
        border: 2px solid #111827;
        border-radius: 20px;
        padding: 18px;
        background:
          linear-gradient(180deg, rgba(248, 250, 252, 0.8), #ffffff 180px);
      }

      .exam-block {
        border: 1px solid #dbe2ea;
        border-radius: 18px;
        padding: 18px 20px;
        margin-bottom: 16px;
        page-break-inside: avoid;
      }

      .exam-block.problem {
        border-width: 2px;
        border-color: #111827;
        background: #ffffff;
      }

      .exam-label {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: #f3f6fb;
        border: 1px solid #d7e0ec;
        font-size: 12px;
        font-weight: 800;
        color: #334155;
      }

      .problem-number {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
        font-size: 16px;
        font-weight: 900;
      }

      .problem-number-main {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .problem-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: #111827;
        color: #ffffff;
        font-size: 15px;
      }

      .problem-score {
        flex-shrink: 0;
        min-width: 72px;
        text-align: center;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        font-size: 12px;
        font-weight: 800;
        color: #334155;
      }

      .problem-body {
        margin-top: 12px;
        font-size: 17px;
        line-height: 2;
        min-height: 220px;
      }

      .answer-lines {
        margin-top: 18px;
        display: grid;
        gap: 10px;
      }

      .answer-line {
        border-bottom: 1px dashed #cbd5e1;
        min-height: 20px;
      }

      .section-title {
        margin: 0 0 10px;
        font-size: 17px;
        font-weight: 900;
        letter-spacing: -0.03em;
      }

      .section-body {
        font-size: 15px;
        line-height: 1.95;
      }

      .beta-note {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        font-size: 12px;
        color: #475569;
      }

      .katex-display {
        overflow-x: auto;
        overflow-y: hidden;
        padding: 6px 0;
      }

      @media print {
        .paper {
          max-width: none;
        }
      }

      @media (max-width: 720px) {
        .sheet-header-top {
          flex-direction: column;
        }

        .sheet-meta-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .sheet-meta-cell:nth-child(2n) {
          border-right: 0;
        }

        .problem-number {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
}
