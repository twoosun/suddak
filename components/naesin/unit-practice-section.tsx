import { ArrowRight, Clock } from "lucide-react";

import type { NaesinUnitPractice } from "@/lib/naesin/types";

type Props = {
  practices: NaesinUnitPractice[];
};

export default function UnitPracticeSection({ practices }: Props) {
  return (
    <div className="naesin-unit-grid">
      {practices.map((practice) => (
        <article key={practice.id} className="suddak-card-soft naesin-unit-card">
          <div className="naesin-card-badges">
            <span className="suddak-badge">{practice.subjectLabel}</span>
            <span className="suddak-badge">{practice.unit}</span>
          </div>
          <h3 className="naesin-unit-title">{practice.title}</h3>
          <div className="naesin-unit-meta">
            <span>{practice.problemCount}문항</span>
            <span>{practice.difficulty}</span>
          </div>
          <div className="naesin-unit-footer">
            <span>
              <Clock size={14} />
              {practice.progressLabel}
            </span>
            <ArrowRight size={16} />
          </div>
        </article>
      ))}
    </div>
  );
}
