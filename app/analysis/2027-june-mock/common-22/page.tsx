import type { Metadata } from "next";

import JuneMockDetailPage from "@/components/analysis/JuneMockDetailPage";
import { getJuneMockAnalysisProblem } from "@/lib/juneMockAnalysis";

export const metadata: Metadata = {
  title: "2027학년도 6월 모평 공통 22번 분석 | 수딱",
  description:
    "귀납적으로 정의된 수열에서 목표값에 도달하는 경로를 분류하는 공통 22번의 핵심 풀이를 정리합니다.",
};

export default function Common22AnalysisPage() {
  const problem = getJuneMockAnalysisProblem("common-22");

  if (!problem) return null;

  return <JuneMockDetailPage problem={problem} />;
}
