import Link from "next/link";
import { ArrowLeft, LockKeyhole, PenLine } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import { JUNE_MOCK_PRACTICE_PROBLEMS } from "@/lib/juneMockAnalysis";

export default function Common22PracticePage() {
  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <article className="june-analysis-page june-analysis-practice">
        <Link href="/analysis/2027-june-mock/common-22" className="june-analysis-back-link">
          <ArrowLeft size={16} />
          공통 22번 분석
        </Link>

        <header className="suddak-card june-analysis-detail-hero">
          <span className="june-analysis-badge">수딱 자체 제작</span>
          <h1>공통 22번 유사문항 3제</h1>
          <p>숫자만 바꾼 문제부터 구조를 변형한 문제까지 단계별로 연습해 보세요.</p>
        </header>

        <section className="june-analysis-practice-grid" aria-label="공통 22번 유사문항 목록">
          {JUNE_MOCK_PRACTICE_PROBLEMS.map((problem) => (
            <article key={problem.id} className="suddak-card june-analysis-practice-card">
              <span className="suddak-badge">{problem.label}</span>
              <h2>{problem.title}</h2>
              <p>{problem.description}</p>
              <div className="june-analysis-practice-placeholder">
                <LockKeyhole size={20} />
                <span>유사문항이 곧 공개됩니다.</span>
              </div>
              {problem.content ? (
                <div className="june-analysis-practice-content">{problem.content}</div>
              ) : null}
            </article>
          ))}
        </section>

        <div className="june-analysis-bottom-actions">
          <Link href="/analysis/2027-june-mock/common-22" className="suddak-btn suddak-btn-primary">
            <PenLine size={16} />
            공통 22번 분석으로
          </Link>
          <Link href="/analysis/2027-june-mock" className="suddak-btn suddak-btn-ghost">
            전체 분석 목록으로
          </Link>
        </div>
      </article>
    </PageContainer>
  );
}
