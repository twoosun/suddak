import Link from "next/link";
import { ArrowLeft, FileText, PenLine } from "lucide-react";

import OfficialSourceCard from "@/components/analysis/OfficialSourceCard";
import PageContainer from "@/components/common/PageContainer";
import {
  JUNE_MOCK_COMMON_22_IDEAS,
  JUNE_MOCK_DETAIL_SECTIONS,
} from "@/lib/juneMockAnalysis";

export default function Common22AnalysisPage() {
  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <article className="june-analysis-page june-analysis-detail">
        <Link href="/analysis/2027-june-mock" className="june-analysis-back-link">
          <ArrowLeft size={16} />
          6평 분석 목록
        </Link>

        <header className="suddak-card june-analysis-detail-hero">
          <span className="june-analysis-badge">공통 22번</span>
          <h1>귀납적으로 정의된 수열의 경우 분류</h1>
          <p>겉보기보다 경우를 빠짐없이 나누는 것이 중요한 문항입니다.</p>
        </header>

        <OfficialSourceCard />

        <div className="june-analysis-detail-grid">
          {JUNE_MOCK_DETAIL_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isIdeaSection = section.title === "핵심 아이디어";
            const isPracticeSection = section.title === "유사문항으로 복습하기";

            return (
              <section key={section.title} className="suddak-card june-analysis-detail-section">
                <div className="june-analysis-detail-section-title">
                  <span className="june-analysis-card-icon">
                    <Icon size={20} />
                  </span>
                  <h2>{section.title}</h2>
                </div>
                {isIdeaSection ? (
                  <ul className="june-analysis-idea-list">
                    {JUNE_MOCK_COMMON_22_IDEAS.map((idea) => (
                      <li key={idea}>{idea}</li>
                    ))}
                  </ul>
                ) : isPracticeSection ? (
                  <div className="june-analysis-placeholder-block">
                    <p>수딱 자체 제작 단답형 유사문항 3제가 공개되었습니다.</p>
                    <Link
                      href="/analysis/2027-june-mock/common-22/practice"
                      className="suddak-btn suddak-btn-primary"
                    >
                      <PenLine size={16} />
                      유사문항 3제 풀기
                    </Link>
                  </div>
                ) : (
                  <p className="june-analysis-placeholder">분석 내용이 곧 업데이트됩니다.</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="june-analysis-bottom-actions">
          <Link href="/analysis/2027-june-mock/common-22/practice" className="suddak-btn suddak-btn-primary">
            <PenLine size={16} />
            유사문항 3제 풀기
          </Link>
          <Link href="/analysis/2027-june-mock" className="suddak-btn suddak-btn-ghost">
            <FileText size={16} />
            전체 분석 목록으로
          </Link>
        </div>
      </article>
    </PageContainer>
  );
}
