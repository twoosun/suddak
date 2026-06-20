"use client";

import { useEffect, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, toJsonOrString } from "@/lib/problem-bank/admin-client";
import type { ExamTemplateRow } from "@/lib/problem-bank/types";

type TemplatesResponse = {
  templates: ExamTemplateRow[];
};

const songdoDefaults = {
  school_name: "송도고",
  template_name: "송도고 지필평가지 기본형",
  subject: "수학",
  layout_type: "songdo_two_column",
  page_size: "A4",
  column_count: "2",
  margin_json: JSON.stringify({ top: 18, right: 14, bottom: 16, left: 14 }, null, 2),
  header_json: JSON.stringify({ enabled: true, title: "지필평가지", showSchoolName: true }, null, 2),
  footer_json: JSON.stringify({ enabled: true, pageNumber: true }, null, 2),
  font_json: JSON.stringify({ family: "Noto Serif KR", bodySize: 10, questionSize: 10 }, null, 2),
  divider_json: JSON.stringify({ enabled: true, orientation: "vertical", width: 0.5 }, null, 2),
  problem_box_json: JSON.stringify({ gap: 8, autoFit: true, allowGraph: true }, null, 2),
};

export default function ExamTemplatesPage() {
  const [templates, setTemplates] = useState<ExamTemplateRow[]>([]);
  const [form, setForm] = useState(songdoDefaults);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("템플릿을 불러오는 중입니다.");

  const load = async () => {
    const data = await adminFetch<TemplatesResponse>("/api/admin/exam-templates");
    setTemplates(data.templates);
    setMessage(`${data.templates.length}개 템플릿`);
  };

  useEffect(() => {
    let alive = true;
    adminFetch<TemplatesResponse>("/api/admin/exam-templates")
      .then((data) => {
        if (!alive) return;
        setTemplates(data.templates);
        setMessage(`${data.templates.length}개 템플릿`);
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "템플릿을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const setValue = (key: keyof typeof songdoDefaults, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const edit = (template: ExamTemplateRow) => {
    setEditingId(template.id);
    setForm({
      school_name: template.school_name,
      template_name: template.template_name,
      subject: template.subject ?? "",
      layout_type: template.layout_type ?? "",
      page_size: template.page_size,
      column_count: String(template.column_count),
      margin_json: template.margin_json ? JSON.stringify(template.margin_json, null, 2) : "",
      header_json: template.header_json ? JSON.stringify(template.header_json, null, 2) : "",
      footer_json: template.footer_json ? JSON.stringify(template.footer_json, null, 2) : "",
      font_json: template.font_json ? JSON.stringify(template.font_json, null, 2) : "",
      divider_json: template.divider_json ? JSON.stringify(template.divider_json, null, 2) : "",
      problem_box_json: template.problem_box_json ? JSON.stringify(template.problem_box_json, null, 2) : "",
    });
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        column_count: Number(form.column_count || 2),
        margin_json: toJsonOrString(form.margin_json),
        header_json: toJsonOrString(form.header_json),
        footer_json: toJsonOrString(form.footer_json),
        font_json: toJsonOrString(form.font_json),
        divider_json: toJsonOrString(form.divider_json),
        problem_box_json: toJsonOrString(form.problem_box_json),
      };
      await adminFetch(editingId ? `/api/admin/exam-templates/${editingId}` : "/api/admin/exam-templates", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setEditingId(null);
      setForm(songdoDefaults);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "템플릿을 저장하지 못했습니다.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("템플릿을 삭제할까요?")) return;
    await adminFetch(`/api/admin/exam-templates/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>학교별 시험지 템플릿</h1>
        <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
      </header>

      <SectionCard title={editingId ? "템플릿 수정" : "송도고형 템플릿 생성"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input className="suddak-input" placeholder="school_name" value={form.school_name} onChange={(e) => setValue("school_name", e.target.value)} />
          <input className="suddak-input" placeholder="template_name" value={form.template_name} onChange={(e) => setValue("template_name", e.target.value)} />
          <input className="suddak-input" placeholder="subject" value={form.subject} onChange={(e) => setValue("subject", e.target.value)} />
          <input className="suddak-input" placeholder="layout_type" value={form.layout_type} onChange={(e) => setValue("layout_type", e.target.value)} />
          <input className="suddak-input" placeholder="page_size" value={form.page_size} onChange={(e) => setValue("page_size", e.target.value)} />
          <input className="suddak-input" placeholder="column_count" value={form.column_count} onChange={(e) => setValue("column_count", e.target.value)} />
        </div>
        {(["margin_json", "header_json", "footer_json", "font_json", "divider_json", "problem_box_json"] as const).map((key) => (
          <textarea key={key} className="suddak-input" rows={4} placeholder={key} value={form[key]} onChange={(e) => setValue(key, e.target.value)} style={{ marginTop: 10, fontFamily: "monospace" }} />
        ))}
        <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void save()} style={{ marginTop: 12 }}>저장</button>
      </SectionCard>

      <SectionCard title="템플릿 목록">
        <div style={{ display: "grid", gap: 10 }}>
          {templates.map((template) => (
            <article key={template.id} className="suddak-card-soft" style={{ padding: 12 }}>
              <strong>{template.school_name} / {template.template_name}</strong>
              <div style={{ color: "var(--muted)", fontWeight: 700 }}>{template.subject ?? "-"} / {template.page_size} / {template.column_count}단 / {template.layout_type ?? "-"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => edit(template)}>수정</button>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void remove(template.id)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
