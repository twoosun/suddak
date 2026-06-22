"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, toJsonOrString } from "@/lib/problem-bank/admin-client";
import { stripVariantCode } from "@/lib/problem-bank/code";
import type { ProblemRow } from "@/lib/problem-bank/types";

type ProblemResponse = {
  problem: ProblemRow;
};

const emptyForm = {
  problem_code: "",
  base_problem_code: "",
  variant_code: "",
  code_system: "kice",
  source: "",
  source_type: "mock",
  exam_year: "",
  exam_month: "",
  problem_number: "",
  subject: "미적분",
  unit: "",
  level: "",
  original_ref: "",
  ebs_original_code: "",
  internal_code: "",
  question_type: "multiple_choice",
  question_latex: "",
  choices_json: "",
  answer_json: "",
  solution_latex: "",
  difficulty: "",
  variant_strength: "",
  tags: "",
  has_graph: false,
  graph_json: "",
  layout_json: "",
  visibility: "private",
  price_dak: "0",
};

function ProblemNewForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(editId ? "문항을 불러오는 중입니다." : "새 문항을 등록합니다.");

  useEffect(() => {
    if (!editId) return;
    adminFetch<ProblemResponse>(`/api/admin/problem-bank/${editId}`)
      .then(({ problem }) => {
        setForm({
          ...emptyForm,
          problem_code: problem.problem_code,
          base_problem_code: problem.base_problem_code,
          variant_code: problem.variant_code ?? "",
          code_system: problem.code_system,
          source: problem.source,
          source_type: problem.source_type,
          exam_year: String(problem.exam_year ?? ""),
          exam_month: String(problem.exam_month ?? ""),
          problem_number: String(problem.problem_number ?? ""),
          subject: problem.subject,
          unit: problem.unit ?? "",
          level: problem.level ?? "",
          original_ref: problem.original_ref ?? "",
          ebs_original_code: problem.ebs_original_code ?? "",
          internal_code: problem.internal_code ?? "",
          question_type: String(problem.question_type),
          question_latex: problem.question_latex,
          choices_json: problem.choices_json ? JSON.stringify(problem.choices_json, null, 2) : "",
          answer_json: JSON.stringify(problem.answer_json, null, 2),
          solution_latex: problem.solution_latex ?? "",
          difficulty: String(problem.difficulty ?? ""),
          variant_strength: String(problem.variant_strength ?? ""),
          tags: problem.tags?.join(", ") ?? "",
          has_graph: problem.has_graph,
          graph_json: problem.graph_json ? JSON.stringify(problem.graph_json, null, 2) : "",
          layout_json: problem.layout_json ? JSON.stringify(problem.layout_json, null, 2) : "",
          visibility: problem.visibility,
          price_dak: String(problem.price_dak ?? 0),
        });
        setMessage("문항을 불러왔습니다.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "문항을 불러오지 못했습니다."));
  }, [editId]);

  const setValue = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const autoCode = async () => {
    try {
      const data = await adminFetch<{ problem_code: string }>("/api/admin/problem-bank/code", {
        method: "POST",
        body: JSON.stringify({
          codeSystem: form.code_system,
          examYear: Number(form.exam_year),
          examMonth: Number(form.exam_month),
          problemNumber: Number(form.problem_number),
          variantCode: form.variant_code,
          ebsOriginalCode: form.ebs_original_code,
        }),
      });
      const base = form.code_system === "ebs" ? form.ebs_original_code : stripVariantCode(data.problem_code);
      setForm((current) => ({
        ...current,
        problem_code: data.problem_code,
        base_problem_code: current.base_problem_code || base,
      }));
      setMessage("문항 코드를 생성했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문항 코드를 생성하지 못했습니다.");
    }
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        exam_year: form.exam_year ? Number(form.exam_year) : null,
        exam_month: form.exam_month ? Number(form.exam_month) : null,
        problem_number: form.problem_number ? Number(form.problem_number) : null,
        difficulty: form.difficulty ? Number(form.difficulty) : null,
        variant_strength: form.variant_strength ? Number(form.variant_strength) : null,
        price_dak: Number(form.price_dak || 0),
        choices_json: toJsonOrString(form.choices_json),
        answer_json: toJsonOrString(form.answer_json),
        graph_json: toJsonOrString(form.graph_json),
        layout_json: toJsonOrString(form.layout_json),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      await adminFetch(editId ? `/api/admin/problem-bank/${editId}` : "/api/admin/problem-bank", {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage("저장했습니다.");
      router.push("/admin/problem-bank");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    }
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{editId ? "문항 수정" : "문항 개별 등록"}</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
        </div>
        <Link className="suddak-btn suddak-btn-ghost" href="/admin/problem-bank">목록</Link>
      </header>

      <SectionCard title="원본문항 정보 / 코드">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <select className="suddak-input" value={form.code_system} onChange={(e) => setValue("code_system", e.target.value)}>
            <option value="kice">kice</option>
            <option value="school_exam">school_exam</option>
            <option value="ebs">ebs</option>
            <option value="internal">internal</option>
          </select>
          <input className="suddak-input" placeholder="exam_year" value={form.exam_year} onChange={(e) => setValue("exam_year", e.target.value)} />
          <input className="suddak-input" placeholder="exam_month" value={form.exam_month} onChange={(e) => setValue("exam_month", e.target.value)} />
          <input className="suddak-input" placeholder="problem_number" value={form.problem_number} onChange={(e) => setValue("problem_number", e.target.value)} />
          <input className="suddak-input" placeholder="variant_code" value={form.variant_code} onChange={(e) => setValue("variant_code", e.target.value)} />
          <input className="suddak-input" placeholder="ebs_original_code" value={form.ebs_original_code} onChange={(e) => setValue("ebs_original_code", e.target.value)} />
          <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void autoCode()}>코드 자동 생성</button>
          <input className="suddak-input" placeholder="problem_code" value={form.problem_code} onChange={(e) => setValue("problem_code", e.target.value)} />
          <input className="suddak-input" placeholder="base_problem_code" value={form.base_problem_code} onChange={(e) => setValue("base_problem_code", e.target.value)} />
          <select className="suddak-input" value={form.source_type} onChange={(e) => setValue("source_type", e.target.value)}>
            <option value="suneung">suneung</option>
            <option value="mock">mock</option>
            <option value="school_exam">school_exam</option>
            <option value="ebs_special">ebs_special</option>
            <option value="ebs_complete">ebs_complete</option>
          </select>
          <input className="suddak-input" placeholder="source" value={form.source} onChange={(e) => setValue("source", e.target.value)} />
          <input className="suddak-input" placeholder="subject" value={form.subject} onChange={(e) => setValue("subject", e.target.value)} />
          <input className="suddak-input" placeholder="unit" value={form.unit} onChange={(e) => setValue("unit", e.target.value)} />
          <input className="suddak-input" placeholder="level" value={form.level} onChange={(e) => setValue("level", e.target.value)} />
          <input className="suddak-input" placeholder="original_ref" value={form.original_ref} onChange={(e) => setValue("original_ref", e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="문항 내용">
        <div style={{ display: "grid", gap: 10 }}>
          <select className="suddak-input" value={form.question_type} onChange={(e) => setValue("question_type", e.target.value)}>
            <option value="multiple_choice">multiple_choice</option>
            <option value="short_answer">short_answer</option>
            <option value="descriptive">descriptive</option>
            <option value="mixed">mixed</option>
          </select>
          <textarea className="suddak-input" rows={8} placeholder="question_latex" value={form.question_latex} onChange={(e) => setValue("question_latex", e.target.value)} />
          <textarea className="suddak-input" rows={5} placeholder='choices_json 예: ["...", "..."]' value={form.choices_json} onChange={(e) => setValue("choices_json", e.target.value)} />
          <textarea className="suddak-input" rows={4} placeholder='answer_json 예: {"answer":3}' value={form.answer_json} onChange={(e) => setValue("answer_json", e.target.value)} />
          <textarea className="suddak-input" rows={6} placeholder="solution_latex" value={form.solution_latex} onChange={(e) => setValue("solution_latex", e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="메타 / 그래프">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input className="suddak-input" placeholder="difficulty 1~10" value={form.difficulty} onChange={(e) => setValue("difficulty", e.target.value)} />
          <input className="suddak-input" placeholder="variant_strength" value={form.variant_strength} onChange={(e) => setValue("variant_strength", e.target.value)} />
          <input className="suddak-input" placeholder="tags" value={form.tags} onChange={(e) => setValue("tags", e.target.value)} />
          <select className="suddak-input" value={form.visibility} onChange={(e) => setValue("visibility", e.target.value)}>
            <option value="private">private</option>
            <option value="public">public</option>
          </select>
          <label className="suddak-card-soft" style={{ padding: 10 }}>
            <input type="checkbox" checked={form.has_graph} onChange={(e) => setValue("has_graph", e.target.checked)} /> 그래프 있음
          </label>
        </div>
        <textarea className="suddak-input" rows={5} placeholder="graph_json" value={form.graph_json} onChange={(e) => setValue("graph_json", e.target.value)} style={{ marginTop: 10 }} />
        <textarea className="suddak-input" rows={4} placeholder="layout_json" value={form.layout_json} onChange={(e) => setValue("layout_json", e.target.value)} style={{ marginTop: 10 }} />
        <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void save()} style={{ marginTop: 12 }}>저장</button>
      </SectionCard>
    </PageContainer>
  );
}

export default function ProblemNewPage() {
  return (
    <Suspense
      fallback={
        <PageContainer topPadding={24} bottomPadding={56}>
          <SectionCard title="문항 등록">불러오는 중입니다.</SectionCard>
        </PageContainer>
      }
    >
      <ProblemNewForm />
    </Suspense>
  );
}
