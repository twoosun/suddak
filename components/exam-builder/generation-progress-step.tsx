import { CheckCircle2, Circle } from "lucide-react";

import type { ExamGenerationJob, GenerationStep } from "@/lib/exam-builder/types";

type Props = {
  job: ExamGenerationJob;
  steps: GenerationStep[];
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "계산 중";
  const rounded = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (minutes <= 0) return `${rest}초`;
  return rest > 0 ? `${minutes}분 ${rest}초` : `${minutes}분`;
}

function parseProblemNumber(stepId: string) {
  const [, rawNumber] = stepId.split(":");
  const number = Number(rawNumber);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function GenerationProgressStep({ job, steps }: Props) {
  const baseStepId = job.currentStepId.split(":")[0];
  const itemNumber = parseProblemNumber(job.currentStepId);
  const activeIndex = steps.findIndex((step) => step.id === baseStepId);
  const currentStep = steps[activeIndex] ?? steps[0];
  const currentLabel = itemNumber ? `${currentStep.label} (${itemNumber}번)` : currentStep.label;
  const totalProblems = job.totalProblems ?? 0;
  const generatedCount = itemNumber
    ? baseStepId === "check"
      ? itemNumber
      : Math.max(0, itemNumber - 1)
    : 0;
  const startedAt = job.startedAt ?? Date.now();
  const elapsedSeconds = Math.max(0, (Date.now() - startedAt) / 1000);
  const secondsPerProblem =
    generatedCount > 0
      ? elapsedSeconds / generatedCount
      : job.estimatedSecondsPerProblem ?? 55;
  const remainingProblemCount = totalProblems
    ? Math.max(0, totalProblems - generatedCount)
    : 0;
  const layoutAndExportBuffer = baseStepId === "layout" || baseStepId === "export" || baseStepId === "completed" ? 0 : 45;
  const remainingSeconds =
    job.status === "completed"
      ? 0
      : remainingProblemCount > 0
        ? remainingProblemCount * secondsPerProblem + layoutAndExportBuffer
        : layoutAndExportBuffer;

  return (
    <div className="exam-builder-step">
      <div className="exam-builder-progress-panel">
        <div className="exam-builder-progress-top">
          <span>현재 단계</span>
          <strong>{currentLabel}</strong>
          <b>{Math.round(job.progress)}%</b>
        </div>
        <div className="exam-builder-progress-track">
          <div className="exam-builder-progress-fill" style={{ width: `${job.progress}%` }} />
        </div>
        <p>
          생성 job: {job.id}
          {totalProblems ? ` · 문항 ${generatedCount}/${totalProblems}` : ""}
          {itemNumber && baseStepId === "draft" ? ` · ${itemNumber}번 원본/딱씨앗 참고 중` : ""}
        </p>
        <p>
          경과 시간 {formatDuration(elapsedSeconds)} · 예상 남은 시간 {formatDuration(remainingSeconds)}
        </p>
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
