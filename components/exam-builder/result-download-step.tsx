"use client";

import { Download, Edit3, Eye, LockKeyhole, Send } from "lucide-react";

import type { ExamBlueprint, GeneratedExamFile, ReferenceAnalysisResult } from "@/lib/exam-builder/types";
import { getSessionWithRecovery } from "@/lib/supabase";

type Props = {
  files: GeneratedExamFile[];
  blueprint: ExamBlueprint;
  analysis: ReferenceAnalysisResult;
  jobId: string | null;
  examSetId: string | null;
  onEditBlueprint: () => void;
};

export default function ResultDownloadStep({
  files,
  blueprint,
  analysis,
  jobId,
  examSetId,
  onEditBlueprint,
}: Props) {
  const downloadableFiles = files.filter((file) => file.format !== "PDF");

  const handlePublish = async (publish: boolean) => {
    if (!jobId || !examSetId) return;

    const session = await getSessionWithRecovery();
    if (!session?.access_token) return;

    await fetch(`/api/admin/exam-builder/jobs/${jobId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ examSetId, publish }),
    });
  };

  return (
    <div className="exam-builder-step">
      <div className="exam-builder-result-grid">
        {downloadableFiles.map((file) => (
          <a
            key={file.id}
            href={file.href}
            className={`exam-builder-download-button ${
              file.format === "PDF" ? "exam-builder-download-pdf" : "exam-builder-download-docx"
            }`}
            target={file.href === "#" ? undefined : "_blank"}
            rel={file.href === "#" ? undefined : "noopener noreferrer"}
          >
            <Download size={15} />
            <span>{file.label}</span>
            <strong>{file.format}</strong>
          </a>
        ))}
      </div>

      <div className="exam-builder-action-row">
        <button
          type="button"
          className="suddak-btn suddak-btn-primary"
          onClick={() => handlePublish(true)}
          disabled={!jobId || !examSetId}
        >
          <Send size={16} />
          내신딱딱에 게시
        </button>
        <button
          type="button"
          className="suddak-btn suddak-btn-ghost"
          onClick={() => handlePublish(false)}
          disabled={!jobId || !examSetId}
        >
          <LockKeyhole size={16} />
          비공개 저장
        </button>
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onEditBlueprint}>
          <Edit3 size={16} />
          문항 수정하기
        </button>
      </div>

      <section className="suddak-card-soft exam-builder-preview">
        <div className="exam-builder-preview-title">
          <Eye size={18} />
          <strong>출제 분석표 미리보기</strong>
        </div>
        <dl className="exam-builder-preview-list">
          <div>
            <dt>시험지명</dt>
            <dd>{blueprint.title}</dd>
          </div>
          <div>
            <dt>출제 범위</dt>
            <dd>{blueprint.sourceRange}</dd>
          </div>
          <div>
            <dt>참고 자료</dt>
            <dd>{blueprint.referenceSummary}</dd>
          </div>
          <div>
            <dt>문항 구성 요약</dt>
            <dd>
              총 {blueprint.totalProblems}문항 · 객관식 {blueprint.multipleChoiceCount}문항 ·
              서술형 {blueprint.writtenCount}문항
            </dd>
          </div>
          <div>
            <dt>난이도 분포</dt>
            <dd>
              {Object.entries(analysis.difficultyDistribution)
                .map(([difficulty, count]) => `${difficulty} ${count}`)
                .join(", ")}
            </dd>
          </div>
          <div>
            <dt>변형 강도 분포</dt>
            <dd>
              {(["낮음", "중간", "높음"] as const)
                .map(
                  (strength) =>
                    `${strength} ${
                      blueprint.items.filter((item) => item.transformStrength === strength).length
                    }`
                )
                .join(", ")}
            </dd>
          </div>
          <div>
            <dt>문항별 출제 의도</dt>
            <dd>{blueprint.items.map((item) => `${item.number}번 ${item.intent}`).join(" / ")}</dd>
          </div>
          <div>
            <dt>원문 유사도 평가</dt>
            <dd>문장, 수치, 조건 배열, 선지 표현의 직접 복제를 피하고 고위험 문항은 재생성을 권장합니다.</dd>
          </div>
          <div>
            <dt>교육과정 적합성</dt>
            <dd>{blueprint.subject} 범위의 개념과 성취기준 안에서 구성된 검토 결과입니다.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
