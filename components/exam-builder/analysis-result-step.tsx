import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { AnalysisPoint } from "@/lib/exam-builder/types";

type Props = {
  points: AnalysisPoint[];
  onNext: () => void;
};

export default function AnalysisResultStep({ points, onNext }: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-analysis-grid">
        {points.map((point) => (
          <article key={point.id} className="suddak-card-soft exam-builder-analysis-card">
            <div className="exam-builder-analysis-icon">
              {point.riskLevel === "주의" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <strong>{point.label}</strong>
              <p>{point.detail}</p>
              <span className="suddak-badge">위험도 {point.riskLevel}</span>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="suddak-btn suddak-btn-primary" onClick={onNext}>
        출제 설계표 만들기
      </button>
    </div>
  );
}
