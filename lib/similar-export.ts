export type SimilarExportMode = "problem-only" | "problem-with-solution";

export type SimilarExportFormat = "pdf" | "docx";

export type SimilarExportSolutionStyle = "typeset" | "handwritten-future";

export type SimilarExportMeta = {
  school: string;
  grade: string;
  studentName: string;
  examTitle: string;
  examDate: string;
  round: string;
};

export type SimilarExportPayload = {
  title: string;
  warning: string;
  sourceProblem?: string;
  problem: string;
  answer: string;
  solution: string;
  variationNote: string;
  includeOriginalProblem: boolean;
  mode: SimilarExportMode;
  meta: SimilarExportMeta;
  solutionStyle: SimilarExportSolutionStyle;
};

export function sanitizeExportFilename(value: string) {
  const trimmed = value.trim() || "similar-problem";
  return trimmed
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function buildExportFilename(base: string, mode: SimilarExportMode, extension: string) {
  const filenameBase = sanitizeExportFilename(base);
  const suffix = mode === "problem-only" ? "problem" : "full";
  return `${filenameBase}-${suffix}.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function waitForExportReady(root: HTMLElement) {
  if ("fonts" in document && "ready" in document.fonts) {
    await document.fonts.ready;
  }

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export function dataUrlToUint8Array(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function parseContentDispositionFilename(value: string | null) {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = value.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return null;
}
