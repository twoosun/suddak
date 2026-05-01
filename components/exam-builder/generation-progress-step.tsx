import type { GenerationStage } from "@/lib/exam-builder/types";

type Props = {
  stages: GenerationStage[];
  activeStageIndex: number;
  onComplete: () => void;
};

export default function GenerationProgressStep({
  stages,
  activeStageIndex,
  onComplete,
}: Props) {
  const activeStage = stages[Math.min(activeStageIndex, stages.length - 1)];

  return (
    <div className="exam-builder-step">
      <div className="exam-builder-progress-panel">
        <div className="exam-builder-progress-top">
          <span>현재 단계</span>
          <strong>{activeStage.label}</strong>
        </div>
        <div className="exam-builder-progress-track">
          <div
            className="exam-builder-progress-fill"
            style={{ width: `${activeStage.progress}%` }}
          />
        </div>
        <p>{activeStage.description}</p>
      </div>

      <div className="exam-builder-stage-list">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`exam-builder-stage-row ${
              index <= activeStageIndex ? "exam-builder-stage-row-active" : ""
            }`}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{stage.label}</strong>
              <p>{stage.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="suddak-btn suddak-btn-primary" onClick={onComplete}>
        생성 완료 화면 보기
      </button>
    </div>
  );
}
