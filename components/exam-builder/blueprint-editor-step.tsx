import { WandSparkles } from "lucide-react";

import type { ExamBlueprint } from "@/lib/exam-builder/types";
import { getSimilarityRiskLabel, getTotalScore } from "@/lib/exam-builder/utils";

type Props = {
  blueprint: ExamBlueprint;
  onGenerate: () => void;
};

export default function BlueprintEditorStep({ blueprint, onGenerate }: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-blueprint-summary">
        <label>
          시험지명
          <input className="suddak-input" value={blueprint.title} readOnly />
        </label>
        <label>
          과목
          <input className="suddak-input" value={blueprint.subject} readOnly />
        </label>
        <label>
          문항 수
          <input className="suddak-input" value={`${blueprint.totalProblems}문항`} readOnly />
        </label>
        <label>
          총점
          <input className="suddak-input" value={`${getTotalScore(blueprint.items)}점 초안`} readOnly />
        </label>
      </div>

      <div className="exam-builder-policy">{blueprint.similarityPolicy}</div>

      <div className="exam-builder-table-shell">
        <table className="exam-builder-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>단원</th>
              <th>주제</th>
              <th>유형</th>
              <th>배점</th>
              <th>난이도</th>
              <th>변형</th>
            </tr>
          </thead>
          <tbody>
            {blueprint.items.map((item) => (
              <tr key={item.id}>
                <td>{item.number}</td>
                <td>{item.unit}</td>
                <td>{item.topic}</td>
                <td>{item.format}</td>
                <td>{item.score}</td>
                <td>{item.difficulty}</td>
                <td>{getSimilarityRiskLabel(item.transformStrength)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="suddak-btn suddak-btn-primary" onClick={onGenerate}>
        <WandSparkles size={16} />
        변형 문제 세트 생성
      </button>
    </div>
  );
}
