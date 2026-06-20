"use client";

import { useEffect, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch } from "@/lib/problem-bank/admin-client";
import type { ExamTemplateRow, GeneratedExamRow, ProblemRow } from "@/lib/problem-bank/types";

type TemplatesResponse = {
  templates: ExamTemplateRow[];
};

type GeneratorResponse = {
  problems: ProblemRow[];
  exam?: GeneratedExamRow;
};

export default function ExamGeneratorPage() {
  const [templates, setTemplates] = useState<ExamTemplateRow[]>([]);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [exam, setExam] = useState<GeneratedExamRow | null>(null);
  const [message, setMessage] = useState("조건을 입력하고 추천 문항을 불러오세요.");
  const [form, setForm] = useState({
    title: "송도고형 동형시험지",
    school_name: "송도고",
    template_id: "",
    subject: "미적분",
    range_text: "",
    source_type: "",
    unit: "",
    problem_count: "20",
    multiple_choice_count: "15",
    short_answer_count: "5",
    difficulty_policy: "하 4, 중 10, 상 6",
  });

  useEffect(() => {
    adminFetch<TemplatesResponse>("/api/admin/exam-templates")
      .then((data) => {
        setTemplates(data.templates);
        setForm((current) => ({ ...current, template_id: current.template_id || data.templates[0]?.id || "" }));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "템플릿을 불러오지 못했습니다."));
  }, []);

  const setValue = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const request = async (mode: "recommend" | "save") => {
    try {
      const data = await adminFetch<GeneratorResponse>("/api/admin/exam-generator", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          mode,
          problem_count: Number(form.problem_count || 20),
          source_filter_json: {
            source_type: form.source_type,
            unit: form.unit,
            multiple_choice_count: Number(form.multiple_choice_count || 0),
            short_answer_count: Number(form.short_answer_count || 0),
          },
          difficulty_policy_json: { text: form.difficulty_policy },
        }),
      });
      setProblems(data.problems);
      setExam(data.exam ?? null);
      setMessage(mode === "save" ? "generated_exams에 저장했습니다." : `${data.problems.length}개 문항을 추천했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "생성에 실패했습니다.");
    }
  };

  const replaceProblem = async (index: number) => {
    const data = await adminFetch<{ problems: ProblemRow[] }>("/api/admin/exam-generator", {
      method: "POST",
      body: JSON.stringify({ ...form, problem_count: 10, source_type: form.source_type, subject: form.subject, unit: form.unit }),
    });
    const replacement = data.problems.find((problem) => !problems.some((current) => current.id === problem.id));
    if (!replacement) return;
    setProblems((current) => current.map((problem, currentIndex) => (currentIndex === index ? replacement : problem)));
  };

  const upload = async (role: string, file: File | null) => {
    if (!exam || !file) return;
    const formData = new FormData();
    formData.append("role", role);
    formData.append("file", file);
    const data = await adminFetch<{ exam: GeneratedExamRow }>(`/api/admin/exam-generator/${exam.id}/upload`, {
      method: "POST",
      body: formData,
    });
    setExam(data.exam);
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>내신딱딱 동형시험지 생성</h1>
        <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
      </header>

      <SectionCard title="생성 조건">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input className="suddak-input" placeholder="title" value={form.title} onChange={(e) => setValue("title", e.target.value)} />
          <input className="suddak-input" placeholder="school_name" value={form.school_name} onChange={(e) => setValue("school_name", e.target.value)} />
          <select className="suddak-input" value={form.template_id} onChange={(e) => setValue("template_id", e.target.value)}>
            <option value="">템플릿 선택</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.school_name} / {template.template_name}</option>)}
          </select>
          <input className="suddak-input" placeholder="subject" value={form.subject} onChange={(e) => setValue("subject", e.target.value)} />
          <input className="suddak-input" placeholder="range_text" value={form.range_text} onChange={(e) => setValue("range_text", e.target.value)} />
          <select className="suddak-input" value={form.source_type} onChange={(e) => setValue("source_type", e.target.value)}>
            <option value="">source_type 전체</option>
            <option value="suneung">suneung</option>
            <option value="mock">mock</option>
            <option value="school_exam">school_exam</option>
            <option value="ebs_special">ebs_special</option>
            <option value="ebs_complete">ebs_complete</option>
          </select>
          <input className="suddak-input" placeholder="unit" value={form.unit} onChange={(e) => setValue("unit", e.target.value)} />
          <input className="suddak-input" placeholder="문항 수" value={form.problem_count} onChange={(e) => setValue("problem_count", e.target.value)} />
          <input className="suddak-input" placeholder="객관식 수" value={form.multiple_choice_count} onChange={(e) => setValue("multiple_choice_count", e.target.value)} />
          <input className="suddak-input" placeholder="주관식 수" value={form.short_answer_count} onChange={(e) => setValue("short_answer_count", e.target.value)} />
          <input className="suddak-input" placeholder="난이도 분포" value={form.difficulty_policy} onChange={(e) => setValue("difficulty_policy", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void request("recommend")}>조건 기반 추천</button>
          <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void request("save")}>시험지 저장</button>
        </div>
      </SectionCard>

      <SectionCard title="추천 문항 / 수동 교체">
        <div style={{ display: "grid", gap: 8 }}>
          {problems.map((problem, index) => (
            <div key={`${problem.id}-${index}`} className="suddak-card-soft" style={{ padding: 10 }}>
              <strong>{index + 1}. {problem.problem_code}</strong>
              <div style={{ color: "var(--muted)", fontWeight: 700 }}>{problem.source} / {problem.subject} / {problem.unit ?? "-"} / 난이도 {problem.difficulty ?? "-"}</div>
              <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void replaceProblem(index)} style={{ marginTop: 8 }}>이 문항 교체</button>
            </div>
          ))}
        </div>
      </SectionCard>

      {exam ? (
        <SectionCard title="PDF/DOCX/해설지 연결">
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>저장 ID: {exam.id}</p>
          {[
            ["pdf_url", "시험지 PDF"],
            ["docx_url", "시험지 DOCX"],
            ["solution_pdf_url", "해설 PDF"],
          ].map(([role, label]) => (
            <label key={role} className="suddak-card-soft" style={{ padding: 12, display: "grid", gap: 8, marginTop: 8 }}>
              <strong>{label}</strong>
              <span style={{ wordBreak: "break-all", color: "var(--muted)" }}>{String(exam[role as keyof GeneratedExamRow] ?? "파일 없음")}</span>
              <input type="file" onChange={(e) => void upload(role, e.target.files?.[0] ?? null)} />
            </label>
          ))}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
