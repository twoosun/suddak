"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileUp, RefreshCw, Upload } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, formatDate } from "@/lib/problem-bank/admin-client";
import type { NaesinddakMaterialAdminRow } from "@/lib/naesin/admin";
import type { NaesinddakFileKey } from "@/lib/naesin/data";

type MaterialsResponse = {
  materials: NaesinddakMaterialAdminRow[];
};

type MaterialResponse = {
  material: NaesinddakMaterialAdminRow;
};

const fileSlots: Array<{ key: NaesinddakFileKey; label: string; accept: string }> = [
  { key: "problemPdf", label: "문제지 PDF", accept: ".pdf,application/pdf" },
  {
    key: "problemDocx",
    label: "문제지 DOCX",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { key: "solutionPdf", label: "해설지 PDF", accept: ".pdf,application/pdf" },
  {
    key: "solutionDocx",
    label: "해설지 DOCX",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { key: "combinedPdf", label: "통합 PDF", accept: ".pdf,application/pdf" },
];

const subjectDetails = ["공통수학", "수학 I", "수학 II", "미적분", "확률과 통계", "기하"];

const emptyForm = {
  id: "",
  title: "",
  description: "",
  detail_description: "",
  subject: "수학",
  subject_detail: "미적분",
  unit: "",
  category: "수특수완 변형문제",
  problem_count_label: "",
  set_count_label: "1세트",
  estimated_minutes_label: "50분",
  status: "private",
  price_ddak: "0",
  tags: "",
  included_topics: "",
  source_basis: "수능특강, 수능완성",
  featured: false,
};

function arrayToText(value: string[] | null | undefined) {
  return value?.join(", ") ?? "";
}

function fileNameFromPath(path: string | undefined) {
  if (!path) return "업로드 전";
  return path.split("/").pop() ?? path;
}

function uploadedFileCount(material: NaesinddakMaterialAdminRow | null | undefined) {
  return Object.values(material?.file_paths ?? {}).filter(Boolean).length;
}

function materialToForm(material: NaesinddakMaterialAdminRow) {
  return {
    id: material.id,
    title: material.title,
    description: material.description,
    detail_description: material.detail_description ?? "",
    subject: material.subject,
    subject_detail: material.subject_detail,
    unit: material.unit,
    category: material.category,
    problem_count_label: material.problem_count_label,
    set_count_label: material.set_count_label,
    estimated_minutes_label: material.estimated_minutes_label,
    status: material.status,
    price_ddak: String(material.price_ddak ?? 0),
    tags: arrayToText(material.tags),
    included_topics: arrayToText(material.included_topics),
    source_basis: arrayToText(material.source_basis),
    featured: Boolean(material.featured),
  };
}

export default function NaesinddakMaterialsAdminPage() {
  const [materials, setMaterials] = useState<NaesinddakMaterialAdminRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("내신딱딱 자료 목록을 불러오는 중입니다.");
  const [busy, setBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const editingMaterial = useMemo(
    () => materials.find((material) => material.id === editingId) ?? null,
    [editingId, materials]
  );

  const load = async () => {
    const data = await adminFetch<MaterialsResponse>("/api/admin/naesinddak-materials");
    setMaterials(data.materials);
    setMessage(`${data.materials.length}개 자료를 불러왔습니다.`);
  };

  useEffect(() => {
    let alive = true;

    adminFetch<MaterialsResponse>("/api/admin/naesinddak-materials")
      .then((data) => {
        if (!alive) return;
        setMaterials(data.materials);
        setMessage(`${data.materials.length}개 자료를 불러왔습니다.`);
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "자료 목록을 불러오지 못했습니다.");
      });

    return () => {
      alive = false;
    };
  }, []);

  const setValue = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const save = async (nextForm = form) => {
    try {
      setBusy(true);
      setMessage("자료를 저장하는 중입니다.");

      const payload = {
        ...nextForm,
        price_ddak: Number(nextForm.price_ddak || 0),
      };

      const data = await adminFetch<MaterialResponse>(
        editingId ? `/api/admin/naesinddak-materials/${editingId}` : "/api/admin/naesinddak-materials",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setEditingId(data.material.id);
      setForm(materialToForm(data.material));
      await load();
      setMessage(
        data.material.status === "public"
          ? "자료를 최종 공개했습니다."
          : "자료를 저장했습니다. 필요한 파일만 업로드한 뒤 public으로 바꾸면 최종 공개됩니다."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "자료를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const edit = (material: NaesinddakMaterialAdminRow) => {
    setEditingId(material.id);
    setForm(materialToForm(material));
    setMessage(`${material.title} 수정 중입니다.`);
  };

  const remove = async (material: NaesinddakMaterialAdminRow) => {
    if (!confirm(`${material.title} 자료를 삭제할까요? 구매 기록도 함께 정리됩니다.`)) {
      return;
    }

    try {
      setBusy(true);
      await adminFetch(`/api/admin/naesinddak-materials/${material.id}`, { method: "DELETE" });
      resetForm();
      await load();
      setMessage("자료를 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "자료를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (fileKey: NaesinddakFileKey, file: File | null | undefined) => {
    if (!editingId) {
      setMessage("먼저 자료 정보를 저장한 뒤 파일을 업로드해 주세요.");
      return;
    }

    if (!file) return;

    try {
      setUploadingKey(fileKey);
      setMessage(`${file.name} 업로드 중입니다.`);

      const formData = new FormData();
      formData.append("fileKey", fileKey);
      formData.append("file", file);

      const data = await adminFetch<MaterialResponse>(
        `/api/admin/naesinddak-materials/${editingId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      setForm(materialToForm(data.material));
      await load();
      setMessage(`${file.name} 업로드가 완료되었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <div className="naesin-page">
        <header className="suddak-card exam-builder-header">
          <div>
            <span className="exam-builder-eyebrow">관리자 전용</span>
            <h1>내신딱딱 자료 업로드</h1>
            <p>수특수완 변형문제 자료 정보를 만들고 PDF/DOCX 파일을 직접 업로드합니다.</p>
          </div>
          <div className="naesin-header-actions">
            <Link href="/naesin" className="suddak-btn suddak-btn-ghost">
              <ArrowLeft size={16} />
              내신딱딱
            </Link>
            <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void load()}>
              <RefreshCw size={16} />
              새로고침
            </button>
          </div>
        </header>

        <div className="suddak-card-soft" style={{ padding: 14, color: "var(--muted)", fontWeight: 800 }}>
          {message}
        </div>

        <SectionCard
          title={editingId ? "자료 수정" : "새 자료 만들기"}
          description="모든 파일을 올릴 필요는 없습니다. 자료를 저장한 뒤 PDF 또는 DOCX 파일을 최소 1개만 업로드해도 public으로 최종 공개할 수 있습니다."
          rightSlot={
            <button type="button" className="suddak-btn suddak-btn-ghost" onClick={resetForm}>
              새 자료
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            <input className="suddak-input" placeholder="자료 ID 비워두면 제목으로 자동 생성" value={form.id} onChange={(e) => setValue("id", e.target.value)} disabled={Boolean(editingId)} />
            <input className="suddak-input" placeholder="제목" value={form.title} onChange={(e) => setValue("title", e.target.value)} />
            <input className="suddak-input" placeholder="과목명" value={form.subject} onChange={(e) => setValue("subject", e.target.value)} />
            <select className="suddak-input" value={form.subject_detail} onChange={(e) => setValue("subject_detail", e.target.value)}>
              {subjectDetails.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <input className="suddak-input" placeholder="단원" value={form.unit} onChange={(e) => setValue("unit", e.target.value)} />
            <input className="suddak-input" placeholder="카테고리" value={form.category} onChange={(e) => setValue("category", e.target.value)} />
            <input className="suddak-input" placeholder="문항 수 표시 예: 32문항" value={form.problem_count_label} onChange={(e) => setValue("problem_count_label", e.target.value)} />
            <input className="suddak-input" placeholder="세트 수 표시 예: 1세트" value={form.set_count_label} onChange={(e) => setValue("set_count_label", e.target.value)} />
            <input className="suddak-input" placeholder="예상 시간 예: 50분" value={form.estimated_minutes_label} onChange={(e) => setValue("estimated_minutes_label", e.target.value)} />
            <label className="suddak-card-soft" style={{ padding: 10, display: "grid", gap: 6 }}>
              <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 900 }}>
                잠금해제 비용(딱)
              </span>
              <input
                className="suddak-input"
                type="number"
                min="0"
                step="1"
                placeholder="예: 1000"
                value={form.price_ddak}
                onChange={(e) => setValue("price_ddak", e.target.value)}
              />
            </label>
            <select className="suddak-input" value={form.status} onChange={(e) => setValue("status", e.target.value)}>
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
            <label className="suddak-card-soft" style={{ padding: 10, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 850 }}>
              <input type="checkbox" checked={form.featured} onChange={(e) => setValue("featured", e.target.checked)} />
              추천 자료
            </label>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <textarea className="suddak-input" rows={3} placeholder="짧은 설명" value={form.description} onChange={(e) => setValue("description", e.target.value)} />
            <textarea className="suddak-input" rows={4} placeholder="상세 설명" value={form.detail_description} onChange={(e) => setValue("detail_description", e.target.value)} />
            <input className="suddak-input" placeholder="태그, 쉼표로 구분" value={form.tags} onChange={(e) => setValue("tags", e.target.value)} />
            <input className="suddak-input" placeholder="포함 주제, 쉼표로 구분" value={form.included_topics} onChange={(e) => setValue("included_topics", e.target.value)} />
            <input className="suddak-input" placeholder="출처/근거, 쉼표로 구분" value={form.source_basis} onChange={(e) => setValue("source_basis", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void save()} disabled={busy}>
              {form.status === "public" ? "최종 공개 저장" : "임시 저장"}
            </button>
            {editingId && form.status !== "public" && uploadedFileCount(editingMaterial) > 0 && (
              <button
                type="button"
                className="suddak-btn suddak-btn-primary"
                onClick={() => {
                  const nextForm = { ...form, status: "public" };
                  setForm(nextForm);
                  void save(nextForm);
                }}
                disabled={busy}
              >
                부분 업로드로 최종 공개
              </button>
            )}
            {editingId && (
              <Link href={`/naesin/${editingId}`} className="suddak-btn suddak-btn-ghost">
                상세 페이지 보기
              </Link>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="파일 업로드"
          description={
            editingId
              ? `현재 ${uploadedFileCount(editingMaterial)}개 파일이 업로드되어 있습니다. 필요한 슬롯만 채워도 최종 공개할 수 있습니다.`
              : "자료를 먼저 임시 저장하면 파일 업로드가 열립니다."
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {fileSlots.map((slot) => {
              const currentPath = editingMaterial?.file_paths?.[slot.key];

              return (
                <label key={slot.key} className="suddak-card-soft" style={{ padding: 12, display: "grid", gap: 8 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 950 }}>
                    <FileUp size={16} />
                    {slot.label}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                    {fileNameFromPath(currentPath)}
                  </span>
                  <span className="suddak-btn suddak-btn-ghost" style={{ width: "100%" }}>
                    <Upload size={16} />
                    {uploadingKey === slot.key ? "업로드 중" : "파일 선택"}
                  </span>
                  <input
                    type="file"
                    accept={slot.accept}
                    disabled={!editingId || Boolean(uploadingKey)}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.currentTarget.value = "";
                      void uploadFile(slot.key, file);
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="자료 목록">
          <div style={{ display: "grid", gap: 10 }}>
            {materials.map((material) => (
              <article key={material.id} className="suddak-card-soft" style={{ padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{material.title}</strong>
                  <span className="suddak-badge">{material.status}</span>
                </div>
                <div style={{ color: "var(--muted)", fontWeight: 800, lineHeight: 1.6 }}>
                  {material.subject_detail} / {material.unit} / {material.price_ddak.toLocaleString("ko-KR")}ddak / {formatDate(material.updated_at)}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13, overflowWrap: "anywhere" }}>
                  {fileSlots
                    .filter((slot) => material.file_paths?.[slot.key])
                    .map((slot) => `${slot.label}: ${material.file_paths?.[slot.key]}`)
                    .join(" | ") || "업로드된 파일 없음"}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => edit(material)}>
                    수정/업로드
                  </button>
                  <Link href={`/naesin/${material.id}`} className="suddak-btn suddak-btn-ghost">
                    보기
                  </Link>
                  <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void remove(material)} disabled={busy}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
