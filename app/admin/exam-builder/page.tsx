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

type UploadedReferenceRow = {
  id: string;
  kind: ReferenceFileKind;
  original_name: string;
  file_size: number;
};

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [examSetId, setExamSetId] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState("");
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
        return getGenerationProgress(currentJob, Math.min(96, currentJob.progress + 4));
      });
    }, 360);

    return () => window.clearInterval(timer);
  }, [job]);

  const stepIndex = steps.findIndex((item) => item.id === step);
  const validation = useMemo(
    () =>
      blueprint
        ? validateBlueprint(blueprint)
        : { isValid: false, errors: ["설계표가 아직 없습니다."], warnings: [], totalScore: 0 },
    [blueprint]
  );

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  };

  const mapUploadedReferences = (
    rows: UploadedReferenceRow[],
    status: ReferenceFile["status"] = "업로드됨"
  ): ReferenceFile[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.original_name,
      kind: row.kind as ReferenceFileKind,
      sizeLabel: formatFileSize(Number(row.file_size) || 0),
      status,
    }));

  const getAccessToken = async () => {
    const session = await getSessionWithRecovery();
    return session?.access_token ?? null;
  };

  const ensureJob = async () => {
    if (jobId) return jobId;

    const token = await getAccessToken();
    if (!token) throw new Error("로그인이 필요합니다.");

    const res = await fetch("/api/admin/exam-builder/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "제작 작업을 만들지 못했습니다.");

    setJobId(data.job.id);
    return data.job.id as string;
  };

  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return;

    const selectedFileArray = Array.from(selectedFiles);
    setBusyMessage("파일을 업로드하는 중입니다.");
    const uploadBatchId = Date.now();

    const pendingFiles = selectedFileArray.map((file, index) => ({
      id: `upload-${uploadBatchId}-${index}`,
      name: file.name,
      kind: referenceKind,
      sizeLabel: formatFileSize(file.size),
      status: "업로드 중" as const,
      file,
    }));

    setReferenceFiles((files) => [...files, ...pendingFiles]);

    try {
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token) throw new Error("로그인이 필요합니다.");

      const formData = new FormData();
      formData.append("kind", referenceKind);
      selectedFileArray.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/admin/exam-builder/jobs/${nextJobId}/references`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "파일 업로드에 실패했습니다.");

      const persistedFiles = mapUploadedReferences(data.files ?? []);
      const pendingIds = new Set(pendingFiles.map((file) => file.id));
      setReferenceFiles((files) => [
        ...files.filter((file) => !pendingIds.has(file.id)),
        ...persistedFiles,
      ]);
      setBusyMessage("업로드가 완료되었습니다.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.";
      const pendingIds = new Set(pendingFiles.map((file) => file.id));
      setReferenceFiles((files) =>
        files.map((file) =>
          pendingIds.has(file.id)
            ? {
                ...file,
                status: "업로드 실패" as const,
                errorMessage,
              }
            : file
        )
      );
      setBusyMessage(`${errorMessage} 서버 저장 없이 mock 분석을 진행할 수 있습니다.`);
    }
  };

  const handleAnalyze = async () => {
    try {
      const hasPersistedFiles = referenceFiles.some(
        (file) => file.status === "업로드됨" || file.status === "분석 완료"
      );
      const hasSessionFiles = referenceFiles.some((file) => file.file);

      if (!hasPersistedFiles && hasSessionFiles) {
        const nextAnalysis = analyzeReferenceFile(referenceFiles);
        setReferenceFiles((files) =>
          files.map((file) => ({
            ...file,
            status: "분석 완료" as const,
          }))
        );
        setAnalysis(nextAnalysis);
        setBlueprint(createInitialBlueprint(nextAnalysis));
        setBusyMessage("서버 업로드가 실패해 브라우저 세션 파일로 mock 분석을 완료했습니다.");
        setStep("analysis");
        return;
      }

      if (!hasPersistedFiles) throw new Error("서버에 저장된 참고 파일이 없습니다. 파일 업로드를 다시 시도해 주세요.");

      setBusyMessage("업로드 파일을 분석하는 중입니다.");
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token) throw new Error("로그인이 필요합니다.");

      const res = await fetch(`/api/admin/exam-builder/jobs/${nextJobId}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "분석에 실패했습니다.");

      setReferenceFiles(
        data.files
          ? (data.files as ReferenceFile[])
          : referenceFiles.map((file) => ({ ...file, status: "분석 완료" as const }))
      );
      setAnalysis(data.analysis);
      setBlueprint(data.blueprint);
      setBusyMessage("분석이 완료되었습니다.");
      setStep("analysis");
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
    }
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

  const handleStartGeneration = async () => {
    if (!blueprint || !validation.isValid) return;
    setGeneratedFiles([]);
    const localJob = startGenerationJob();
    setJob(localJob);
    setStep("generation");

    try {
      setBusyMessage("시험지 파일을 생성하는 중입니다.");
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token || !analysis) throw new Error("생성에 필요한 정보가 부족합니다.");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`/api/admin/exam-builder/jobs/${nextJobId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blueprint, analysis }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "파일 생성에 실패했습니다.");

      setExamSetId(data.examSetId);
      setGeneratedFiles(data.files ?? []);
      setJob({
        ...localJob,
        progress: 100,
        currentStepId: "export",
        status: "completed",
      });
      setBusyMessage("파일 생성이 완료되었습니다.");
      setStep("result");
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === "AbortError"
          ? "서버 파일 생성 시간이 길어져 mock 결과로 전환했습니다."
          : error instanceof Error
            ? error.message
            : "파일 생성 중 오류가 발생했습니다.";

      setGeneratedFiles(createExamFiles(blueprint));
      setJob({
        ...localJob,
        status: "completed",
        progress: 100,
        currentStepId: "export",
      });
      setBusyMessage(`${errorMessage} 실제 다운로드 파일은 서버 생성이 안정화된 뒤 제공됩니다.`);
      setStep("result");
    }
  };

  const renderContent = () => {
    if (step === "upload") {
      const canAnalyze = referenceFiles.some(
        (file) => file.status === "업로드됨" || file.status === "분석 완료" || Boolean(file.file)
      );

      return (
        <ReferenceUploadStep
          files={referenceFiles}
          selectedKind={referenceKind}
          canAnalyze={canAnalyze}
          onKindChange={setReferenceKind}
          onFilesSelected={handleFilesSelected}
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
          jobId={jobId}
          examSetId={examSetId}
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
          description={busyMessage || "업로드 파일은 Supabase Storage에 저장되고, 생성 결과는 DOCX/PDF 파일로 만들어집니다."}
        >
          {renderContent()}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
