import Link from "next/link";
import { BarChart3, FileText, PenLine } from "lucide-react";

import {
  JUNE_MOCK_ANALYSIS_ENABLED,
  JUNE_MOCK_ANALYSIS_URL,
} from "@/lib/juneMockAnalysis";

export default function JuneMockAnalysisBanner() {
  if (!JUNE_MOCK_ANALYSIS_ENABLED) return null;

  return (
    <section className="june-mock-banner-wrap" aria-label="2027학년도 6월 평가원 모의고사 수학 분석">
      <Link href={JUNE_MOCK_ANALYSIS_URL} className="june-mock-banner">
        <div className="june-mock-banner-copy">
          <div className="june-mock-banner-kicker">
            <span>6평 특집</span>
            2027학년도 6월 평가원 모의고사
          </div>
          <h2>6평 수학 분석 & 유사문항 공개</h2>
          <p>
            공통 22번부터 주요 문항의 핵심 아이디어를 확인하고, 수딱 자체 제작
            유사문항으로 바로 복습해 보세요.
          </p>
        </div>

        <div className="june-mock-banner-side" aria-hidden="true">
          <span className="june-mock-new">NEW</span>
          <div className="june-mock-icon-board">
            <FileText size={28} />
            <BarChart3 size={24} />
            <PenLine size={22} />
          </div>
        </div>

        <span className="june-mock-banner-button">분석 보러 가기</span>
      </Link>
    </section>
  );
}
