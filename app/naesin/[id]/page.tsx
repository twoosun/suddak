import Link from "next/link";
import { Download, FileText, Lock, RotateCcw, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import NaesinHeader from "@/components/naesin/naesin-header";
import { fetchPublishedNaesinExamSet } from "@/lib/naesin/data";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NaesinDetailPage({ params }: Props) {
  const { id } = await params;
  const examSet = await fetchPublishedNaesinExamSet(id);

  if (!examSet) notFound();

  return (
    <PageContainer topPadding={18} bottomPadding={56}>
      <div className="naesin-page">
        <NaesinHeader compact />

        <section className="suddak-card naesin-detail-hero">
          <div>
            <div className="naesin-card-badges">
              <span className="suddak-badge">{examSet.subjectLabel}</span>
              <span className="suddak-badge">{examSet.materialType}</span>
              <span className="suddak-badge">{examSet.publishStatus}</span>
            </div>
            <h1>{examSet.title}</h1>
            <p>{examSet.detailDescription ?? examSet.description}</p>
          </div>

          <div className="naesin-detail-actions">
            <Link href="/naesin" className="suddak-btn suddak-btn-ghost">
              <RotateCcw size={16} />
              목록
            </Link>
            <button type="button" className="suddak-btn suddak-btn-primary" disabled aria-disabled="true">
              <Sparkles size={16} />
              온라인 풀이 준비 중
            </button>
          </div>
        </section>

        <div className="naesin-detail-grid">
          <SectionCard title="기본 정보" description="과목, 단원, 문항 구성과 공개 상태를 먼저 확인하세요.">
            <dl className="naesin-info-list">
              <div>
                <dt>과목</dt>
                <dd>수학</dd>
              </div>
              <div>
                <dt>세부 과목</dt>
                <dd>{examSet.subjectDetail ?? examSet.subjectLabel}</dd>
              </div>
              <div>
                <dt>단원</dt>
                <dd>{examSet.units.join(", ")}</dd>
              </div>
              <div>
                <dt>문항 수</dt>
                <dd>{examSet.problemCountLabel ?? `${examSet.problemCount}문항`}</dd>
              </div>
              <div>
                <dt>세트</dt>
                <dd>{examSet.setCountLabel ?? "1세트"}</dd>
              </div>
              <div>
                <dt>예상 시간</dt>
                <dd>{examSet.estimatedMinutesLabel ?? `${examSet.estimatedMinutes}분`}</dd>
              </div>
              <div>
                <dt>자료 유형</dt>
                <dd>{examSet.category ?? examSet.materialType}</dd>
              </div>
              <div>
                <dt>공개 상태</dt>
                <dd>{examSet.publishStatus}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="다운로드"
            description="문제지와 정답·해설지를 형식별로 제공합니다."
            id="solutions"
          >
            <div className="naesin-download-list">
              {examSet.downloads.map((asset) => (
                <a
                  key={`${asset.label}-${asset.format}`}
                  href={asset.available ? asset.path : undefined}
                  download={asset.available ? asset.downloadName ?? true : undefined}
                  className={`suddak-card-soft naesin-download-card ${
                    !asset.available ? "naesin-download-card-disabled" : ""
                  }`}
                  aria-label={`${examSet.units[0] ?? examSet.title} ${asset.label} ${asset.format} 다운로드`}
                  aria-disabled={!asset.available}
                  rel="noopener noreferrer"
                >
                  {asset.available ? <Download size={18} /> : <Lock size={18} />}
                  <div>
                    <strong>
                      {asset.label} {asset.format}
                    </strong>
                    <span>{asset.available ? "다운로드 가능" : "파일 준비 중"}</span>
                  </div>
                </a>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="포함 범위" description="이 자료에서 다루는 핵심 개념과 변형 유형입니다.">
          <div className="naesin-principle-grid">
            {(examSet.includedTopics ?? examSet.sourceBasis).map((topic) => (
              <div key={topic} className="suddak-card-soft naesin-principle-card">
                <FileText size={18} />
                <strong>{topic}</strong>
                <span>핵심 개념과 사고 구조를 반영한 변형 자료</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="자료 제작 원칙"
          description="본 자료는 수딱에서 학습 지원 목적으로 자체 제작한 변형 문제입니다."
        >
          <div className="naesin-principle-grid">
            {examSet.sourceBasis.map((basis) => (
              <div key={basis} className="suddak-card-soft naesin-principle-card">
                <FileText size={18} />
                <strong>{basis}</strong>
                <span>원문 단순 복제가 아닌 유형과 구조 중심 변형</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
