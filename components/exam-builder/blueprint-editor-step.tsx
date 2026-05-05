import { Plus, RefreshCcw, Shuffle, Trash2, WandSparkles } from "lucide-react";

import type {
  BlueprintItem,
  BlueprintValidation,
  DifficultyLevel,
  ExamBlueprint,
  ProblemFormat,
  TransformStrength,
} from "@/lib/exam-builder/types";

const difficulties: DifficultyLevel[] = ["기본", "중간", "상", "고난도"];
const transformStrengths: TransformStrength[] = ["낮음", "중간", "높음"];
const formats: ProblemFormat[] = ["객관식", "서술형"];

type Props = {
  blueprint: ExamBlueprint;
  validation: BlueprintValidation;
  onBlueprintChange: (blueprint: ExamBlueprint) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onAutoArrange: () => void;
  onAutoDesign: () => void;
  onRecommendAgain: () => void;
  onGenerate: () => void;
};

function updateItem(
  blueprint: ExamBlueprint,
  itemId: string,
  patch: Partial<BlueprintItem>
): ExamBlueprint {
  return {
    ...blueprint,
    items: blueprint.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item
    ),
  };
}

export default function BlueprintEditorStep({
  blueprint,
  validation,
  onBlueprintChange,
  onAddRow,
  onDeleteRow,
  onAutoArrange,
  onAutoDesign,
  onRecommendAgain,
  onGenerate,
}: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-blueprint-summary">
        <label>
          시험지명
          <input
            className="suddak-input"
            value={blueprint.title}
            onChange={(event) =>
              onBlueprintChange({ ...blueprint, title: event.target.value })
            }
          />
        </label>
        <label>
          총 문항 수
          <input
            className="suddak-input"
            type="number"
            min={1}
            value={blueprint.totalProblems}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                totalProblems: Number(event.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          객관식 문항 수
          <input
            className="suddak-input"
            type="number"
            min={0}
            value={blueprint.multipleChoiceCount}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                multipleChoiceCount: Number(event.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          서술형 문항 수
          <input
            className="suddak-input"
            type="number"
            min={0}
            value={blueprint.writtenCount}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                writtenCount: Number(event.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          전체 난이도
          <select
            className="suddak-select"
            value={blueprint.overallDifficulty}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                overallDifficulty: event.target.value as DifficultyLevel,
              })
            }
          >
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
        <label>
          전체 변형강도
          <select
            className="suddak-select"
            value={blueprint.overallTransformStrength}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                overallTransformStrength: event.target.value as TransformStrength,
              })
            }
          >
            {transformStrengths.map((strength) => (
              <option key={strength} value={strength}>
                {strength}
              </option>
            ))}
          </select>
        </label>
        <label>
          시험 시간
          <input
            className="suddak-input"
            type="number"
            min={1}
            value={blueprint.examMinutes}
            onChange={(event) =>
              onBlueprintChange({
                ...blueprint,
                examMinutes: Number(event.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          현재 총점
          <input className="suddak-input" value={`${validation.totalScore.toFixed(1)}점`} readOnly />
        </label>
      </div>

      <div className="exam-builder-action-row">
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onAddRow}>
          <Plus size={16} />
          행 추가
        </button>
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onAutoArrange}>
          <Shuffle size={16} />
          자동 재배치
        </button>
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onAutoDesign}>
          <WandSparkles size={16} />
          분석 기반 자동 설계
        </button>
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onRecommendAgain}>
          <RefreshCcw size={16} />
          다시 추천
        </button>
      </div>

      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="exam-builder-validation-panel">
          {validation.errors.map((error) => (
            <p key={error} className="exam-builder-validation-error">
              {error}
            </p>
          ))}
          {validation.warnings.map((warning) => (
            <p key={warning} className="exam-builder-validation-warning">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="exam-builder-table-shell">
        <table className="exam-builder-table exam-builder-blueprint-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>형식</th>
              <th>참고 위치</th>
              <th>주제</th>
              <th>유형</th>
              <th>배점</th>
              <th>난이도</th>
              <th>변형강도</th>
              <th>출제 의도</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {blueprint.items.map((item) => (
              <tr key={item.id}>
                <td>{item.number}</td>
                <td>
                  <select
                    className="suddak-select"
                    value={item.format}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, {
                          format: event.target.value as ProblemFormat,
                        })
                      )
                    }
                  >
                    {formats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="suddak-input"
                    value={item.referenceLocation}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, {
                          referenceLocation: event.target.value,
                        })
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    className="suddak-input"
                    value={item.topic}
                    onChange={(event) =>
                      onBlueprintChange(updateItem(blueprint, item.id, { topic: event.target.value }))
                    }
                  />
                </td>
                <td>
                  <input
                    className="suddak-input"
                    value={item.problemType}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, { problemType: event.target.value })
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    className="suddak-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={item.score}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, {
                          score: Number(Number(event.target.value).toFixed(1)) || 0,
                        })
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    className="suddak-select"
                    value={item.difficulty}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, {
                          difficulty: event.target.value as DifficultyLevel,
                        })
                      )
                    }
                  >
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="suddak-select"
                    value={item.transformStrength}
                    onChange={(event) =>
                      onBlueprintChange(
                        updateItem(blueprint, item.id, {
                          transformStrength: event.target.value as TransformStrength,
                        })
                      )
                    }
                  >
                    {transformStrengths.map((strength) => (
                      <option key={strength} value={strength}>
                        {strength}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="suddak-input"
                    value={item.intent}
                    onChange={(event) =>
                      onBlueprintChange(updateItem(blueprint, item.id, { intent: event.target.value }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="suddak-btn suddak-btn-ghost exam-builder-icon-button"
                    onClick={() => onDeleteRow(item.id)}
                    aria-label={`${item.number}번 행 삭제`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="suddak-btn suddak-btn-primary"
        onClick={onGenerate}
        disabled={!validation.isValid}
      >
        <WandSparkles size={16} />
        변형문제 세트 생성
      </button>
    </div>
  );
}
