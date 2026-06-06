import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import PracticeProblemCard from "@/components/analysis/PracticeProblemCard";
import PageContainer from "@/components/common/PageContainer";
import type {
  AnalysisProblem,
  PracticeProblem,
} from "@/lib/juneMockAnalysis";

type Props = {
  problem: AnalysisProblem;
  practiceProblems: PracticeProblem[];
};

export default function JuneMockPracticePage({
  problem,
  practiceProblems,
}: Props) {
  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <article className="june-analysis-page june-analysis-practice">
        <Link href={problem.analysisUrl} className="june-analysis-back-link">
          <ArrowLeft size={16} />
          {problem.subject} {problem.number}번 분석
        </Link>

        <header className="suddak-card june-analysis-detail-hero">
          <span className="june-analysis-badge">수딱 자체 제작</span>
          <h1>
            {problem.subject} {problem.number}번 유사문항 3제
          </h1>
          <p>
            기본 구조부터 심화 변형까지 단계별로 연습해 보세요.
            <br />
            모든 문항은 수딱이 직접 제작한 단답형 문항입니다.
          </p>
        </header>

        <section
          className="june-analysis-practice-grid"
          aria-label={`${problem.subject} ${problem.number}번 유사문항 목록`}
        >
          {practiceProblems.map((practiceProblem) => (
            <PracticeProblemCard
              key={practiceProblem.id}
              problem={practiceProblem}
            />
          ))}
        </section>

        <div className="june-analysis-bottom-actions">
          <Link
            href={problem.analysisUrl}
            className="suddak-btn suddak-btn-primary"
          >
            <FileText size={16} />
            {problem.subject} {problem.number}번 분석으로
          </Link>
          <Link
            href="/analysis/2027-june-mock"
            className="suddak-btn suddak-btn-ghost"
          >
            전체 분석 목록으로
          </Link>
        </div>
      </article>
    </PageContainer>
  );
}
