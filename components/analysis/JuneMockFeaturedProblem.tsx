import Link from "next/link";
import { ExternalLink, FileText, PenLine } from "lucide-react";

import {
  JUNE_MOCK_FEATURED_POINTS,
  JUNE_MOCK_OFFICIAL_SOURCE_URL,
} from "@/lib/juneMockAnalysis";

export default function JuneMockFeaturedProblem() {
  return (
    <section className="suddak-card june-analysis-featured">
      <div className="june-analysis-featured-copy">
        <span className="june-analysis-badge">첫 번째 공개 문항</span>
        <h2>공통 22번, 어디서부터 접근해야 할까요?</h2>
        <p>
          겉보기에는 복잡한 수열 문제처럼 보이지만, 핵심은 목표값에 도달하는 방법을
          출발점과 증가량에 따라 나누어 세는 것입니다.
        </p>
        <ul>
          {JUNE_MOCK_FEATURED_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="june-analysis-featured-actions">
        <Link href="/analysis/2027-june-mock/common-22" className="suddak-btn suddak-btn-primary">
          <FileText size={16} />
          공통 22번 분석 읽기
        </Link>
        <Link href="/analysis/2027-june-mock/common-22/practice" className="suddak-btn suddak-btn-ghost">
          <PenLine size={16} />
          유사문항 3제 풀기
        </Link>
        <Link
          href={JUNE_MOCK_OFFICIAL_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="suddak-btn suddak-btn-ghost"
        >
          평가원 공식 원문 보기
          <ExternalLink size={15} />
        </Link>
      </div>
    </section>
  );
}
