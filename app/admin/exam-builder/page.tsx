"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ShieldAlert } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import AnalysisResultStep from "@/components/exam-builder/analysis-result-step";
import BlueprintEditorStep from "@/components/exam-builder/blueprint-editor-step";
import GenerationProgressStep from "@/components/exam-builder/generation-progress-step";
import ReferenceUploadStep from "@/components/exam-builder/reference-upload-step";
import ResultDownloadStep from "@/components/exam-builder/result-download-step";
import { generationSteps, mockReferenceFiles } from "@/lib/exam-builder/mock-data";
import {
  analyzeReferenceFile,
  createExamFiles,
  createInitialBlueprint,
  getGenerationProgress,
  normalizeBlueprintNumbers,
  startGenerationJob,
  validateBlueprint,
} from "@/lib/exam-builder/utils";
import type {
  BlueprintItem,
  ExamBlueprint,
  ExamBuilderStep,
  ExamGenerationJob,
  GeneratedExamFile,
  ReferenceAnalysisResult,
  ReferenceFile,
  ReferenceFileKind,
} from "@/lib/exam-builder/types";
import { getSessionWithRecovery } from "@/lib/supabase";

const steps: Array<{ id: ExamBuilderStep; label: string }> = [
  { id: "upload", label: "참고 파일 업로드" },
  { id: "analysis", label: "사이트 분석 결과" },
  { id: "blueprint", label: "출제 설계표" },
  { id: "generation", label: "문항 생성 진행" },
  { id: "result", label: "결과 파일 다운로드" },
];

function createEmptyItem(number: number): BlueprintItem {
  return {
    id: `item-${Date.now()}-${number}`,
    number,
    format: "객관식",
    referenceLocation: "",
    topic: "",
    problemType: "",
    score: 3.0,
    difficulty: "중간",
    transformStrength: "중간",
    intent: "",
  };
}

