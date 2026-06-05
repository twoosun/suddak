"use client";

import { useMemo, useState } from "react";

import JuneMockProblemCard from "@/components/analysis/JuneMockProblemCard";
import {
  JUNE_MOCK_ANALYSIS_PROBLEMS,
  JUNE_MOCK_SUBJECT_FILTERS,
  type AnalysisSubjectFilter,
} from "@/lib/juneMockAnalysis";

export default function JuneMockProblemGrid() {
  const [activeFilter, setActiveFilter] = useState<AnalysisSubjectFilter>("전체");
  const filteredProblems = useMemo(() => {
    if (activeFilter === "전체") return JUNE_MOCK_ANALYSIS_PROBLEMS;
    return JUNE_MOCK_ANALYSIS_PROBLEMS.filter((problem) => problem.subject === activeFilter);
  }, [activeFilter]);

  return (
    <section id="june-analysis-problems" className="june-analysis-section">
      <div className="june-analysis-section-head">
        <h2>주요 문항 분석</h2>
        <p>문항별 핵심 아이디어를 확인하고, 연결된 유사문항으로 바로 복습해 보세요.</p>
      </div>
      <div className="june-analysis-filter-row" aria-label="과목별 필터">
        {JUNE_MOCK_SUBJECT_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`june-analysis-filter ${activeFilter === filter ? "june-analysis-filter-active" : ""}`}
            onClick={() => setActiveFilter(filter)}
            aria-pressed={activeFilter === filter}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="june-analysis-problem-grid">
        {filteredProblems.map((problem) => (
          <JuneMockProblemCard key={problem.id} problem={problem} />
        ))}
      </div>
    </section>
  );
}
