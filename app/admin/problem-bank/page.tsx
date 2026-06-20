"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, formatDate } from "@/lib/problem-bank/admin-client";
import type { ProblemRow } from "@/lib/problem-bank/types";

type ListResponse = {
  problems: ProblemRow[];
};

const sourceTypes = ["", "suneung", "mock", "school_exam", "ebs_special", "ebs_complete"];

const cellStyle = { padding: 8, borderBottom: "1px solid var(--border)" };

export default function ProblemBankAdminPage() {
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [selected, setSelected] = useState<ProblemRow | null>(null);
  const [message, setMessage] = useState("문제은행 목록을 불러오는 중입니다.");
  const [filters, setFilters] = useState({
    problem_code: "",
    base_problem_code: "",
    source_type: "",
    subject: "",
    unit: "",
    difficulty: "",
    tags: "",
  });

  const load = async () => {
    setMessage("문제 목록을 불러오는 중입니다.");
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    const data = await adminFetch<ListResponse>(`/api/admin/problem-bank?${params.toString()}`);
    setProblems(data.problems);
    setMessage(`${data.problems.length}개 문항을 불러왔습니다.`);
  };

  useEffect(() => {
    let alive = true;
    adminFetch<ListResponse>("/api/admin/problem-bank")
      .then((data) => {
        if (!alive) return;
        setProblems(data.problems);
        setMessage(`${data.problems.length}개 문항을 불러왔습니다.`);
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const deleteSelected = async () => {
    if (!selected || !confirm(`${selected.problem_code} 문항을 삭제할까요?`)) return;
    await adminFetch(`/api/admin/problem-bank/${selected.id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>문제은행 관리</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>문항 검색, 상세 확인, 수정, 삭제를 관리합니다.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="suddak-btn suddak-btn-primary" href="/admin/problem-bank/new">개별 등록</Link>
          <Link className="suddak-btn suddak-btn-ghost" href="/admin/problem-bank/import">JSON import</Link>
        </div>
      </header>

      <SectionCard title="검색 / 필터" description={message}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <input className="suddak-input" placeholder="problem_code" value={filters.problem_code} onChange={(e) => updateFilter("problem_code", e.target.value)} />
          <input className="suddak-input" placeholder="base_problem_code" value={filters.base_problem_code} onChange={(e) => updateFilter("base_problem_code", e.target.value)} />
          <select className="suddak-input" value={filters.source_type} onChange={(e) => updateFilter("source_type", e.target.value)}>
            {sourceTypes.map((item) => <option key={item || "all"} value={item}>{item || "source_type 전체"}</option>)}
          </select>
          <input className="suddak-input" placeholder="subject" value={filters.subject} onChange={(e) => updateFilter("subject", e.target.value)} />
          <input className="suddak-input" placeholder="unit" value={filters.unit} onChange={(e) => updateFilter("unit", e.target.value)} />
          <input className="suddak-input" placeholder="difficulty" value={filters.difficulty} onChange={(e) => updateFilter("difficulty", e.target.value)} />
          <input className="suddak-input" placeholder="tags: 정적분,그래프" value={filters.tags} onChange={(e) => updateFilter("tags", e.target.value)} />
          <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void load()}>검색</button>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 420px)", gap: 14, marginTop: 14 }}>
        <SectionCard title="문항 목록">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                  {["problem_code", "source", "subject", "unit", "level", "difficulty", "question_type", "has_graph", "created_at"].map((head) => (
                    <th key={head} style={cellStyle}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.id} onClick={() => setSelected(problem)} style={{ cursor: "pointer", background: selected?.id === problem.id ? "var(--surface-2)" : "transparent" }}>
                    <td style={cellStyle}><strong>{problem.problem_code}</strong></td>
                    <td style={cellStyle}>{problem.source}</td>
                    <td style={cellStyle}>{problem.subject}</td>
                    <td style={cellStyle}>{problem.unit ?? "-"}</td>
                    <td style={cellStyle}>{problem.level ?? "-"}</td>
                    <td style={cellStyle}>{problem.difficulty ?? "-"}</td>
                    <td style={cellStyle}>{problem.question_type}</td>
                    <td style={cellStyle}>{problem.has_graph ? "Y" : "N"}</td>
                    <td style={cellStyle}>{formatDate(problem.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="상세 보기">
          {selected ? (
            <div style={{ display: "grid", gap: 10 }}>
              <strong>{selected.problem_code}</strong>
              <div className="suddak-card-soft" style={{ padding: 12, whiteSpace: "pre-wrap" }}>{selected.question_latex}</div>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>전체 JSON</summary>
                <pre style={{ overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(selected, null, 2)}</pre>
              </details>
              <Link className="suddak-btn suddak-btn-ghost" href={`/admin/problem-bank/new?id=${selected.id}`}>수정</Link>
              <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void deleteSelected()}>삭제</button>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontWeight: 700 }}>왼쪽 목록에서 문항을 선택하세요.</p>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
