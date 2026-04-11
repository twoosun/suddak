"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, toggleTheme } from "@/lib/theme";


export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
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


  const handleSignup = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setMessage("회원가입은 되었지만 사용자 정보를 찾지 못했습니다.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        email,
        fullName,
        grade,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error || "프로필 저장 중 오류가 발생했습니다.");
    } else {
      setMessage("회원가입 완료. 메일함에서 인증 후, 관리자 승인시 이용 가능합니다.");
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
            회원가입
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
          수딱 계정을 만들고 승인받은 뒤 서비스를 이용할 수 있어.
        </p>

        <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
          <input
            type="text"
            placeholder="성명"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />

          <input
            type="text"
            placeholder="학년 (예: 고1, 고2, 고3)"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.text,
            }}
          />

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
            onClick={handleSignup}
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
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "14px", color: theme.subText, lineHeight: 1.6 }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "18px", color: theme.subText }}>
          이미 계정이 있으면 <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}