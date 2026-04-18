import { type WorksheetProblemItem } from "@/lib/worksheet";
import { type SimilarResult } from "@/types/similar";

const STORAGE_KEY = "suddak_similar_history_v1";

export type StoredSimilarHistoryItem = {
  id: string;
  createdAt: string;
  sourceHistoryId: number | null;
  sourceActionType: "read" | "solve" | null;
  sourceProblem: string;
  title: string;
  problem: string;
  answer: string;
  solution: string;
  variationNote: string;
  warning: string;
};

function isStoredSimilarHistoryItem(value: unknown): value is StoredSimilarHistoryItem {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    (typeof record.sourceHistoryId === "number" || record.sourceHistoryId === null) &&
    (record.sourceActionType === "read" ||
      record.sourceActionType === "solve" ||
      record.sourceActionType === null) &&
    typeof record.sourceProblem === "string" &&
    typeof record.title === "string" &&
    typeof record.problem === "string" &&
    typeof record.answer === "string" &&
    typeof record.solution === "string" &&
    typeof record.variationNote === "string" &&
    typeof record.warning === "string"
  );
}

export function getStoredSimilarHistory() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredSimilarHistoryItem);
  } catch {
    return [];
  }
}

export function saveSimilarHistoryItem(params: {
  sourceHistoryId: number | null;
  sourceActionType: "read" | "solve" | null;
  sourceProblem: string;
  result: SimilarResult;
}) {
  if (typeof window === "undefined") return null;

  const nextItem: StoredSimilarHistoryItem = {
    id: `similar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    sourceHistoryId: params.sourceHistoryId,
    sourceActionType: params.sourceActionType,
    sourceProblem: params.sourceProblem,
    title: params.result.title,
    problem: params.result.problem,
    answer: params.result.answer,
    solution: params.result.solution,
    variationNote: params.result.variationNote,
    warning: params.result.warning,
  };

  const items = [nextItem, ...getStoredSimilarHistory()].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return nextItem;
}

export function toWorksheetProblem(item: StoredSimilarHistoryItem): WorksheetProblemItem {
  return {
    id: item.id,
    title: item.title,
    problem: item.problem,
    historyCode: item.sourceHistoryId ? `H-${item.sourceHistoryId}` : item.id.slice(-6).toUpperCase(),
    answer: item.answer,
    solution: item.solution,
    variationNote: item.variationNote,
    warning: item.warning,
  };
}
