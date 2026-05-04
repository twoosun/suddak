"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, CopyPlus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { supabase } from "@/lib/supabase";
import type { TrainingItem, TrainingSetWithItems } from "@/lib/training/types";

function listText(values: string[] | null | undefined) {
  return values?.length ? values.join(", ") : "-";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 900, marginBottom: "5px" }}>{label}</div>
      <div style={{ lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{children || "-"}</div>
    </div>
  );
}

export default function TrainingDetailPage() {
  const params = useParams<{ id: string }>();
  const [set, setSet] = useState<TrainingSetWithItems | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [message, setMessage] = useState("불러오는 중입니다.");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const items = useMemo(() => set?.training_items ?? [], [set]);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    const res = await fetch(`/api/training/sets/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "분석 상세를 불러오지 못했습니다.");
    setSet(data.set as TrainingSetWithItems);
    setViewerIsAdmin(Boolean(data.viewerIsAdmin));
    setMessage("");
  }, [params.id]);

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "분석 상세를 불러오지 못했습니다."));
  }, [load]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const createSeed = async (item: TrainingItem) => {
    setBusyItemId(item.id);
    setMessage("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/training/items/${item.id}/create-seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "문풀 보조 데이터를 저장하지 못했습니다.");
      setMessage(item.review_status === "approved" ? "검수된 seed가 저장되었습니다." : "검수 전 seed가 비공개 상태로 저장되었습니다.");
      return data.seed as { id: string; use_for_generation: boolean };
    } finally {
      setBusyItemId(null);
    }
  };

  const generateSimilar = async (item: TrainingItem) => {
    try {
      const seed = await createSeed(item);
      if (!seed.use_for_generation) {
        setMessage("관리자 승인 전에는 유사문제 생성에 공개 활용되지 않습니다.");
        return;
      }

      const token = await getToken();
      const res = await fetch("/api/similar/generate-from-seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seedId: seed.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "유사문제를 생성하지 못했습니다.");

      sessionStorage.setItem("suddak_seed_similar_result", JSON.stringify(data.result));
      setMessage("유사문제를 생성했습니다. 결과는 현재 탭의 임시 저장소에 보관되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    }
  };

  const reviewItem = async (item: TrainingItem, reviewStatus: "approved" | "rejected" | "needs_edit") => {
    setBusyItemId(item.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/training-review/items/${item.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ review_status: reviewStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "검수 상태를 저장하지 못했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검수 상태를 저장하지 못했습니다.");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <PageContainer topPadding={28} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 950 }}>{set?.title || "분석 상세"}</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>{set?.subject || ""}</p>
        </div>
        <Link href="/training/history" className="suddak-btn suddak-btn-ghost">
          기록 목록
        </Link>
      </header>

      {message ? <div className="suddak-card-soft" style={{ padding: "14px", marginBottom: "16px", lineHeight: 1.7 }}>{message}</div> : null}

      {set ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
            {[
              ["상태", set.status],
              ["감지 문항", set.detected_problem_count],
              ["매칭 문항", set.matched_problem_count],
              ["분석 완료", set.analyzed_item_count],
              ["승인 문항", set.approved_problem_count],
            ].map(([label, value]) => (
              <div key={label} className="suddak-card" style={{ padding: "14px" }}>
                <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>{label}</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 950, marginTop: "5px" }}>{value}</div>
              </div>
            ))}
          </section>

          <SectionCard title="문항별 분석 결과">
            <div style={{ display: "grid", gap: "14px" }}>
              {items.map((item) => (
                <article key={item.id} className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "1.1rem" }}>문항 {item.problem_number || "-"}</strong>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span className="suddak-badge">{item.review_status}</span>
                      <span className="suddak-badge">신뢰도 {Number(item.confidence ?? 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
                    <Field label="과목">{item.subject}</Field>
                    <Field label="단원">{item.unit}</Field>
                    <Field label="난이도">{item.difficulty ?? "-"}</Field>
                    <Field label="정답">{item.answer}</Field>
                    <Field label="핵심 개념">{listText(item.core_concepts)}</Field>
                    <Field label="핵심 아이디어">{item.key_idea}</Field>
                    <Field label="풀이 전략">{item.solution_strategy}</Field>
                    <Field label="함정 포인트">{item.trap_point}</Field>
                    <Field label="흔한 오답 원인">{item.common_mistake}</Field>
                    <Field label="변형 가능 포인트">{listText(item.variation_points)}</Field>
                    <Field label="유사문제 생성 씨앗">{item.similar_problem_seed}</Field>
                    <Field label="문풀 힌트">{item.solver_hint}</Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    <button type="button" className="suddak-btn suddak-btn-primary" disabled={busyItemId === item.id} onClick={() => void generateSimilar(item)}>
                      <Sparkles size={18} />이 아이디어로 유사문제 만들기
                    </button>
                    <button type="button" className="suddak-btn suddak-btn-ghost" disabled={busyItemId === item.id} onClick={() => void createSeed(item)}>
                      <CopyPlus size={18} />문풀 보조 데이터로 저장
                    </button>
                    {viewerIsAdmin ? (
                      <>
                        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void reviewItem(item, "approved")}>
                          <Check size={18} />승인
                        </button>
                        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void reviewItem(item, "rejected")}>
                          반려
                        </button>
                        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void reviewItem(item, "needs_edit")}>
                          수정 필요
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
