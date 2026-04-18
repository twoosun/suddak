import { access } from "node:fs/promises";

import chromium from "@sparticuz/chromium";
import { AlignmentType, Document, ImageRun, Packer, Paragraph } from "docx";
import { type Browser } from "puppeteer-core";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";

import { buildSimilarExportHtml } from "@/lib/similar-export-renderer";
import {
  buildExportFilename,
  type SimilarExportFormat,
  type SimilarExportPayload,
} from "@/lib/similar-export";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRequestBody = {
  format?: SimilarExportFormat;
  payload?: SimilarExportPayload;
};

async function getUserFromRequest(req: NextRequest) {
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

function normalizePayload(payload: SimilarExportPayload | undefined) {
  if (!payload) return null;

  return {
    title: String(payload.title || "").trim().slice(0, 200),
    warning: String(payload.warning || "").trim().slice(0, 1000),
    historyCode: String(payload.historyCode || "").trim().slice(0, 40),
    sourceProblem: String(payload.sourceProblem || "").trim().slice(0, 20000),
    problem: String(payload.problem || "").trim().slice(0, 20000),
    answer: String(payload.answer || "").trim().slice(0, 4000),
    solution: String(payload.solution || "").trim().slice(0, 20000),
    variationNote: String(payload.variationNote || "").trim().slice(0, 8000),
    includeOriginalProblem: Boolean(payload.includeOriginalProblem),
    mode: payload.mode === "problem-with-solution" ? "problem-with-solution" : "problem-only",
    layoutStyle: payload.layoutStyle === "naesin" ? "naesin" : "suneung",
    solutionStyle:
      payload.solutionStyle === "handwritten-future" ? "handwritten-future" : "typeset",
    meta: {
      school: String(payload.meta?.school || "").trim().slice(0, 100),
      grade: String(payload.meta?.grade || "").trim().slice(0, 100),
      studentName: String(payload.meta?.studentName || "").trim().slice(0, 100),
      examTitle: String(payload.meta?.examTitle || "").trim().slice(0, 200),
      examDate: String(payload.meta?.examDate || "").trim().slice(0, 100),
      round: String(payload.meta?.round || "").trim().slice(0, 100),
    },
  } satisfies SimilarExportPayload;
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromeExecutablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return chromium.executablePath();
}

async function launchBrowser() {
  const executablePath = await resolveChromeExecutablePath();
  const bundledChromiumPath = await chromium.executablePath();
  const useBundledChromium = executablePath === bundledChromiumPath;

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: useBundledChromium ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: {
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    },
  });
}

async function renderExportPage(browser: Browser, payload: SimilarExportPayload) {
  const page = await browser.newPage();

  try {
    await page.setContent(buildSimilarExportHtml(payload), {
      waitUntil: "load",
    });
    await page.emulateMediaType("screen");
    await page.evaluateHandle("document.fonts.ready");
    return page;
  } catch (error) {
    await page.close();
    throw error;
  }
}

async function buildPdfBuffer(browser: Browser, payload: SimilarExportPayload) {
  const page = await renderExportPage(browser, payload);

  try {
    const sectionHandles = await page.$$("[data-export-sheet='true']");
    const screenshots = await Promise.all(
      sectionHandles.map((handle) => handle.screenshot({ type: "png" })),
    );

    const pdfPage = await browser.newPage();

    try {
      const screenshotMarkup = screenshots
        .map((screenshot) => {
          const dataUrl = `data:image/png;base64,${Buffer.from(screenshot).toString("base64")}`;
          return `<section class="pdf-sheet"><img src="${dataUrl}" alt="" /></section>`;
        })
        .join("");

      await pdfPage.setContent(
        `<!doctype html>
        <html lang="ko">
          <head>
            <meta charset="utf-8" />
            <style>
              @page {
                size: A4;
                margin: 0;
              }

              html, body {
                margin: 0;
                padding: 0;
                background: #fff;
              }

              .pdf-sheet {
                width: 794px;
                height: 1123px;
                page-break-after: always;
                break-after: page;
              }

              .pdf-sheet:last-child {
                page-break-after: auto;
                break-after: auto;
              }

              .pdf-sheet img {
                display: block;
                width: 794px;
                height: 1123px;
              }
            </style>
          </head>
          <body>${screenshotMarkup}</body>
        </html>`,
        { waitUntil: "load" },
      );

      return Buffer.from(
        await pdfPage.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "0mm",
            right: "0mm",
            bottom: "0mm",
            left: "0mm",
          },
        }),
      );
    } finally {
      await pdfPage.close();
    }
  } finally {
    await page.close();
  }
}

async function buildDocxBuffer(browser: Browser, payload: SimilarExportPayload) {
  const page = await renderExportPage(browser, payload);

  try {
    const sectionHandles = await page.$$("[data-export-sheet='true']");
    const screenshots = await Promise.all(
      sectionHandles.map((handle) => handle.screenshot({ type: "png" })),
    );

    const document = new Document({
      sections: screenshots.map((imageBuffer) => ({
        properties: {
          page: {
            margin: {
              top: 360,
              right: 360,
              bottom: 360,
              left: 360,
            },
            size: {
              width: 11906,
              height: 16838,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageBuffer,
                type: "png",
                transformation: {
                  width: 718,
                  height: 1016,
                },
              }),
            ],
          }),
        ],
      })),
    });

    return Buffer.from(await Packer.toBuffer(document));
  } finally {
    await page.close();
  }
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null;

  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await req.json()) as ExportRequestBody;
    const format = body.format === "docx" ? "docx" : body.format === "pdf" ? "pdf" : null;
    const payload = normalizePayload(body.payload);

    if (!format || !payload || !payload.problem) {
      return Response.json({ error: "export 요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    browser = await launchBrowser();
    const buffer =
      format === "pdf"
        ? await buildPdfBuffer(browser, payload)
        : await buildDocxBuffer(browser, payload);
    const filename = buildExportFilename(
      payload.meta.examTitle || payload.title,
      payload.mode,
      format,
    );

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/similar/export][POST] error:", error);
    return Response.json(
      { error: "export 파일을 생성하는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
