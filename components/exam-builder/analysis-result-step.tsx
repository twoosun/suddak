import { BarChart3, CheckCircle2, ListChecks, WandSparkles } from "lucide-react";

import type { ReferenceAnalysisResult } from "@/lib/exam-builder/types";

type Props = {
  analysis: ReferenceAnalysisResult;
  onCreateBlueprint: () => void;
};

export default function AnalysisResultStep({ analysis, onCreateBlueprint }: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-analysis-grid">
        <article className="suddak-card-soft exam-builder-analysis-card">
          <CheckCircle2 size={18} />
          <div>
            <strong>감지 과목</strong>
            <p>{analysis.detectedSubject}</p>
          </div>
        </article>
        <article className="suddak-card-soft exam-builder-analysis-card">
          <ListChecks size={18} />
          <div>
            <strong>주요 단원</strong>
            <p>{analysis.majorUnits.join(", ")}</p>
          </div>
        </article>
        <article className="suddak-card-soft exam-builder-analysis-card">
          <BarChart3 size={18} />
          <div>
            <strong>감지 문항 수</strong>
            <p>{analysis.detectedProblemCount}문항</p>
          </div>
        </article>
      </div>

      <div className="exam-builder-analysis-columns">
        <section className="suddak-card-soft">
          <strong>주요 유형</strong>
          <div className="exam-builder-chip-list">
            {analysis.majorTypes.map((type) => (
              <span key={type} className="suddak-badge">
                {type}
              </span>
            ))}
          </div>
        </section>

        <section className="suddak-card-soft">
          <strong>난이도 분포</strong>
          <div className="exam-builder-distribution">
            {Object.entries(analysis.difficultyDistribution).map(([difficulty, count]) => (
              <div key={difficulty}>
                <span>{difficulty}</span>
                <strong>{count}문항</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="exam-builder-analysis-columns">
        <section className="suddak-card-soft">
          <strong>출제 포인트</strong>
          <ul className="exam-builder-bullet-list">
            {analysis.examPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="suddak-card-soft">
          <strong>변형 가능 포인트</strong>
          <ul className="exam-builder-bullet-list">
            {analysis.transformablePoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      </div>

      <button type="button" className="suddak-btn suddak-btn-primary" onClick={onCreateBlueprint}>
        <WandSparkles size={16} />
        분석 결과 기반 설계표 초안 만들기
      </button>
    </div>
  );
}
