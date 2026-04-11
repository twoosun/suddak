"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type HistoryItem = {
  id: number;
  action_type: "read" | "solve";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
};

function buildCommunityShareUrl(item: HistoryItem) {
  const params = new URLSearchParams();

  params.set("post_type", "problem");
  params.set("title", "문제 공유");
  params.set("content", "수딱 히스토리에서 공유한 문제입니다.");
  params.set("history_id", String(item.id));

  if (item.recognized_text) {
    params.set("recognized_text", item.recognized_text);
  }

  if (item.solve_result) {
    params.set("solve_result", item.solve_result);
  }

  return `/community/write?${params.toString()}`;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState("불러오는 중...");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setIsDark(getStoredTheme() === "dark");
  setMounted(true);
}, []);

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

  const theme = useMemo(
    () => ({
      bg: isDark
        ? "linear-gradient(180deg, #0b1220 0%, #111827 50%, #0f172a 100%)"
        : "#f7f8fc",
      card: isDark ? "#111827" : "#ffffff",
      cardBorder: isDark ? "#253041" : "#e5e7eb",
      text: isDark ? "#f9fafb" : "#111827",
      subText: isDark ? "#cbd5e1" : "#6b7280",
      softCard: isDark ? "#0f172a" : "#fbfcfe",
      softBorder: isDark ? "#334155" : "#edf0f5",
      buttonBg: isDark ? "#0f172a" : "#ffffff",
      buttonBorder: isDark ? "#374151" : "#d1d5db",
      buttonText: isDark ? "#f9fafb" : "#111827",
      shadow: isDark
        ? "0 8px 30px rgba(0, 0, 0, 0.35)"
        : "0 8px 30px rgba(15, 23, 42, 0.04)",
      badgeBg: isDark ? "#1e3a8a" : "#eef2ff",
      badgeBg2: isDark ? "#164e63" : "#ecfeff",
    }),
    [isDark]
  );

  if (!mounted) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        padding: "40px 20px",
        color: theme.text,
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
            <p style={{ margin: "8px 0 0", color: theme.subText }}>
              최근 문제 읽기와 풀이 기록을 확인할 수 있어.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setIsDark(toggleTheme() === "dark")}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                border: `1px solid ${theme.buttonBorder}`,
                backgroundColor: theme.buttonBg,
                color: theme.buttonText,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isDark ? "주간모드" : "야간모드"}
            </button>

            <Link
              href="/"
              style={{
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: "12px",
                border: `1px solid ${theme.buttonBorder}`,
                backgroundColor: theme.buttonBg,
                color: theme.buttonText,
                fontWeight: 700,
              }}
            >
              홈으로
            </Link>
          </div>
        </div>

        {message && (
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "18px",
              padding: "18px",
              color: theme.subText,
              boxShadow: theme.shadow,
            }}
          >
            {message}
          </div>
        )}

        {!message && items.length === 0 && (
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "18px",
              padding: "18px",
              color: theme.subText,
              boxShadow: theme.shadow,
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
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: "20px",
                padding: "20px",
                boxShadow: theme.shadow,
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
                      item.action_type === "read" ? theme.badgeBg : theme.badgeBg2,
                    color: "#3157c8",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {item.action_type === "read" ? "문제 읽기" : "풀이"}
                </div>

                <div style={{ fontSize: "13px", color: theme.subText }}>
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "14px",
                }}
              >
                <Link
                  href={buildCommunityShareUrl(item)}
                  style={{
                    textDecoration: "none",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${theme.buttonBorder}`,
                    backgroundColor: theme.buttonBg,
                    color: theme.buttonText,
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  커뮤니티 공유
                </Link>
              </div>

              {item.recognized_text && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                    인식한 문제
                  </div>
                  <div
                    style={{
                      backgroundColor: theme.softCard,
                      border: `1px solid ${theme.softBorder}`,
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
                      backgroundColor: theme.softCard,
                      border: `1px solid ${theme.softBorder}`,
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