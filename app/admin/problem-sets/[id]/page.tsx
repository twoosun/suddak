"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch, openAdminStorageFile } from "@/lib/problem-bank/admin-client";
import type { ProblemRow, ProblemSetRow } from "@/lib/problem-bank/types";

type SetItem = {
  id: string;
  order_index: number;
  problem_id: string;
  problems: ProblemRow | null;
};

type SetDetail = ProblemSetRow & {
  problem_set_items?: SetItem[];
};

type SetResponse = {
  set: SetDetail;
};

type ProblemListResponse = {
  problems: ProblemRow[];
};

const fileCards = [
  { role: "problem_pdf_url", label: "문제 PDF", bucket: "problem-set-files", accept: "application/pdf" },
  { role: "solution_pdf_url", label: "해설 PDF", bucket: "problem-set-files", accept: "application/pdf" },
  { role: "docx_url", label: "DOCX", bucket: "problem-set-files", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { role: "thumbnail_url", label: "썸네일", bucket: "thumbnails", accept: "image/png,image/jpeg,image/webp" },
] as const;

export default function ProblemSetDetailPage() {
  const params = useParams<{ id: string }>();
  const setId = params.id;
  const [set, setSet] = useState<SetDetail | null>(null);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("세트를 불러오는 중입니다.");

  const load = async () => {
    const data = await adminFetch<SetResponse>(`/api/admin/problem-sets/${setId}`);
    const items = [...(data.set.problem_set_items ?? [])].sort((a, b) => a.order_index - b.order_index);
    setSet({ ...data.set, problem_set_items: items });
    setMessage("세트 정보를 불러왔습니다.");
  };

  useEffect(() => {
    let alive = true;
    adminFetch<SetResponse>(`/api/admin/problem-sets/${setId}`)
      .then((data) => {
        if (!alive) return;
        const items = [...(data.set.problem_set_items ?? [])].sort((a, b) => a.order_index - b.order_index);
        setSet({ ...data.set, problem_set_items: items });
        setMessage("세트 정보를 불러왔습니다.");
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "세트를 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [setId]);

  const searchProblems = async () => {
    const search = new URLSearchParams();
    if (query.trim()) search.set("problem_code", query.trim());
    const data = await adminFetch<ProblemListResponse>(`/api/admin/problem-bank?${search.toString()}`);
    setProblems(data.problems);
  };

  const add = async (problemId: string) => {
    await adminFetch(`/api/admin/problem-sets/${setId}/items`, {
      method: "POST",
      body: JSON.stringify({ problem_id: problemId }),
    });
    await load();
  };

  const remove = async (itemId: string) => {
    await adminFetch(`/api/admin/problem-sets/${setId}/items/${itemId}`, { method: "DELETE" });
    await load();
  };

  const move = async (itemId: string, direction: -1 | 1) => {
    if (!set?.problem_set_items) return;
    const items = [...set.problem_set_items];
    const index = items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    await adminFetch(`/api/admin/problem-sets/${setId}/items`, {
      method: "PATCH",
      body: JSON.stringify({ items: items.map((item, order_index) => ({ id: item.id, order_index })) }),
    });
    await load();
  };

  const upload = async (role: string, file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("role", role);
    formData.append("file", file);
    await adminFetch(`/api/admin/problem-sets/${setId}/upload`, { method: "POST", body: formData });
    await load();
  };

  const openFile = async (bucket: string, path: string | null | undefined) => {
    try {
      await openAdminStorageFile(bucket, path);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 열지 못했습니다.");
    }
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{set?.title ?? "세트 상세 관리"}</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
        </div>
        <Link className="suddak-btn suddak-btn-ghost" href="/admin/problem-sets">세트 목록</Link>
      </header>

      <SectionCard title="파일 교체 / 미리보기">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {fileCards.map(({ role, label, bucket, accept }) => (
            <div key={role} className="suddak-card-soft" style={{ padding: 12, display: "grid", gap: 8 }}>
              <strong>{label}</strong>
              <span style={{ color: "var(--muted)", wordBreak: "break-all" }}>
                {set?.[role] ? String(set[role]) : "업로드된 파일 없음"}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void openFile(bucket, set?.[role])} disabled={!set?.[role]}>
                  미리보기 / 다운로드
                </button>
                <label className="suddak-btn suddak-btn-primary" style={{ cursor: "pointer" }}>
                  파일 업로드
                  <input type="file" accept={accept} onChange={(e) => void upload(role, e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 460px)", gap: 14, marginTop: 14 }}>
        <SectionCard title="포함 문항">
          <div style={{ display: "grid", gap: 8 }}>
            {(set?.problem_set_items ?? []).map((item, index) => (
              <div key={item.id} className="suddak-card-soft" style={{ padding: 10, display: "grid", gap: 6 }}>
                <strong>{index + 1}. {item.problems?.problem_code ?? item.problem_id}</strong>
                <span>{item.problems?.subject ?? "-"} / {item.problems?.unit ?? "-"} / 난이도 {item.problems?.difficulty ?? "-"}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void move(item.id, -1)}>위</button>
                  <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void move(item.id, 1)}>아래</button>
                  <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void remove(item.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="문제은행 검색 후 추가">
          <div style={{ display: "flex", gap: 8 }}>
            <input className="suddak-input" placeholder="problem_code 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void searchProblems()}>검색</button>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {problems.map((problem) => (
              <div key={problem.id} className="suddak-card-soft" style={{ padding: 10 }}>
                <strong>{problem.problem_code}</strong>
                <div style={{ color: "var(--muted)", fontWeight: 700 }}>{problem.source} / {problem.subject} / {problem.unit ?? "-"}</div>
                <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void add(problem.id)} style={{ marginTop: 8 }}>세트에 추가</button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
