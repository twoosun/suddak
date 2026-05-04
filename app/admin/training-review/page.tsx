"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, Coins, ShieldAlert, XCircle } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { getSessionWithRecovery } from "@/lib/supabase";
import type { TrainingItem, TrainingSetWithItems } from "@/lib/training/types";

function listText(values: string[] | null | undefined) {
  return values?.length ? values.join(", ") : "-";
}

export default function AdminTrainingReviewPage() {
  const [sets, setSets] = useState<TrainingSetWithItems[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [message, setMessage] = useState("관리자 권한을 확인하는 중입니다.");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedSet = useMemo(
    () => sets.find((item) => item.id === selectedSetId) ?? sets[0] ?? null,
    [selectedSetId, sets],
  );

  const load = async () => {
    const session = await getSessionWithRecovery();
    if (!session?.access_token) {
      setMessage("로그인한 관리자 계정만 접근할 수 있습니다.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/training-review", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(res.status === 403 ? "관리자만 접근할 수 있는 페이지입니다." : data?.error || "검수 목록을 불러오지 못했습니다.");
    }

    const nextSets = (data.sets ?? []) as TrainingSetWithItems[];
    setSets(nextSets);
    setSelectedSetId((current) => current ?? nextSets[0]?.id ?? null);
    setMessage("");
    setLoading(false);
  };

  useEffect(() => {
    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "검수 목록을 불러오지 못했습니다.");
      setLoading(false);
    });
  }, []);

  const getToken = async () => {
    const session = await getSessionWithRecovery();
    return session?.access_token ?? "";
  };

  const reviewItem = async (item: TrainingItem, reviewStatus: "approved" | "rejected" | "needs_edit") => {
    setBusy(true);
    setMessage("");
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
      setBusy(false);
    }
  };

  const payReward = async () => {
    if (!selectedSet) return;
    setBusy(true);
    setMessage("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/training-review/sets/${selectedSet.id}/pay-reward`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "리워드를 지급하지 못했습니다.");
      setMessage(`${data.approvedCount}문항 기준 ${data.reward}딱을 지급했습니다.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "리워드를 지급하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer topPadding={28} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 950 }}>딱씨앗 학습소 검수</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>문항별 추상화 데이터 승인과 리워드 지급을 관리합니다.</p>
        </div>
        <Link href="/" className="suddak-btn suddak-btn-ghost">
          <ChevronLeft size={18} />홈
        </Link>
      </header>

      {message ? (
        <div className="suddak-card-soft" style={{ padding: "14px", marginBottom: "16px", lineHeight: 1.7 }}>
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="suddak-card-soft" style={{ padding: "18px" }}>불러오는 중입니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 330px) minmax(0, 1fr)", gap: "14px" }}>
          <SectionCard title="분석 세트">
            <div style={{ display: "grid", gap: "10px" }}>
              {sets.length === 0 ? (
                <div className="suddak-card-soft" style={{ padding: "14px", color: "var(--muted)" }}>
                  검수할 세트가 없습니다.
                </div>
              ) : (
                sets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    className="suddak-card-soft"
                    onClick={() => setSelectedSetId(set.id)}
                    style={{
                      padding: "14px",
                      textAlign: "left",
                      color: "inherit",
                      borderColor: selectedSet?.id === set.id ? "var(--primary)" : "var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{set.title}</strong>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                      <span className="suddak-badge">{set.subject || "-"}</span>
                      <span className="suddak-badge">{set.status}</span>
                      <span className="suddak-badge">승인 {set.approved_problem_count}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title={selectedSet ? selectedSet.title : "문항 검수"}>
            {selectedSet ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <div className="suddak-card-soft" style={{ padding: "14px", display: "grid", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span className="suddak-badge">상태 {selectedSet.status}</span>
                    <span className="suddak-badge">분석 {selectedSet.analyzed_item_count}</span>
                    <span className="suddak-badge">승인 {selectedSet.approved_problem_count}</span>
                    <span className="suddak-badge">예상 {selectedSet.estimated_reward}딱</span>
                    <span className="suddak-badge">최종 {selectedSet.final_reward}딱</span>
                    <span className="suddak-badge">{selectedSet.reward_paid ? "지급 완료" : "미지급"}</span>
                  </div>
                  <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void payReward()} disabled={busy || selectedSet.reward_paid}>
                    <Coins size={18} />승인 문항 기준 리워드 지급
                  </button>
                </div>

                {(selectedSet.training_items ?? []).map((item) => (
                  <article key={item.id} className="suddak-card-soft" style={{ padding: "14px", display: "grid", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <strong>문항 {item.problem_number || "-"}</strong>
                      <span className="suddak-badge">{item.review_status}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", lineHeight: 1.65 }}>
                      <div><b>과목/단원</b><br />{item.subject || "-"} / {item.unit || "-"}</div>
                      <div><b>핵심 개념</b><br />{listText(item.core_concepts)}</div>
                      <div><b>핵심 아이디어</b><br />{item.key_idea || "-"}</div>
                      <div><b>풀이 전략</b><br />{item.solution_strategy || "-"}</div>
                      <div><b>함정 포인트</b><br />{item.trap_point || "-"}</div>
                      <div><b>오답 원인</b><br />{item.common_mistake || "-"}</div>
                      <div><b>변형 포인트</b><br />{listText(item.variation_points)}</div>
                      <div><b>seed</b><br />{item.similar_problem_seed || "-"}</div>
                    </div>

                    <details className="suddak-card" style={{ padding: "12px" }}>
                      <summary style={{ cursor: "pointer", fontWeight: 900 }}>원본 인식 텍스트 검수용 보기</summary>
                      <div style={{ display: "grid", gap: "12px", marginTop: "12px", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                        <div><b>문제</b><br />{item.problem_text || "-"}</div>
                        <div><b>해설</b><br />{item.solution_text || "-"}</div>
                      </div>
                    </details>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                      <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void reviewItem(item, "approved")} disabled={busy}>
                        <CheckCircle2 size={18} />승인
                      </button>
                      <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void reviewItem(item, "needs_edit")} disabled={busy}>
                        <ShieldAlert size={18} />수정
                      </button>
                      <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void reviewItem(item, "rejected")} disabled={busy}>
                        <XCircle size={18} />반려
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "14px", color: "var(--muted)" }}>
                왼쪽에서 세트를 선택해 주세요.
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}
