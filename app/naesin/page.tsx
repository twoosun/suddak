import Link from "next/link";
import { Archive, Download, FileCheck2, Layers3 } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ExamSetCard from "@/components/naesin/exam-set-card";
import NaesinHeader from "@/components/naesin/naesin-header";
import SubjectFilter from "@/components/naesin/subject-filter";
import UnitPracticeSection from "@/components/naesin/unit-practice-section";
import {
  filterNaesinExamSets,
  naesinExamSets,
  naesinUnitPractices,
} from "@/lib/naesin/mock-data";
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
  const unitPractices =
    selectedSubject === "all"
      ? naesinUnitPractices
      : naesinUnitPractices.filter((practice) => practice.subject === selectedSubject);
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
              시험 범위에 맞춰 딱 필요한 문제만 모았습니다. 예상기출, 동형모의고사,
              단원별 문제 세트를 다운로드 중심으로 빠르게 확인하세요.
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
          title="관리자 예상기출 목록"
          description="검수된 예상기출과 변형 문제 세트를 과목별로 확인할 수 있습니다."
          rightSlot={
            <Link href="/admin/exam-builder" className="suddak-btn suddak-btn-ghost">
              <Archive size={16} />
              제작 도구
            </Link>
          }
        >
          <div className="naesin-exam-list">
            {examSets.map((examSet) => (
              <ExamSetCard key={examSet.id} examSet={examSet} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="단원별 문제풀이"
          description="향후 온라인 풀이, 정답 확인, AI 해설, 오답 저장과 연결될 단원별 학습 영역입니다."
        >
          <UnitPracticeSection practices={unitPractices} />
        </SectionCard>

        <SectionCard
          title="추천 자료"
          description="시험 직전에는 공개 예상기출과 동형모의고사를 먼저 확인하는 흐름으로 설계했습니다."
        >
          <div className="naesin-recommend-grid">
            {naesinExamSets
              .filter((set) => set.featured)
              .map((set) => (
                <Link key={set.id} href={`/naesin/${set.id}`} className="suddak-card-soft">
                  <span className="suddak-badge">{set.materialType}</span>
                  <strong>{set.title}</strong>
                  <p>{set.examRange}</p>
                </Link>
              ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
