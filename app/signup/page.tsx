"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      setMessage("회원가입 완료. 관리자 승인 후 이용 가능합니다.");
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
          회원가입
        </h1>

        <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
          수학수확 계정을 만들고 승인받은 뒤 서비스를 이용할 수 있어.
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
              border: "1px solid #d1d5db",
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
              border: "1px solid #d1d5db",
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
            onClick={handleSignup}
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
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </div>

        {message && (
          <p style={{ marginTop: "14px", color: "#374151", lineHeight: 1.6 }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "18px", color: "#6b7280" }}>
          이미 계정이 있으면 <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}