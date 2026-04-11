"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
          maxWidth: "420px",
          margin: "60px auto",
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: "30px", fontWeight: 800 }}>
          로그인
        </h1>
        <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
          수학수확 계정으로 로그인해.
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
              border: "1px solid #d1d5db",
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
              border: "1px solid #d1d5db",
            }}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #3157c8",
              backgroundColor: "#3157c8",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "14px", color: "#374151" }}>{message}</p>
        )}

        <p style={{ marginTop: "18px", color: "#6b7280" }}>
          계정이 없으면 <Link href="/signup">회원가입</Link>
        </p>
      </div>
    </main>
  );
}