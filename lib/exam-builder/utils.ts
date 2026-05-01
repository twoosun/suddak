import {
  generationSteps,
  mockAnalysisResult,
  mockExamBlueprint,
  mockGeneratedFiles,
} from "./mock-data";
import type {
  BlueprintItem,
  BlueprintValidation,
  DifficultyLevel,
  ExamBlueprint,
  ExamGenerationJob,
  GeneratedExamFile,
  ReferenceAnalysisResult,
  ReferenceFile,
  TransformStrength,
} from "./types";

export function getTotalScore(items: BlueprintItem[]) {
  return Number(
    items.reduce((sum, item) => sum + (Number(item.score) || 0), 0).toFixed(1)
  );
}

export function analyzeReferenceFile(files: ReferenceFile[]): ReferenceAnalysisResult {
  return {
    ...mockAnalysisResult,
    detectedProblemCount: Math.max(mockAnalysisResult.detectedProblemCount, files.length * 6),
  };
}

export function createInitialBlueprint(
  analysis: ReferenceAnalysisResult
): ExamBlueprint {
  return createBlueprintFromAnalysis(analysis, Math.min(20, Math.max(6, analysis.detectedProblemCount || 20)));
}

function pickFrom<T>(values: T[], index: number, fallback: T): T {
  return values.length ? values[index % values.length] : fallback;
}

function getTargetScore(totalProblems: number, index: number) {
  const base = Math.floor((100 / totalProblems) * 10) / 10;
  const currentTotal = base * totalProblems;
  const remainder = Number((100 - currentTotal).toFixed(1));
  return index === totalProblems - 1 ? Number((base + remainder).toFixed(1)) : base;
}

export function createBlueprintFromAnalysis(
  analysis: ReferenceAnalysisResult,
  desiredTotal: number
): ExamBlueprint {
  const totalProblems = Math.max(1, Math.min(40, Math.round(desiredTotal || 20)));
  const writtenCount = Math.max(1, Math.round(totalProblems * 0.2));
  const multipleChoiceCount = Math.max(0, totalProblems - writtenCount);
  const difficultyPlan: DifficultyLevel[] = ["기본", "중간", "중간", "상", "상", "고난도"];
  const transformPlan: TransformStrength[] = ["중간", "중간", "높음", "높음", "낮음"];

  const items: BlueprintItem[] = Array.from({ length: totalProblems }, (_, index) => {
    const isWritten = index >= multipleChoiceCount;
    const unit = pickFrom(analysis.majorUnits, index, analysis.detectedSubject || "핵심 단원");
    const type = pickFrom(analysis.majorTypes, index, isWritten ? "서술형 추론" : "내신형 객관식");
    const transformPoint = pickFrom(
      analysis.transformablePoints,
      index,
      "조건과 수치를 바꾸어 같은 개념을 새 문항으로 재구성"
    );

    return {
      id: `item-${Date.now()}-${index + 1}`,
      number: index + 1,
      format: isWritten ? "서술형" : "객관식",
      referenceLocation: `업로드 자료 ${Math.floor(index / 3) + 1} p.${Math.floor(index / 3) + 1} 문항 ${index + 1}`,
      topic: unit,
      problemType: type,
      score: getTargetScore(totalProblems, index),
      difficulty: difficultyPlan[index % difficultyPlan.length],
      transformStrength: transformPlan[index % transformPlan.length],
      intent: `${transformPoint}을(를) 평가하도록 구성합니다.`,
    };
  });

  return {
    ...mockExamBlueprint,
    subject: analysis.detectedSubject,
    title: `${analysis.detectedSubject || "수학"} 내신 대비 변형 문제 세트`,
    totalProblems,
    multipleChoiceCount,
    writtenCount,
    overallDifficulty: "상",
    overallTransformStrength: "높음",
    sourceRange: analysis.sourceRange,
    referenceSummary: analysis.majorUnits.length
      ? `${analysis.majorUnits.slice(0, 4).join(", ")} 중심 자동 설계`
      : "업로드 참고 자료 기반 자동 설계",
    items,
  };
}

export function validateBlueprint(blueprint: ExamBlueprint): BlueprintValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const totalScore = getTotalScore(blueprint.items);

  if (blueprint.multipleChoiceCount + blueprint.writtenCount !== blueprint.totalProblems) {
    errors.push("객관식 문항 수와 서술형 문항 수의 합이 총 문항 수와 같아야 합니다.");
  }

  if (blueprint.items.length !== blueprint.totalProblems) {
    errors.push("설계표 행 개수가 총 문항 수와 같아야 합니다.");
  }

  if (totalScore <= 0) {
    errors.push("배점 총합이 0보다 커야 합니다.");
  }

  blueprint.items.forEach((item) => {
    if (!item.topic.trim()) {
      warnings.push(`${item.number}번 문항의 주제가 비어 있습니다.`);
    }
    if (!item.difficulty) {
      warnings.push(`${item.number}번 문항의 난이도가 비어 있습니다.`);
    }
    if (!item.transformStrength) {
      warnings.push(`${item.number}번 문항의 변형강도가 비어 있습니다.`);
    }
  });

  return {
    isValid: errors.length === 0 && warnings.length === 0,
    errors,
    warnings,
    totalScore,
  };
}

export function startGenerationJob(): ExamGenerationJob {
  return {
    id: `mock-job-${Date.now()}`,
    progress: 0,
    currentStepId: generationSteps[0]?.id ?? "validate",
    status: "running",
  };
}

export function getGenerationProgress(
  job: ExamGenerationJob,
  nextProgress: number
): ExamGenerationJob {
  const progress = Math.min(100, Math.max(0, nextProgress));
  const stepIndex = Math.min(
    generationSteps.length - 1,
    Math.floor((progress / 100) * generationSteps.length)
  );

  return {
    ...job,
    progress,
    currentStepId: generationSteps[stepIndex]?.id ?? generationSteps[0].id,
    status: progress >= 100 ? "completed" : "running",
  };
}

export function createExamFiles(_blueprint: ExamBlueprint): GeneratedExamFile[] {
  void _blueprint;
  return mockGeneratedFiles;
}

export function publishToNaesin() {
  return {
    ok: true,
    message: "내신딱딱 게시 대기 상태로 저장했습니다.",
  };
}

export function normalizeBlueprintNumbers(items: BlueprintItem[]): BlueprintItem[] {
  return items.map((item, index) => ({
    ...item,
    number: index + 1,
  }));
}
