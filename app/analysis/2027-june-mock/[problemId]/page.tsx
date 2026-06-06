import type { Metadata } from "next";
import { notFound } from "next/navigation";

import JuneMockDetailPage from "@/components/analysis/JuneMockDetailPage";
import {
  JUNE_MOCK_ANALYSIS_PROBLEMS,
  getJuneMockAnalysisProblem,
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
    title: `2027학년도 6월 모평 ${problem.subject} ${problem.number}번 분석 | 수딱`,
    description: problem.summary,
  };
}

export default async function JuneMockProblemPage({ params }: Props) {
  const { problemId } = await params;
  const problem = getJuneMockAnalysisProblem(problemId);

  if (!problem) notFound();

  return <JuneMockDetailPage problem={problem} />;
}
