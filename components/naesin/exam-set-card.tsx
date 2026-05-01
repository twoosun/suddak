import Link from "next/link";
import { Download, FileText, Lock, PlayCircle } from "lucide-react";

import type { NaesinExamSet } from "@/lib/naesin/types";

type Props = {
  examSet: NaesinExamSet;
};

export default function ExamSetCard({ examSet }: Props) {
  return (
    <article className="suddak-card-soft naesin-exam-card">
      <Link href={`/naesin/${examSet.id}`} className="naesin-exam-card-main">
        <div className="naesin-card-badges">
          <span className="suddak-badge">{examSet.subjectLabel}</span>
          <span className="suddak-badge">{examSet.materialType}</span>
          {examSet.featured && <span className="suddak-badge naesin-badge-accent">추천</span>}
        </div>

        <h3 className="naesin-card-title">{examSet.title}</h3>
        <p className="naesin-card-description">{examSet.description}</p>

        <div className="naesin-meta-grid">
          <span>{examSet.problemCount}문항</span>
          <span>{examSet.difficulty}</span>
          <span>{examSet.estimatedMinutes}분</span>
          <span>{examSet.publishStatus}</span>
        </div>
      </Link>

      <div className="naesin-card-actions">
        {examSet.downloads.slice(0, 2).map((asset) => (
          <a
            key={`${asset.label}-${asset.format}`}
            href={asset.available ? asset.path : undefined}
            className={`suddak-btn suddak-btn-ghost ${!asset.available ? "naesin-disabled-link" : ""}`}
            aria-disabled={!asset.available}
          >
            {asset.available ? <Download size={16} /> : <Lock size={16} />}
            {asset.label} {asset.format}
          </a>
        ))}
        <Link href={`/naesin/${examSet.id}`} className="suddak-btn suddak-btn-primary">
          <FileText size={16} />
          상세
        </Link>
        <button type="button" className="suddak-btn suddak-btn-ghost" disabled>
          <PlayCircle size={16} />
          온라인 풀이
        </button>
      </div>
    </article>
  );
}
