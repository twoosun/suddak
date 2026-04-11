"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
  setIsDark(getStoredTheme() === "dark");
  setMounted(true);
}, []);

 

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("로그인 성공");
      window.location.href = "/";
    }

    setLoading(false);
  };

  const theme = useMemo(
    () => ({
      bg: isDark
        ? "linear-gradient(180deg, #0b1220 0%, #111827 50%, #0f172a 100%)"
        : "#f7f8fc",
      card: isDark ? "#111827" : "#ffffff",
      cardBorder: isDark ? "#253041" : "#e5e7eb",
      text: isDark ? "#f9fafb" : "#111827",
      subText: isDark ? "#cbd5e1" : "#6b7280",
      inputBg: isDark ? "#0b1220" : "#ffffff",
      inputBorder: isDark ? "#374151" : "#d1d5db",
      primary: "#3157c8",
      shadow: isDark
        ? "0 8px 30px rgba(0, 0, 0, 0.35)"
        : "0 8px 30px rgba(15, 23, 42, 0.05)",
      buttonBg: isDark ? "#0f172a" : "#ffffff",
      buttonText: isDark ? "#f9fafb" : "#111827",
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
          maxWidth: "420px",
          margin: "60px auto",
          backgroundColor: theme.card,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: "20px",
          padding: "28px",
          boxShadow: theme.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            alignItems: "center",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 0, fontSize: "30px", fontWeight: 800 }}>
            로그인
          </h1>

          <button
            onClick={() => setIsDark(toggleTheme() === "dark")}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.buttonBg,
              color: theme.buttonText,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isDark ? "주간모드" : "야간모드"}
          </button>
        </div>

        <p style={{ color: theme.subText, lineHeight: 1.7 }}>
          수딱 계정으로 로그인해.
        </p>

        <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: `1px solid ${theme.primary}`,
              backgroundColor: theme.primary,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "14px", color: theme.subText, lineHeight: 1.6 }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "18px", color: theme.subText }}>
          계정이 없으면 <Link href="/signup">회원가입</Link>
        </p>
      </div>
    </main>
  );
}