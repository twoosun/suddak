import Link from "next/link";
import { BookOpenCheck, FileText, PenLine } from "lucide-react";

import {
  JUNE_MOCK_ANALYSIS_ENABLED,
  JUNE_MOCK_ANALYSIS_URL,
} from "@/lib/juneMockAnalysis";

export default function JuneMockAnalysisBanner() {
  if (!JUNE_MOCK_ANALYSIS_ENABLED) return null;

  return (
    <section className="june-mock-banner-wrap" aria-label="기말고사 대비 수특수완 변형문제">
      <Link href={JUNE_MOCK_ANALYSIS_URL} className="june-mock-banner">
        <div className="june-mock-banner-copy">
          <div className="june-mock-banner-kicker">
            <span>기말 대비</span>
            수특수완 변형문제 탑재
          </div>
          <h2>기말고사 대비 수특수완 변형문제 탑재!</h2>
          <p>
            내신 시험에 자주 나오는 수특수완 핵심 유형을 변형문제로 바로 연습해 보세요.
            내신딱딱에서 단원별로 빠르게 확인할 수 있어요.
          </p>
        </div>

        <div className="june-mock-banner-side" aria-hidden="true">
          <span className="june-mock-new">NEW</span>
          <div className="june-mock-icon-board">
            <FileText size={28} />
            <BookOpenCheck size={24} />
            <PenLine size={22} />
          </div>
        </div>

        <span className="june-mock-banner-button">내신딱딱 바로가기</span>
      </Link>
    </section>
  );
}
