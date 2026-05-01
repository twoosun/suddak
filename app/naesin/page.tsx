import Link from "next/link";
import { Archive, Download, FileCheck2, Layers3 } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import NaesinHeader from "@/components/naesin/naesin-header";
import SubjectFilter from "@/components/naesin/subject-filter";
import { filterNaesinExamSets, naesinExamSets } from "@/lib/naesin/mock-data";
import type { NaesinSubject } from "@/lib/naesin/types";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSubject(value: string | string[] | undefined): NaesinSubject {
  const subject = Array.isArray(value) ? value[0] : value;
  if (
    subject === "common-math" ||
    subject === "math-1" ||
    subject === "math-2" ||
    subject === "calculus" ||
    subject === "probability" ||
    subject === "geometry"
  ) {
    return subject;
  }
  return "all";
}

export default async function NaesinPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedSubject = readSubject(resolvedSearchParams.subject);
  const examSets = filterNaesinExamSets(selectedSubject);
  const publicSetCount = naesinExamSets.filter((set) => set.publishStatus === "공개").length;

  return (
    <PageContainer topPadding={18} bottomPadding={56}>
      <div className="naesin-page">
        <NaesinHeader />

        <section className="suddak-card naesin-hero">
          <div className="naesin-hero-copy">
            <span className="naesin-eyebrow">수딱 내신 대비 전용</span>
            <h1>내신딱딱</h1>
            <p>
              시험 범위에 맞춰 딱 필요한 문제만 모았습니다. 관리자가 제작한 예상기출,
              동형모의고사, 단원별 문제 세트가 검수되면 이곳에 공개됩니다.
            </p>
          </div>
          <div className="naesin-hero-panel">
            <div>
              <strong>{publicSetCount}</strong>
              <span>공개 자료</span>
            </div>
            <div>
              <strong>{naesinExamSets.length}</strong>
              <span>제작 세트</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>풀이 연결 예정</span>
            </div>
          </div>
        </section>

        <SubjectFilter selected={selectedSubject} />

        <section className="naesin-feature-row" aria-label="내신딱딱 핵심 기능">
          <div className="suddak-card-soft naesin-feature">
            <FileCheck2 size={18} />
            <span>원문 복제가 아닌 자체 변형 문항</span>
          </div>
          <div className="suddak-card-soft naesin-feature">
            <Download size={18} />
            <span>문제지와 해설지 PDF/DOCX 제공</span>
          </div>
          <div className="suddak-card-soft naesin-feature">
            <Layers3 size={18} />
            <span>과목·단원·시험 범위 기반 구성</span>
          </div>
        </section>

        <SectionCard
          title="공개 자료"
          description="아직 공개된 내신딱딱 자료가 없습니다. 관리자 제작기에서 검수 후 게시하면 이 목록에 표시됩니다."
          rightSlot={
            <Link href="/admin/exam-builder" className="suddak-btn suddak-btn-ghost">
              <Archive size={16} />
              제작 도구
            </Link>
          }
        >
          {examSets.length === 0 ? (
            <div className="suddak-card-soft naesin-empty-state">
              공개 대기 중입니다. 예상기출, 동형모의고사, 단원별 문제 세트는 게시 후 이곳에 정리됩니다.
            </div>
          ) : null}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
