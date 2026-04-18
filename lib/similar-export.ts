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
