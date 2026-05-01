"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import AnalysisResultStep from "@/components/exam-builder/analysis-result-step";
import BlueprintEditorStep from "@/components/exam-builder/blueprint-editor-step";
import GenerationProgressStep from "@/components/exam-builder/generation-progress-step";
import ReferenceUploadStep from "@/components/exam-builder/reference-upload-step";
import ResultDownloadStep from "@/components/exam-builder/result-download-step";
import {
  mockAnalysisPoints,
  mockExamBlueprint,
  mockGenerationStages,
  mockReferenceFiles,
  mockResultAssets,
} from "@/lib/exam-builder/mock-data";
import type { ExamBuilderStep } from "@/lib/exam-builder/types";

const steps: Array<{ id: ExamBuilderStep; label: string }> = [
  { id: "upload", label: "자료 업로드" },
  { id: "analysis", label: "분석 결과" },
  { id: "blueprint", label: "설계표" },
  { id: "generation", label: "생성" },
  { id: "result", label: "결과" },
];

export default function ExamBuilderPage() {
  const [step, setStep] = useState<ExamBuilderStep>("upload");
  const [activeStageIndex, setActiveStageIndex] = useState(2);

  const stepIndex = steps.findIndex((item) => item.id === step);

  return (
    <PageContainer topPadding={18} bottomPadding={56}>
      <div className="exam-builder-page">
        <header className="suddak-card exam-builder-header">
          <Link href="/naesin" className="suddak-btn suddak-btn-ghost">
            <ChevronLeft size={16} />
            내신딱딱
          </Link>
          <div>
            <span className="exam-builder-eyebrow">관리자 전용</span>
            <h1>동형시험지 제작기</h1>
            <p>참고 자료를 분석하고 출제 설계표를 다듬어 DOCX/PDF 시험지를 생성합니다.</p>
          </div>
          <span className="suddak-badge">
            <CheckCircle2 size={14} />
            자동 저장됨
          </span>
        </header>

        <div className="exam-builder-stepper">
          {steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`exam-builder-step-chip ${
                index <= stepIndex ? "exam-builder-step-chip-active" : ""
              }`}
              onClick={() => setStep(item.id)}
            >
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>

        <SectionCard
          title={steps[stepIndex]?.label ?? "자료 업로드"}
          description="현재는 제작 플로우를 확인할 수 있는 목업 상태이며, 실제 분석·생성 API와 저장소는 다음 단계에서 연결합니다."
        >
          {step === "upload" && (
            <ReferenceUploadStep files={mockReferenceFiles} onAnalyze={() => setStep("analysis")} />
          )}
          {step === "analysis" && (
            <AnalysisResultStep points={mockAnalysisPoints} onNext={() => setStep("blueprint")} />
          )}
          {step === "blueprint" && (
            <BlueprintEditorStep
              blueprint={mockExamBlueprint}
              onGenerate={() => {
                setActiveStageIndex(2);
                setStep("generation");
              }}
            />
          )}
          {step === "generation" && (
            <GenerationProgressStep
              stages={mockGenerationStages}
              activeStageIndex={activeStageIndex}
              onComplete={() => {
                setActiveStageIndex(mockGenerationStages.length - 1);
                setStep("result");
              }}
            />
          )}
          {step === "result" && <ResultDownloadStep assets={mockResultAssets} />}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
