const STORAGE_KEY = "suddak_history_metadata_v1";

export type CachedHistoryMetadata = {
  historyId: number;
  subjectLabel: string;
  subtopic: string;
  difficulty: "easy" | "medium" | "hard";
  difficultyLabel: string;
  savedAt: string;
};

function isCachedHistoryMetadata(value: unknown): value is CachedHistoryMetadata {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.historyId === "number" &&
    typeof record.subjectLabel === "string" &&
    typeof record.subtopic === "string" &&
    (record.difficulty === "easy" || record.difficulty === "medium" || record.difficulty === "hard") &&
    typeof record.difficultyLabel === "string" &&
    typeof record.savedAt === "string"
  );
}

export function getStoredHistoryMetadata() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCachedHistoryMetadata);
  } catch {
    return [];
  }
}

export function getHistoryMetadataMap() {
  return new Map(getStoredHistoryMetadata().map((item) => [item.historyId, item]));
}

export function saveHistoryMetadata(item: Omit<CachedHistoryMetadata, "savedAt">) {
  if (typeof window === "undefined") return;

  const nextItem: CachedHistoryMetadata = {
    ...item,
    savedAt: new Date().toISOString(),
  };

  const deduped = getStoredHistoryMetadata().filter((entry) => entry.historyId !== item.historyId);
  const nextItems = [nextItem, ...deduped].slice(0, 200);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}
