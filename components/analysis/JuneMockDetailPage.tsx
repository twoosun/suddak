import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  FileText,
  ListChecks,
  PenLine,
  Sigma,
} from "lucide-react";

import OfficialSourceCard from "@/components/analysis/OfficialSourceCard";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import PageContainer from "@/components/common/PageContainer";
import type { AnalysisProblem } from "@/lib/juneMockAnalysis";

type Props = {
  problem: AnalysisProblem;
};

const sections = [
  { key: "overview", title: "문항 한눈에 보기", icon: FileText },
  { key: "keyIdeas", title: "핵심 아이디어", icon: Sigma },
  { key: "solutionSteps", title: "풀이 흐름", icon: BarChart3 },
  { key: "commonMistakes", title: "자주 하는 실수", icon: ListChecks },
] as const;

export default function JuneMockDetailPage({ problem }: Props) {
  return (
    <PageContainer topPadding={18} bottomPadding={52}>
      <article className="june-analysis-page june-analysis-detail">
        <Link href="/analysis/2027-june-mock" className="june-analysis-back-link">
          <ArrowLeft size={16} />
          6평 분석 목록
        </Link>

        <header className="suddak-card june-analysis-detail-hero">
          <span className="june-analysis-badge">
            {problem.subject} {problem.number}번
          </span>
          <h1>{problem.title}</h1>
          <p>{problem.summary}</p>
          <div className="june-analysis-meta">
            <span>난이도 {problem.difficulty.toFixed(1)} / 5.0</span>
            <div className="june-analysis-meta-answer">
              <span>평가원 정답</span>
              <MarkdownMathBlock
                content={problem.originalAnswer}
                isDark={false}
                variant="plain"
                className="june-analysis-meta-answer-math"
              />
            </div>
          </div>
        </header>

        <OfficialSourceCard sourceLocation={problem.sourceLocation} />

        <div className="june-analysis-detail-grid">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.key}
                className="suddak-card june-analysis-detail-section"
              >
                <div className="june-analysis-detail-section-title">
                  <span className="june-analysis-card-icon">
                    <Icon size={20} />
                  </span>
                  <h2>{section.title}</h2>
                </div>
                <ol className="june-analysis-detail-list">
                  {problem[section.key].map((item, index) => (
                    <li key={`${section.key}-${index}`}>
                      <MarkdownMathBlock
                        content={item}
                        isDark={false}
                        variant="plain"
                        className="june-analysis-math-content"
                      />
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          <section className="suddak-card june-analysis-detail-section">
            <div className="june-analysis-detail-section-title">
              <span className="june-analysis-card-icon">
                <PenLine size={20} />
              </span>
              <h2>유사문항으로 복습하기</h2>
            </div>
            <p className="june-analysis-practice-published">
              수딱 자체 제작 단답형 유사문항 3제가 공개되었습니다.
            </p>
            {problem.practiceUrl ? (
              <Link
                href={problem.practiceUrl}
                className="suddak-btn suddak-btn-primary"
              >
                <PenLine size={16} />
                유사문항 3제 풀기
              </Link>
            ) : null}
          </section>
        </div>

        <div className="june-analysis-bottom-actions">
          {problem.practiceUrl ? (
            <Link
              href={problem.practiceUrl}
              className="suddak-btn suddak-btn-primary"
            >
              <PenLine size={16} />
              유사문항 3제 풀기
            </Link>
          ) : null}
          <Link
            href="/analysis/2027-june-mock"
            className="suddak-btn suddak-btn-ghost"
          >
            <FileText size={16} />
            전체 분석 목록으로
          </Link>
        </div>
      </article>
    </PageContainer>
  );
}
