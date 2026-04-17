type BuildSimilarProblemUrlParams = {
  historyId?: number | null;
  source?: string | null;
};

export function buildSimilarProblemUrl(params: BuildSimilarProblemUrlParams) {
  const searchParams = new URLSearchParams();

  if (params.historyId) {
    searchParams.set("historyId", String(params.historyId));
  }

  if (params.source?.trim()) {
    searchParams.set("source", params.source.trim());
  }

  const query = searchParams.toString();
  return query ? `/similar?${query}` : "/similar";
}
