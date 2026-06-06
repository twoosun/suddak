import Link from "next/link";
import { ExternalLink, FileText, PenLine } from "lucide-react";

import type { AnalysisProblem } from "@/lib/juneMockAnalysis";

type Props = {
  problem: AnalysisProblem;
};

export default function JuneMockProblemCard({ problem }: Props) {
  const isPublished = problem.status === "published";

  return (
    <article className="suddak-card june-analysis-problem-card">
      <div className="june-analysis-problem-top">
        <div>
          <span className="suddak-badge">{problem.subject}</span>
          {problem.featured && <span className="suddak-badge suddak-badge-pick">추천</span>}
        </div>
        <span className="june-analysis-problem-number">{problem.number}번</span>
      </div>
      <h3>{problem.title}</h3>
      <p>{problem.summary}</p>
      <div className="june-analysis-tags" aria-label={`${problem.number}번 개념 태그`}>
        {problem.concepts.map((concept) => (
          <span key={`${problem.id}-${concept}`}>{concept}</span>
        ))}
      </div>
      <div className="june-analysis-problem-status">
        <span>난이도 {problem.difficulty.toFixed(1)} / 5.0</span>
        <strong>
          {isPublished
            ? problem.practiceUrl
              ? "유사문항 3제 공개"
              : "분석 공개"
            : "업데이트 예정"}
        </strong>
      </div>
      <div className="june-analysis-card-actions">
        {isPublished && problem.analysisUrl ? (
          <Link href={problem.analysisUrl} className="suddak-btn suddak-btn-primary">
            <FileText size={16} />
            핵심 분석 보기
          </Link>
        ) : (
          <button type="button" className="suddak-btn" disabled>
            준비 중
          </button>
        )}
        {isPublished && problem.practiceUrl ? (
          <Link href={problem.practiceUrl} className="suddak-btn suddak-btn-ghost">
            <PenLine size={16} />
            바로 풀어 보기
          </Link>
        ) : null}
        {isPublished && problem.officialSourceUrl ? (
          <Link
            href={problem.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="suddak-btn suddak-btn-ghost"
          >
            평가원 공식 원문
            <ExternalLink size={15} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
