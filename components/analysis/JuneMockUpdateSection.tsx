import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { JUNE_MOCK_COMMUNITY_URL, JUNE_MOCK_UPDATE_STATUSES } from "@/lib/juneMockAnalysis";

export default function JuneMockUpdateSection() {
  return (
    <section className="suddak-card june-analysis-updates">
      <div className="june-analysis-section-head">
        <h2>분석 콘텐츠는 계속 추가됩니다</h2>
        <p>
          공통 문항부터 선택과목 주요 문항까지 차례대로 업데이트할 예정입니다.
          새로운 분석과 유사문항이 공개되면 SHub 공지에서 알려 드릴게요.
        </p>
      </div>
      <div className="june-analysis-update-list">
        {JUNE_MOCK_UPDATE_STATUSES.map((item) => (
          <div key={item.label} className="june-analysis-update-item">
            <span>{item.label}</span>
            <strong>{item.status}</strong>
          </div>
        ))}
      </div>
      <Link href={JUNE_MOCK_COMMUNITY_URL} className="suddak-btn suddak-btn-primary">
        <MessageCircle size={16} />
        SHub 둘러보기
      </Link>
      <p className="june-analysis-copyright">
        평가원 원문 문제지의 저작권은 한국교육과정평가원에 있습니다.
        수딱은 공식 원문 링크와 자체 작성한 분석 및 유사문항을 제공합니다.
      </p>
    </section>
  );
}
