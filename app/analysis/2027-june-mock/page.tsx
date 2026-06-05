import type { Metadata } from "next";

import JuneMockFeaturedProblem from "@/components/analysis/JuneMockFeaturedProblem";
import JuneMockHero from "@/components/analysis/JuneMockHero";
import JuneMockProblemGrid from "@/components/analysis/JuneMockProblemGrid";
import JuneMockSummaryCards from "@/components/analysis/JuneMockSummaryCards";
import JuneMockUpdateSection from "@/components/analysis/JuneMockUpdateSection";
import PageContainer from "@/components/common/PageContainer";

export const metadata: Metadata = {
  title: "2027학년도 6월 모평 수학 분석 & 유사문항 | 수딱",
  description:
    "2027학년도 6월 평가원 모의고사 수학 주요 문항의 핵심 아이디어를 정리하고, 수딱 자체 제작 유사문항으로 복습해 보세요.",
};

export default function JuneMockAnalysisPage() {
  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <div className="june-analysis-page">
        <JuneMockHero />
        <JuneMockSummaryCards />
        <JuneMockProblemGrid />
        <JuneMockFeaturedProblem />
        <JuneMockUpdateSection />
      </div>
    </PageContainer>
  );
}
