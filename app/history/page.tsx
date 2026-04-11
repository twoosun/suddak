"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase";

type HistoryItem = {
  id: number;
  action_type: "read" | "solve";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState("불러오는 중...");

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "기록을 불러오지 못했습니다.");
        return;
      }

      setItems(data.items || []);
      setMessage("");
    };

    load();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f7f8fc",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 800 }}>
              내 기록
            </h1>
            <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
              최근 문제 읽기와 풀이 기록을 확인할 수 있어.
            </p>
          </div>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              padding: "10px 16px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#111827",
              fontWeight: 700,
            }}
          >
            홈으로
          </Link>
        </div>

        {message && (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "18px",
              color: "#374151",
            }}
          >
            {message}
          </div>
        )}

        {!message && items.length === 0 && (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "18px",
              color: "#374151",
            }}
          >
            아직 저장된 기록이 없어.
          </div>
        )}

        <div style={{ display: "grid", gap: "16px" }}>
          {items.map((item) => (
            <section
              key={item.id}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    backgroundColor:
                      item.action_type === "read" ? "#eef2ff" : "#ecfeff",
                    color: "#3157c8",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {item.action_type === "read" ? "문제 읽기" : "풀이"}
                </div>

                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>

              {item.recognized_text && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                    인식한 문제
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fbfcfe",
                      border: "1px solid #edf0f5",
                      borderRadius: "14px",
                      padding: "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {item.recognized_text}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {item.solve_result && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                    풀이 결과
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fbfcfe",
                      border: "1px solid #edf0f5",
                      borderRadius: "14px",
                      padding: "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {item.solve_result}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}