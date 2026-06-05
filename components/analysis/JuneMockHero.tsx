import Link from "next/link";
import { BarChart3, ExternalLink, FileText, MessageCircle, PenLine } from "lucide-react";

import {
  JUNE_MOCK_COMMUNITY_URL,
  JUNE_MOCK_OFFICIAL_SOURCE_URL,
} from "@/lib/juneMockAnalysis";

export default function JuneMockHero() {
  return (
    <section className="suddak-card june-analysis-hero">
      <div className="june-analysis-hero-copy">
        <span className="june-analysis-badge">2027학년도 6월 평가원 모의고사</span>
        <h1>6평 수학 분석 & 유사문항</h1>
        <p>
          헷갈렸던 문항은 핵심 아이디어부터 다시 정리해 보세요.
          수딱이 직접 제작한 유사문항으로 바로 복습할 수 있습니다.
        </p>
        <div className="june-analysis-meta" aria-label="시험 정보">
          <span>시행일 2026.06.04</span>
          <span>수학 영역</span>
          <span>주요 문항 분석 · 자체 제작 유사문항</span>
        </div>
        <div className="june-analysis-actions">
          <a href="#june-analysis-problems" className="suddak-btn suddak-btn-primary">
            <BarChart3 size={17} />
            주요 문항 바로 보기
          </a>
          <Link
            href={JUNE_MOCK_OFFICIAL_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="suddak-btn suddak-btn-ghost"
          >
            <FileText size={17} />
            평가원 공식 원문 보기
            <ExternalLink size={15} />
          </Link>
          <Link href={JUNE_MOCK_COMMUNITY_URL} className="suddak-btn suddak-btn-ghost">
            <MessageCircle size={17} />
            SHub 의견 나누기
          </Link>
        </div>
        <p className="june-analysis-source-note">
          원문 문제지는 한국교육과정평가원 공식 페이지에서 확인할 수 있습니다.
        </p>
      </div>
      <div className="june-analysis-hero-panel" aria-hidden="true">
        <FileText size={34} />
        <BarChart3 size={34} />
        <PenLine size={34} />
      </div>
    </section>
  );
}
