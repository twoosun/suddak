import {
  generationSteps,
  mockAnalysisResult,
  mockExamBlueprint,
  mockGeneratedFiles,
} from "./mock-data";
import type {
  BlueprintItem,
  BlueprintValidation,
  ExamBlueprint,
  ExamGenerationJob,
  GeneratedExamFile,
  ReferenceAnalysisResult,
  ReferenceFile,
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
  return {
    ...mockExamBlueprint,
    subject: analysis.detectedSubject,
    totalProblems: mockExamBlueprint.items.length,
    sourceRange: analysis.sourceRange,
    items: mockExamBlueprint.items.map((item, index) => ({
      ...item,
      number: index + 1,
    })),
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
