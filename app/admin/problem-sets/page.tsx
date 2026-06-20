"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, formatDate } from "@/lib/problem-bank/admin-client";
import type { ProblemSetRow } from "@/lib/problem-bank/types";

type SetsResponse = {
  sets: ProblemSetRow[];
};

const emptySet = {
  title: "",
  description: "",
  source: "수능특강",
  source_type: "ebs_special",
  subject: "미적분",
  year: "",
  unit: "",
  problem_count_text: "",
  price_dak: "0",
  visibility: "private",
};

export default function ProblemSetsPage() {
  const [sets, setSets] = useState<ProblemSetRow[]>([]);
  const [form, setForm] = useState(emptySet);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("세트 목록을 불러오는 중입니다.");

  const load = async () => {
    const data = await adminFetch<SetsResponse>("/api/admin/problem-sets");
    setSets(data.sets);
    setMessage(`${data.sets.length}개 세트`);
  };

  useEffect(() => {
    let alive = true;
    adminFetch<SetsResponse>("/api/admin/problem-sets")
      .then((data) => {
        if (!alive) return;
        setSets(data.sets);
        setMessage(`${data.sets.length}개 세트`);
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "세트를 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const setValue = (key: keyof typeof emptySet, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const edit = (set: ProblemSetRow) => {
    setEditingId(set.id);
    setForm({
      title: set.title,
      description: set.description ?? "",
      source: set.source,
      source_type: set.source_type,
      subject: set.subject,
      year: String(set.year ?? ""),
      unit: set.unit ?? "",
      problem_count_text: set.problem_count_text ?? "",
      price_dak: String(set.price_dak ?? 0),
      visibility: set.visibility,
    });
  };

  const save = async () => {
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : null, price_dak: Number(form.price_dak || 0) };
      await adminFetch(editingId ? `/api/admin/problem-sets/${editingId}` : "/api/admin/problem-sets", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setForm(emptySet);
      setEditingId(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("세트를 삭제할까요? 포함 문항 연결도 함께 삭제됩니다.")) return;
    await adminFetch(`/api/admin/problem-sets/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>수특/수완 세트 관리</h1>
        <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
      </header>

      <SectionCard title={editingId ? "세트 수정" : "세트 생성"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input className="suddak-input" placeholder="title" value={form.title} onChange={(e) => setValue("title", e.target.value)} />
          <input className="suddak-input" placeholder="source" value={form.source} onChange={(e) => setValue("source", e.target.value)} />
          <select className="suddak-input" value={form.source_type} onChange={(e) => setValue("source_type", e.target.value)}>
            <option value="ebs_special">ebs_special</option>
            <option value="ebs_complete">ebs_complete</option>
            <option value="mock">mock</option>
            <option value="suneung">suneung</option>
            <option value="school_exam">school_exam</option>
          </select>
          <input className="suddak-input" placeholder="subject" value={form.subject} onChange={(e) => setValue("subject", e.target.value)} />
          <input className="suddak-input" placeholder="year" value={form.year} onChange={(e) => setValue("year", e.target.value)} />
          <input className="suddak-input" placeholder="unit" value={form.unit} onChange={(e) => setValue("unit", e.target.value)} />
          <input className="suddak-input" placeholder="problem_count_text" value={form.problem_count_text} onChange={(e) => setValue("problem_count_text", e.target.value)} />
          <input className="suddak-input" placeholder="price_dak" value={form.price_dak} onChange={(e) => setValue("price_dak", e.target.value)} />
          <select className="suddak-input" value={form.visibility} onChange={(e) => setValue("visibility", e.target.value)}>
            <option value="private">private</option>
            <option value="public">public</option>
          </select>
        </div>
        <textarea className="suddak-input" rows={3} placeholder="description" value={form.description} onChange={(e) => setValue("description", e.target.value)} style={{ marginTop: 10 }} />
        <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void save()} style={{ marginTop: 12 }}>저장</button>
      </SectionCard>

      <SectionCard title="세트 목록">
        <div style={{ display: "grid", gap: 10 }}>
          {sets.map((set) => (
            <article key={set.id} className="suddak-card-soft" style={{ padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{set.title}</strong>
                <span className="suddak-badge">{set.visibility}</span>
              </div>
              <div style={{ color: "var(--muted)", fontWeight: 700 }}>{set.source} / {set.subject} / {set.unit ?? "-"} / {set.price_dak}dak / {formatDate(set.created_at)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="suddak-btn suddak-btn-primary" href={`/admin/problem-sets/${set.id}`}>상세 관리</Link>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => edit(set)}>수정</button>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void remove(set.id)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