export default function ExamBuilderPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMessage, setAuthMessage] = useState("관리자 권한을 확인하는 중입니다.");

  const [step, setStep] = useState<ExamBuilderStep>("upload");
  const [referenceKind, setReferenceKind] = useState<ReferenceFileKind>("수능특강");
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>(mockReferenceFiles);
  const [analysis, setAnalysis] = useState<ReferenceAnalysisResult | null>(null);
  const [blueprint, setBlueprint] = useState<ExamBlueprint | null>(null);
  const [job, setJob] = useState<ExamGenerationJob | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedExamFile[]>([]);

  useEffect(() => {
    let alive = true;

    const checkAdmin = async () => {
      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        if (!alive) return;
        setIsAdmin(false);
        setAuthMessage("로그인한 관리자 계정만 접근할 수 있습니다.");
        setAuthChecked(true);
        return;
      }

      try {
        const res = await fetch("/api/usage", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });
        const data = await res.json();

        if (!alive) return;
        setIsAdmin(Boolean(data?.isAdmin));
        setAuthMessage(
          data?.isAdmin
            ? "관리자 권한이 확인되었습니다."
            : "관리자 권한이 없어 접근할 수 없습니다."
        );
        setAuthChecked(true);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
        setAuthMessage("관리자 권한 확인 중 오류가 발생했습니다.");
        setAuthChecked(true);
      }
    };

    checkAdmin();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!job || job.status !== "running") return;

    const timer = window.setInterval(() => {
      setJob((currentJob) => {
        if (!currentJob || currentJob.status !== "running") return currentJob;
        return getGenerationProgress(currentJob, currentJob.progress + 4);
      });
    }, 360);

    return () => window.clearInterval(timer);
  }, [job]);

  useEffect(() => {
    if (!job || job.status !== "completed" || !blueprint) return;

    const timer = window.setTimeout(() => {
      setGeneratedFiles(createExamFiles(blueprint));
      setStep("result");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [job, blueprint]);

  const stepIndex = steps.findIndex((item) => item.id === step);
  const validation = useMemo(
    () =>
      blueprint
        ? validateBlueprint(blueprint)
        : { isValid: false, errors: ["설계표가 아직 없습니다."], warnings: [], totalScore: 0 },
    [blueprint]
  );

  const handleMockAddFile = () => {
    const nextIndex = referenceFiles.length + 1;
    setReferenceFiles((files) => [
      ...files,
      {
        id: `ref-${Date.now()}`,
        name: `mock_reference_${nextIndex}.pdf`,
        kind: referenceKind,
        sizeLabel: "mock",
        status: "대기",
      },
    ]);
  };

  const handleAnalyze = () => {
    const nextFiles = referenceFiles.map((file) => ({ ...file, status: "분석 완료" as const }));
    const nextAnalysis = analyzeReferenceFile(nextFiles);

    setReferenceFiles(nextFiles);
    setAnalysis(nextAnalysis);
    setStep("analysis");
  };

  const handleCreateBlueprint = () => {
    const nextAnalysis = analysis ?? analyzeReferenceFile(referenceFiles);
    setAnalysis(nextAnalysis);
    setBlueprint(createInitialBlueprint(nextAnalysis));
    setStep("blueprint");
  };

  const handleAddRow = () => {
    if (!blueprint) return;
    const nextItems = [...blueprint.items, createEmptyItem(blueprint.items.length + 1)];
    setBlueprint({
      ...blueprint,
      totalProblems: nextItems.length,
      multipleChoiceCount: nextItems.filter((item) => item.format === "객관식").length,
      writtenCount: nextItems.filter((item) => item.format === "서술형").length,
      items: normalizeBlueprintNumbers(nextItems),
    });
  };

  const handleDeleteRow = (id: string) => {
    if (!blueprint) return;
    const nextItems = normalizeBlueprintNumbers(blueprint.items.filter((item) => item.id !== id));
    setBlueprint({
      ...blueprint,
      totalProblems: nextItems.length,
      multipleChoiceCount: nextItems.filter((item) => item.format === "객관식").length,
      writtenCount: nextItems.filter((item) => item.format === "서술형").length,
      items: nextItems,
    });
  };

  const handleAutoArrange = () => {
    if (!blueprint) return;
    const nextItems = normalizeBlueprintNumbers(
      [...blueprint.items].sort((a, b) => {
        const order = { 기본: 0, 중간: 1, 상: 2, 고난도: 3 };
        return order[a.difficulty] - order[b.difficulty];
      })
    );

    setBlueprint({ ...blueprint, items: nextItems });
  };

  const handleRecommendAgain = () => {
    const nextAnalysis = analysis ?? analyzeReferenceFile(referenceFiles);
    setAnalysis(nextAnalysis);
    setBlueprint(createInitialBlueprint(nextAnalysis));
  };

  const handleStartGeneration = () => {
    if (!blueprint || !validation.isValid) return;
    setGeneratedFiles([]);
    setJob(startGenerationJob());
    setStep("generation");
  };

  const renderContent = () => {
    if (step === "upload") {
      return (
        <ReferenceUploadStep
          files={referenceFiles}
          selectedKind={referenceKind}
          onKindChange={setReferenceKind}
          onMockAddFile={handleMockAddFile}
          onAnalyze={handleAnalyze}
        />
      );
    }

    if (step === "analysis" && analysis) {
      return <AnalysisResultStep analysis={analysis} onCreateBlueprint={handleCreateBlueprint} />;
    }

    if (step === "blueprint" && blueprint) {
      return (
        <BlueprintEditorStep
          blueprint={blueprint}
          validation={validation}
          onBlueprintChange={setBlueprint}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onAutoArrange={handleAutoArrange}
          onRecommendAgain={handleRecommendAgain}
          onGenerate={handleStartGeneration}
        />
      );
    }

    if (step === "generation" && job) {
      return <GenerationProgressStep job={job} steps={generationSteps} />;
    }

    if (step === "result" && blueprint && analysis) {
      return (
        <ResultDownloadStep
          files={generatedFiles}
          blueprint={blueprint}
          analysis={analysis}
          onEditBlueprint={() => setStep("blueprint")}
        />
      );
    }

    return (
      <div className="suddak-card-soft exam-builder-empty-state">
        이전 단계의 정보가 필요합니다. 단계 버튼을 눌러 흐름을 다시 확인하세요.
      </div>
    );
  };

  if (!authChecked) {
    return (
      <PageContainer topPadding={18} bottomPadding={56}>
        <div className="suddak-card exam-builder-access-card">{authMessage}</div>
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer topPadding={18} bottomPadding={56}>
        <div className="suddak-card exam-builder-access-card">
          <ShieldAlert size={28} />
          <h1>접근 불가</h1>
          <p>{authMessage}</p>
          <Link href="/" className="suddak-btn suddak-btn-primary">
            수딱으로 돌아가기
          </Link>
        </div>
      </PageContainer>
    );
  }

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
            <p>참고 자료 분석, 출제 설계표 편집, mock 문항 생성, 결과 파일 제공까지 한 흐름으로 확인합니다.</p>
          </div>
          <span className="suddak-badge">
            <CheckCircle2 size={14} />
            {authMessage}
          </span>
        </header>

        <div className="exam-builder-stepper">
          {steps.map((item, index) => {
            const disabled =
              (item.id === "analysis" && !analysis) ||
              (item.id === "blueprint" && !blueprint) ||
              (item.id === "generation" && !job) ||
              (item.id === "result" && generatedFiles.length === 0);

            return (
              <button
                key={item.id}
                type="button"
                className={`exam-builder-step-chip ${
                  index <= stepIndex ? "exam-builder-step-chip-active" : ""
                }`}
                onClick={() => setStep(item.id)}
                disabled={disabled}
              >
                <span>{index + 1}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        <SectionCard
          title={steps[stepIndex]?.label ?? "참고 파일 업로드"}
          description="실제 OCR/API 연결 전 단계라 분석과 생성은 mock 데이터와 setInterval 진행률로 동작합니다."
        >
          {renderContent()}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
