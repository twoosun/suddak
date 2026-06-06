import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";

import { JUNE_MOCK_OFFICIAL_SOURCE_URL } from "@/lib/juneMockAnalysis";

type Props = {
  compact?: boolean;
  sourceLocation?: string;
};

export default function OfficialSourceCard({
  compact = false,
  sourceLocation,
}: Props) {
  return (
    <section className="suddak-card june-analysis-source-card">
      <div className="june-analysis-source-icon" aria-hidden="true">
        <FileText size={24} />
      </div>
      <div className="june-analysis-source-copy">
        <span className="june-analysis-overline">출처: 한국교육과정평가원</span>
        <h2>원문 문제 확인하기</h2>
        <p>
          평가원 원문 문제지는 공식 페이지에서 확인해 주세요. 수딱에서는 문항의 핵심
          아이디어와 풀이 흐름을 정리합니다.
        </p>
        {!compact && (
          <ul>
            {sourceLocation ? <li>{sourceLocation}</li> : null}
            <li>공식 문제지에서 해당 문항을 확인한 뒤 분석을 읽어 보세요.</li>
          </ul>
        )}
      </div>
      <Link
        href={JUNE_MOCK_OFFICIAL_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="suddak-btn suddak-btn-primary june-analysis-source-link"
      >
        평가원 공식 원문 열기
        <ExternalLink size={16} />
      </Link>
    </section>
  );
}
