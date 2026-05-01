import Link from "next/link";
import { Download, FileText, Lock, RotateCcw, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import NaesinHeader from "@/components/naesin/naesin-header";
import { getNaesinExamSet, naesinExamSets } from "@/lib/naesin/mock-data";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return naesinExamSets.map((set) => ({ id: set.id }));
}

export default async function NaesinDetailPage({ params }: Props) {
  const { id } = await params;
  const examSet = getNaesinExamSet(id);

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
            <p>{examSet.description}</p>
          </div>

          <div className="naesin-detail-actions">
            <Link href="/naesin" className="suddak-btn suddak-btn-ghost">
              <RotateCcw size={16} />
              목록
            </Link>
            <button type="button" className="suddak-btn suddak-btn-primary" disabled>
              <Sparkles size={16} />
              온라인 풀이 준비중
            </button>
          </div>
        </section>

        <div className="naesin-detail-grid">
          <SectionCard title="시험지 정보" description="시험 범위와 문항 구성을 먼저 확인하세요.">
            <dl className="naesin-info-list">
              <div>
                <dt>과목</dt>
                <dd>{examSet.subjectLabel}</dd>
              </div>
              <div>
                <dt>단원</dt>
                <dd>{examSet.units.join(", ")}</dd>
              </div>
              <div>
                <dt>시험 범위</dt>
                <dd>{examSet.examRange}</dd>
              </div>
              <div>
                <dt>문항 수</dt>
                <dd>{examSet.problemCount}문항</dd>
              </div>
              <div>
                <dt>난이도</dt>
                <dd>{examSet.difficulty}</dd>
              </div>
              <div>
                <dt>자료 유형</dt>
                <dd>{examSet.materialType}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="다운로드" description="문제지와 정답 및 해설지를 형식별로 제공합니다.">
            <div className="naesin-download-list">
              {examSet.downloads.map((asset) => (
                <a
                  key={`${asset.label}-${asset.format}`}
                  href={asset.available ? asset.path : undefined}
                  className={`suddak-card-soft naesin-download-card ${
                    !asset.available ? "naesin-download-card-disabled" : ""
                  }`}
                  aria-disabled={!asset.available}
                >
                  {asset.available ? <Download size={18} /> : <Lock size={18} />}
                  <div>
                    <strong>
                      {asset.label} {asset.format}
                    </strong>
                    <span>{asset.available ? "다운로드 가능" : "검수 후 공개"}</span>
                  </div>
                </a>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="제작 원칙"
          description="내신딱딱 자료는 참고 자료의 원문을 복제하지 않고 출제 구조를 분석해 새 문항으로 재구성합니다."
        >
          <div className="naesin-principle-grid">
            {examSet.sourceBasis.map((basis) => (
              <div key={basis} className="suddak-card-soft naesin-principle-card">
                <FileText size={18} />
                <strong>{basis}</strong>
                <span>유형, 풀이 구조, 난이도 분포 분석용</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
