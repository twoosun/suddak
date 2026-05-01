import type { BlueprintItem } from "./types";

export function getTotalScore(items: BlueprintItem[]) {
  return items.reduce((sum, item) => sum + item.score, 0);
}

export function getSimilarityRiskLabel(transformStrength: BlueprintItem["transformStrength"]) {
  if (transformStrength === "높음") return "안전 재구성";
  if (transformStrength === "중간") return "표현 점검";
  return "유사도 주의";
}
