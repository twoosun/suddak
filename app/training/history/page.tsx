"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { supabase } from "@/lib/supabase";
import type { TrainingUploadSet } from "@/lib/training/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function TrainingHistoryPage() {
  const [items, setItems] = useState<TrainingUploadSet[]>([]);
  const [message, setMessage] = useState("불러오는 중입니다.");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setMessage("로그인이 필요합니다.");
          return;
        }

        const res = await fetch("/api/training/my-uploads", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "분석 기록을 불러오지 못했습니다.");

        setItems((data.items ?? []) as TrainingUploadSet[]);
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "분석 기록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <PageContainer topPadding={28} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 5vw, 2.8rem)", fontWeight: 950 }}>내 학습기 분석 기록</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>업로드한 문제지·해설지 분석 세트를 확인합니다.</p>
        </div>
        <Link href="/training" className="suddak-btn suddak-btn-primary">
          새 분석 업로드
        </Link>
      </header>

      <SectionCard title="분석 세트 목록">
        {loading || items.length === 0 ? (
          <div className="suddak-card-soft" style={{ padding: "18px", color: "var(--muted)", lineHeight: 1.7 }}>
            {loading ? "불러오는 중입니다." : message || "아직 분석 기록이 없습니다."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {items.map((item) => (
              <Link key={item.id} href={`/training/${item.id}`} className="suddak-card-soft" style={{ padding: "14px", display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "1.08rem" }}>{item.title}</strong>
                  <span className="suddak-badge">{item.status}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                  <span>과목: {item.subject || "-"}</span>
                  <span>감지: {item.detected_problem_count}</span>
                  <span>매칭: {item.matched_problem_count}</span>
                  <span>분석: {item.analyzed_item_count}</span>
                  <span>승인: {item.approved_problem_count}</span>
                  <span>예상 리워드: {item.estimated_reward}딱</span>
                  <span>최종 리워드: {item.final_reward}딱</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
