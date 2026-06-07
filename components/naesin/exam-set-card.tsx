import Link from "next/link";
import type { ReactNode } from "react";
import { Download, FileText, Lock, PlayCircle } from "lucide-react";

import type { NaesinDownloadAsset, NaesinExamSet } from "@/lib/naesin/types";

type Props = {
  examSet: NaesinExamSet;
};

function findDownload(
  examSet: NaesinExamSet,
  label: NaesinDownloadAsset["label"],
  format: NaesinDownloadAsset["format"]
) {
  return examSet.downloads.find((asset) => asset.label === label && asset.format === format);
}

function DownloadButton({
  asset,
  children,
  ariaLabel,
}: {
  asset: NaesinDownloadAsset | undefined;
  children: ReactNode;
  ariaLabel: string;
}) {
  const disabled = !asset?.available;

  return (
    <a
      href={disabled ? undefined : asset.path}
      download={disabled ? undefined : asset.downloadName ?? true}
      className={`suddak-btn suddak-btn-ghost ${disabled ? "naesin-disabled-link" : ""}`}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      rel="noopener noreferrer"
    >
      {disabled ? <Lock size={16} /> : <Download size={16} />}
      {children}
    </a>
  );
}

export default function ExamSetCard({ examSet }: Props) {
  const problemDocx = findDownload(examSet, "문제지", "DOCX");
  const problemPdf = findDownload(examSet, "문제지", "PDF");

  return (
    <article className="suddak-card-soft naesin-exam-card">
      <Link href={`/naesin/${examSet.id}`} className="naesin-exam-card-main">
        <div className="naesin-card-badges">
          <span className="suddak-badge">{examSet.subjectLabel}</span>
          <span className="suddak-badge">{examSet.materialType}</span>
          {examSet.featured && <span className="suddak-badge naesin-badge-accent">추천</span>}
        </div>

        <h3 className="naesin-card-title">{examSet.title}</h3>
        <p className="naesin-card-description">{examSet.description}</p>

        <div className="naesin-meta-grid">
          <span>{examSet.problemCountLabel ?? `${examSet.problemCount}문항`}</span>
          <span>{examSet.setCountLabel ?? examSet.difficulty}</span>
          <span>{examSet.estimatedMinutesLabel ?? `${examSet.estimatedMinutes}분`}</span>
          <span>{examSet.publishStatus}</span>
        </div>
      </Link>

      <div className="naesin-card-actions">
        <DownloadButton
          asset={problemDocx}
          ariaLabel={`${examSet.units[0] ?? examSet.title} 문제지 DOCX 다운로드`}
        >
          문제지 DOCX
        </DownloadButton>
        <DownloadButton
          asset={problemPdf}
          ariaLabel={`${examSet.units[0] ?? examSet.title} 문제지 PDF 다운로드`}
        >
          문제지 PDF
        </DownloadButton>
        <Link
          href={`/naesin/${examSet.id}#solutions`}
          className="suddak-btn suddak-btn-ghost"
          aria-label={`${examSet.units[0] ?? examSet.title} 정답 및 해설 보기`}
        >
          <FileText size={16} />
          정답·해설
        </Link>
        <Link
          href={`/naesin/${examSet.id}`}
          className="suddak-btn suddak-btn-primary"
          aria-label={`${examSet.units[0] ?? examSet.title} 상세 정보 보기`}
        >
          <FileText size={16} />
          상세
        </Link>
      </div>

      <button type="button" className="suddak-btn suddak-btn-ghost naesin-online-disabled" disabled aria-disabled="true">
        <PlayCircle size={16} />
        온라인 풀이 기능은 준비 중입니다.
      </button>
    </article>
  );
}
