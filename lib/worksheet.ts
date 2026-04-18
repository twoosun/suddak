export type WorksheetLayoutStyle = "suneung" | "naesin";

export type WorksheetProblemItem = {
  id: string;
  title: string;
  problem: string;
  sourceLabel?: string;
  answer?: string;
  solution?: string;
  variationNote?: string;
  warning?: string;
};

export function chunkWorksheetProblems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
