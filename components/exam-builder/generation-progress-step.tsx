import { CheckCircle2, Circle } from "lucide-react";

import type { ExamGenerationJob, GenerationStep } from "@/lib/exam-builder/types";

type Props = {
  job: ExamGenerationJob;
  steps: GenerationStep[];
};

export default function GenerationProgressStep({ job, steps }: Props) {
  const activeIndex = steps.findIndex((step) => step.id === job.currentStepId);
  const currentStep = steps[activeIndex] ?? steps[0];

  return (
    <div className="exam-builder-step">
      <div className="exam-builder-progress-panel">
        <div className="exam-builder-progress-top">
          <span>현재 단계</span>
          <strong>{currentStep.label}</strong>
          <b>{Math.round(job.progress)}%</b>
        </div>
        <div className="exam-builder-progress-track">
          <div className="exam-builder-progress-fill" style={{ width: `${job.progress}%` }} />
        </div>
        <p>생성 job: {job.id}</p>
      </div>

      <div className="exam-builder-stage-list">
        {steps.map((step, index) => {
          const done = index < activeIndex || job.status === "completed";
          const active = index === activeIndex && job.status !== "completed";

          return (
            <div
              key={step.id}
              className={`exam-builder-stage-row ${
                done || active ? "exam-builder-stage-row-active" : ""
              }`}
            >
              <span>{done ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{done ? "완료" : active ? "진행 중" : "대기"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
