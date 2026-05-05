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
  createBlueprintFromAnalysis,
  createInitialBlueprint,
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
  { id: "analysis", label: "자료 분석 결과" },
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
    format: "객관식" as BlueprintItem["format"],
    referenceLocation: "",
    topic: "",
    problemType: "",
    score: 3.0,
    difficulty: "중간" as BlueprintItem["difficulty"],
    transformStrength: "중간" as BlueprintItem["transformStrength"],
    intent: "",
  };
}

export default function ExamBuilderPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMessage, setAuthMessage] = useState("愿由ъ옄 沅뚰븳???뺤씤?섎뒗 以묒엯?덈떎.");

  const [step, setStep] = useState<ExamBuilderStep>("upload");
  const [referenceKind, setReferenceKind] = useState<ReferenceFileKind>("수능특강" as ReferenceFileKind);
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
        setAuthMessage("?숉삎?쒗뿕吏 ?쒖옉 湲곕뒫? 愿由ъ옄留??ъ슜?????덉뒿?덈떎.");
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
            ? "愿由ъ옄 沅뚰븳???뺤씤?섏뿀?듬땲??"
            : "?숉삎?쒗뿕吏 ?쒖옉 湲곕뒫? 愿由ъ옄留??ъ슜?????덉뒿?덈떎."
        );
        setAuthChecked(true);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
        setAuthMessage("愿由ъ옄 沅뚰븳 ?뺤씤 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
        setAuthChecked(true);
      }
    };

    checkAdmin();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "generation" || !jobId) return;

    let alive = true;
    const pollJob = async () => {
      const token = await getAccessToken();
      if (!token || !alive) return;

      try {
        const res = await fetch(`/api/admin/exam-builder/jobs/${jobId}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const row = data?.job;
        if (!alive || !res.ok || !row) return;

        setJob({
          id: row.id,
          progress: Number(row.progress) || 0,
          currentStepId: String(row.current_step || "draft"),
          status: row.status === "completed" ? "completed" : "running",
        });
      } catch {}
    };

    void pollJob();
    const timer = window.setInterval(() => void pollJob(), 2500);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [jobId, step]);

  const stepIndex = steps.findIndex((item) => item.id === step);
  const validation = useMemo(
    () =>
      blueprint
        ? validateBlueprint(blueprint)
        : { isValid: false, errors: ["?ㅺ퀎?쒓? ?꾩쭅 ?놁뒿?덈떎."], warnings: [], totalScore: 0 },
    [blueprint]
  );

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  };

  const mapUploadedReferences = (
    rows: UploadedReferenceRow[],
    status: ReferenceFile["status"] = "업로드됨" as ReferenceFile["status"]
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
    if (!token) throw new Error("濡쒓렇?몄씠 ?꾩슂?⑸땲??");

    const res = await fetch("/api/admin/exam-builder/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "?쒖옉 ?묒뾽??留뚮뱾吏 紐삵뻽?듬땲??");

    setJobId(data.job.id);
    return data.job.id as string;
  };

  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return;

    const selectedFileArray = Array.from(selectedFiles);
    setBusyMessage("?뚯씪???낅줈?쒗븯??以묒엯?덈떎.");
    const uploadBatchId = Date.now();

    const pendingFiles = selectedFileArray.map((file, index) => ({
      id: `upload-${uploadBatchId}-${index}`,
      name: file.name,
      kind: referenceKind,
      sizeLabel: formatFileSize(file.size),
      status: "업로드 중" as ReferenceFile["status"],
      file,
    }));

    setReferenceFiles((files) => [...files, ...pendingFiles]);

    try {
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token) throw new Error("濡쒓렇?몄씠 ?꾩슂?⑸땲??");

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
      if (!res.ok) throw new Error(data?.error || "?뚯씪 ?낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎.");

      const persistedFiles = mapUploadedReferences(data.files ?? []);
      const pendingIds = new Set(pendingFiles.map((file) => file.id));
      setReferenceFiles((files) => [
        ...files.filter((file) => !pendingIds.has(file.id)),
        ...persistedFiles,
      ]);
      setBusyMessage("?낅줈?쒓? ?꾨즺?섏뿀?듬땲??");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "?뚯씪 ?낅줈??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.";
      const pendingIds = new Set(pendingFiles.map((file) => file.id));
      setReferenceFiles((files) =>
        files.map((file) =>
          pendingIds.has(file.id)
            ? {
                ...file,
                status: "업로드 실패" as ReferenceFile["status"],
                errorMessage,
              }
            : file
        )
      );
      setBusyMessage(`${errorMessage} ?쒕쾭 ????놁씠 mock 遺꾩꽍??吏꾪뻾?????덉뒿?덈떎.`);
    }
  };

  const handleAnalyze = async () => {
    try {
      const hasPersistedFiles = referenceFiles.some(
        (file) => file.status === ("업로드됨" as ReferenceFile["status"]) || file.status === ("분석 완료" as ReferenceFile["status"])
      );
      const hasSessionFiles = referenceFiles.some((file) => file.file);

      if (!hasPersistedFiles && hasSessionFiles) {
        const nextAnalysis = analyzeReferenceFile(referenceFiles);
        setReferenceFiles((files) =>
          files.map((file) => ({
            ...file,
            status: "분석 완료" as ReferenceFile["status"],
          }))
        );
        setAnalysis(nextAnalysis);
        setBlueprint(createInitialBlueprint(nextAnalysis));
        setBusyMessage("?쒕쾭 ?낅줈?쒓? ?ㅽ뙣??釉뚮씪?곗? ?몄뀡 ?뚯씪濡?mock 遺꾩꽍???꾨즺?덉뒿?덈떎.");
        setStep("analysis");
        return;
      }

      if (!hasPersistedFiles) throw new Error("?쒕쾭????λ맂 李멸퀬 ?뚯씪???놁뒿?덈떎. ?뚯씪 ?낅줈?쒕? ?ㅼ떆 ?쒕룄??二쇱꽭??");

      setBusyMessage("?낅줈???뚯씪??遺꾩꽍?섎뒗 以묒엯?덈떎.");
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token) throw new Error("濡쒓렇?몄씠 ?꾩슂?⑸땲??");

      const res = await fetch(`/api/admin/exam-builder/jobs/${nextJobId}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "遺꾩꽍???ㅽ뙣?덉뒿?덈떎.");

      setReferenceFiles(
        data.files
          ? (data.files as ReferenceFile[])
          : referenceFiles.map((file) => ({ ...file, status: "분석 완료" as ReferenceFile["status"] }))
      );
      setAnalysis(data.analysis);
      setBlueprint(data.blueprint);
      setBusyMessage("遺꾩꽍???꾨즺?섏뿀?듬땲??");
      setStep("analysis");
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : "遺꾩꽍 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
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
      multipleChoiceCount: nextItems.filter((item) => item.format === ("객관식" as BlueprintItem["format"])).length,
      writtenCount: nextItems.filter((item) => item.format === ("서술형" as BlueprintItem["format"])).length,
      items: normalizeBlueprintNumbers(nextItems),
    });
  };

  const handleDeleteRow = (id: string) => {
    if (!blueprint) return;
    const nextItems = normalizeBlueprintNumbers(blueprint.items.filter((item) => item.id !== id));
    setBlueprint({
      ...blueprint,
      totalProblems: nextItems.length,
      multipleChoiceCount: nextItems.filter((item) => item.format === ("객관식" as BlueprintItem["format"])).length,
      writtenCount: nextItems.filter((item) => item.format === ("서술형" as BlueprintItem["format"])).length,
      items: nextItems,
    });
  };

  const handleAutoArrange = () => {
    if (!blueprint) return;
    const nextItems = normalizeBlueprintNumbers(
      [...blueprint.items].sort((a, b) => {
        const order = new Map<BlueprintItem["difficulty"], number>([
          ["기본" as BlueprintItem["difficulty"], 0],
          ["중간" as BlueprintItem["difficulty"], 1],
          ["상" as BlueprintItem["difficulty"], 2],
          ["고난도" as BlueprintItem["difficulty"], 3],
        ]);
        return (order.get(a.difficulty) ?? 1) - (order.get(b.difficulty) ?? 1);
      })
    );

    setBlueprint({ ...blueprint, items: nextItems });
  };

  const handleAutoDesign = () => {
    if (!analysis || !blueprint) return;
    setBlueprint(createBlueprintFromAnalysis(analysis, blueprint.totalProblems));
  };

  const handleRecommendAgain = () => {
    const nextAnalysis = analysis ?? analyzeReferenceFile(referenceFiles);
    setAnalysis(nextAnalysis);
    setBlueprint(createBlueprintFromAnalysis(nextAnalysis, blueprint?.totalProblems ?? 20));
  };

  const handleStartGeneration = async () => {
    if (!blueprint || !validation.isValid) return;
    setGeneratedFiles([]);
    const localJob = startGenerationJob();
    setJob(localJob);
    setStep("generation");

    try {
      setBusyMessage("?쒗뿕吏 ?뚯씪???앹꽦?섎뒗 以묒엯?덈떎.");
      const nextJobId = await ensureJob();
      const token = await getAccessToken();
      if (!token || !analysis) throw new Error("?앹꽦???꾩슂???뺣낫媛 遺議깊빀?덈떎.");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15 * 60 * 1000);

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
      if (!res.ok) throw new Error(data?.error || "?뚯씪 ?앹꽦???ㅽ뙣?덉뒿?덈떎.");

      setExamSetId(data.examSetId);
      if (data.blueprint) setBlueprint(data.blueprint);
      setGeneratedFiles(data.files ?? []);
      setJob({
        ...localJob,
        progress: 100,
        currentStepId: "export",
        status: "completed",
      });
      setBusyMessage("?뚯씪 ?앹꽦???꾨즺?섏뿀?듬땲??");
      setStep("result");
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === "AbortError"
          ? "생성 시간이 15분을 넘었습니다. 문항 수를 줄이거나 다시 시도해 주세요."
          : error instanceof Error
            ? error.message
            : "?뚯씪 ?앹꽦 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.";

      setJob({
        ...localJob,
        status: "completed",
        progress: job?.progress ?? localJob.progress,
        currentStepId: job?.currentStepId ?? localJob.currentStepId,
      });
      setBusyMessage(errorMessage);
      setStep("blueprint");
    }
  };

  const renderContent = () => {
    if (step === "upload") {
      const canAnalyze = referenceFiles.some(
        (file) => file.status === ("업로드됨" as ReferenceFile["status"]) || file.status === ("분석 완료" as ReferenceFile["status"]) || Boolean(file.file)
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
          onAutoDesign={handleAutoDesign}
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
        ?댁쟾 ?④퀎???뺣낫媛 ?꾩슂?⑸땲?? ?④퀎 踰꾪듉???뚮윭 ?먮쫫???ㅼ떆 ?뺤씤?섏꽭??
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
        <div className="exam-builder-page">
          <header className="suddak-card exam-builder-header">
            <Link href="/" className="suddak-btn suddak-btn-ghost">
              <ChevronLeft size={18} />
              ?덉쑝濡?            </Link>
            <div>
              <span className="exam-builder-eyebrow">?숉삎?쒗뿕吏</span>
              <h1>?숉삎?쒗뿕吏 ?쒖옉</h1>
              <p>湲곗〈 ?쒗뿕吏???뺤떇怨?異쒖젣 ?먮쫫??遺꾩꽍??鍮꾩듂??援ъ“???쒗뿕吏瑜??쒖옉?섎뒗 湲곕뒫?낅땲??</p>
            </div>
            <span className="suddak-badge">
              <ShieldAlert size={14} />
              愿由ъ옄 ?꾩슜 湲곕뒫
            </span>
          </header>

          <div className="suddak-card exam-builder-access-card">
            <ShieldAlert size={28} />
            <h1>愿由ъ옄 ?꾩슜 湲곕뒫</h1>
            <p>
              ?꾩옱 ?숉삎?쒗뿕吏 ?쒖옉 湲곕뒫? ?덉젙?곸씤 ?덉쭏 愿由щ? ?꾪빐 愿由ъ옄留??ъ슜?????덉뒿?덈떎. ?쇰컲 ?좎? 怨듦컻??異뷀썑
              ?쒓났???덉젙?낅땲??
            </p>
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={() => alert("?꾩옱 ?숉삎?쒗뿕吏 ?쒖옉? 愿由ъ옄留??ъ슜?????덉뒿?덈떎.")}
            >
              愿由ъ옄 ?꾩슜 湲곕뒫
            </button>
          </div>
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
            내신쌤
          </Link>
          <div>
            <span className="exam-builder-eyebrow">관리자 전용</span>
            <h1>동형시험지 제작기</h1>
            <p>참고 자료 분석, 출제 설계표 편집, 고품질 동형문항 생성, 결과 파일 제공까지 한 흐름으로 진행합니다.</p>
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
          description={busyMessage || "업로드 파일을 분석하고 생성 결과를 DOCX 파일로 만듭니다."}
        >
          {renderContent()}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
