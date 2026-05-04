"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionWithRecovery, supabase } from "@/lib/supabase";

export default function AuthButtons() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const session = await getSessionWithRecovery();
      const user = session?.user ?? null;

      if (!mounted) return;
      setEmail(user?.email ?? null);
      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setEmail(null);
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div style={{ fontSize: "14px", color: "#6b7280" }}>
        불러오는 중...
      </div>
    );
  }

  if (email) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/history"
          style={{
            textDecoration: "none",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            color: "#111827",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          내 기록
        </Link>

        <span
          style={{
            fontSize: "14px",
            color: "#374151",
            fontWeight: 600,
          }}
        >
          {email}
        </span>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            color: "#111827",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/login"
        style={{
          textDecoration: "none",
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid #d1d5db",
          backgroundColor: "#ffffff",
          color: "#111827",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        로그인
      </Link>

      <Link
        href="/signup"
        style={{
          textDecoration: "none",
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid #8b5cf6",
          backgroundColor: "#8b5cf6",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        회원가입
      </Link>
    </div>
  );
}
