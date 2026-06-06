import type { Metadata } from "next";

import JuneMockPracticePage from "@/components/analysis/JuneMockPracticePage";
import {
  getJuneMockAnalysisProblem,
  getJuneMockPracticeProblems,
} from "@/lib/juneMockAnalysis";

export const metadata: Metadata = {
  title: "2027학년도 6월 모평 공통 22번 유사문항 | 수딱",
  description:
    "귀납적으로 정의된 수열의 경우 분류를 연습하는 수딱 자체 제작 단답형 유사문항 3제입니다.",
};

export default function Common22PracticePage() {
  const problem = getJuneMockAnalysisProblem("common-22");

  if (!problem) return null;

  return (
    <JuneMockPracticePage
      problem={problem}
      practiceProblems={getJuneMockPracticeProblems(problem.id)}
    />
  );
}
