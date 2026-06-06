import type { Metadata } from "next";
import { notFound } from "next/navigation";

import JuneMockPracticePage from "@/components/analysis/JuneMockPracticePage";
import {
  JUNE_MOCK_ANALYSIS_PROBLEMS,
  getJuneMockAnalysisProblem,
  getJuneMockPracticeProblems,
} from "@/lib/juneMockAnalysis";

type Props = {
  params: Promise<{ problemId: string }>;
};

export function generateStaticParams() {
  return JUNE_MOCK_ANALYSIS_PROBLEMS.filter(
    (problem) => problem.id !== "common-22"
  ).map((problem) => ({ problemId: problem.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { problemId } = await params;
  const problem = getJuneMockAnalysisProblem(problemId);

  if (!problem) return {};

  return {
    title: `2027학년도 6월 모평 ${problem.subject} ${problem.number}번 유사문항 | 수딱`,
    description: `${problem.title}의 핵심 풀이 구조를 연습하는 수딱 자체 제작 단답형 유사문항 3제입니다.`,
  };
}

export default async function JuneMockPracticeRoute({ params }: Props) {
  const { problemId } = await params;
  const problem = getJuneMockAnalysisProblem(problemId);

  if (!problem) notFound();

  const practiceProblems = getJuneMockPracticeProblems(problemId);
  if (practiceProblems.length !== 3) notFound();

  return (
    <JuneMockPracticePage
      problem={problem}
      practiceProblems={practiceProblems}
    />
  );
}
