type ShareableHistoryItem = {
  id: number | string;
  recognized_text?: string | null;
  solve_result?: string | null;
};

type ShareableSolvePayload = {
  recognizedText?: string | null;
  solveResult?: string | null;
  title?: string;
  content?: string;
};

/* # 1. 제목 자동 생성 */
export function buildAutoProblemTitle(recognizedText?: string | null) {
  const base = (recognizedText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 26);

  return base ? `문제 공유 · ${base}` : "문제 공유";
}

/* # 2. 메인 풀이 결과 -> 커뮤니티 공유 URL */
export function buildShareUrlFromSolve(payload: ShareableSolvePayload) {
  const params = new URLSearchParams();

  params.set("post_type", "problem");
  params.set("title", payload.title || buildAutoProblemTitle(payload.recognizedText));
  params.set("content", payload.content || "수딱 메인 화면에서 공유한 문제입니다.");

  if (payload.recognizedText?.trim()) {
    params.set("recognized_text", payload.recognizedText.trim());
  }

  if (payload.solveResult?.trim()) {
    params.set("solve_result", payload.solveResult.trim());
  }

  return `/community/write?${params.toString()}`;
}

/* # 3. 히스토리 -> 커뮤니티 공유 URL */
export function buildShareUrlFromHistory(item: ShareableHistoryItem) {
  const params = new URLSearchParams();

  params.set("post_type", "problem");
  params.set("title", buildAutoProblemTitle(item.recognized_text || ""));
  params.set("content", "수딱 히스토리에서 공유한 문제입니다.");
  params.set("history_id", String(item.id));

  if (item.recognized_text?.trim()) {
    params.set("recognized_text", item.recognized_text.trim());
  }

  if (item.solve_result?.trim()) {
    params.set("solve_result", item.solve_result.trim());
  }

  return `/community/write?${params.toString()}`;
}