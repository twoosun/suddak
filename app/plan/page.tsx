"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  grade: string | null;
  is_approved: boolean | null;
  is_admin: boolean | null;
};

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    setIsDark(saved === "dark");
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          setEmail("");
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);
        setEmail(session.user.email ?? "");

        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, grade, is_approved, is_admin")
          .eq("id", session.user.id)
          .maybeSingle<UserProfileRow>();

        if (error) {
          console.error("plan profile load error:", error);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(Boolean(data?.is_admin));
        setLoading(false);
      } catch (error) {
        console.error("plan page load error:", error);
        if (!mounted) return;
        setIsLoggedIn(false);
        setIsAdmin(false);
        setEmail("");
        setLoading(false);
      }
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setEmail("");
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setEmail(session.user.email ?? "");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, grade, is_approved, is_admin")
        .eq("id", session.user.id)
        .maybeSingle<UserProfileRow>();

      if (error) {
        console.error("plan auth change profile load error:", error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(Boolean(data?.is_admin));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(180deg, #020617 0%, #0f172a 55%, #111827 100%)"
          : "linear-gradient(180deg, #f3f4f6 0%, #eef2ff 55%, #ffffff 100%)",
        padding: "24px 16px 64px",
      } as React.CSSProperties,

      wrap: {
        maxWidth: "860px",
        margin: "0 auto",
      } as React.CSSProperties,

      topBar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
      } as React.CSSProperties,

      back: {
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        color: isDark ? "#cbd5e1" : "#374151",
        fontWeight: 700,
        fontSize: "14px",
      } as React.CSSProperties,

      card: {
        backgroundColor: isDark ? "#111827" : "#ffffff",
        border: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        borderRadius: "24px",
        padding: "28px 20px",
        boxShadow: isDark
          ? "0 14px 36px rgba(0,0,0,0.30)"
          : "0 10px 30px rgba(15, 23, 42, 0.06)",
      } as React.CSSProperties,

      title: {
        fontSize: "28px",
        fontWeight: 900,
        color: isDark ? "#f9fafb" : "#111827",
        marginBottom: "10px",
      } as React.CSSProperties,

      desc: {
        fontSize: "15px",
        color: isDark ? "#cbd5e1" : "#4b5563",
        lineHeight: 1.7,
        marginBottom: "20px",
      } as React.CSSProperties,

      badge: {
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "999px",
        fontWeight: 800,
        fontSize: "14px",
        marginBottom: "18px",
        backgroundColor: loading
          ? isDark
            ? "#1f2937"
            : "#f3f4f6"
          : isAdmin
          ? isDark
            ? "#14532d"
            : "#dcfce7"
          : isDark
          ? "#1f2937"
          : "#f3f4f6",
        color: loading
          ? isDark
            ? "#cbd5e1"
            : "#374151"
          : isAdmin
          ? isDark
            ? "#bbf7d0"
            : "#166534"
          : isDark
          ? "#e5e7eb"
          : "#374151",
      } as React.CSSProperties,

      subTitle: {
        fontSize: "20px",
        fontWeight: 800,
        color: isDark ? "#f9fafb" : "#111827",
        marginTop: "22px",
        marginBottom: "12px",
      } as React.CSSProperties,

      text: {
        color: isDark ? "#cbd5e1" : "#4b5563",
        fontSize: "15px",
        lineHeight: 1.8,
        marginBottom: "10px",
      } as React.CSSProperties,

      list: {
        margin: 0,
        paddingLeft: "20px",
        color: isDark ? "#e5e7eb" : "#111827",
        lineHeight: 1.9,
        fontSize: "15px",
      } as React.CSSProperties,

      buttonRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "26px",
      } as React.CSSProperties,

      primaryBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "46px",
        padding: "0 18px",
        borderRadius: "12px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        fontWeight: 800,
        textDecoration: "none",
        border: "none",
        cursor: "pointer",
      } as React.CSSProperties,

      secondaryBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "46px",
        padding: "0 18px",
        borderRadius: "12px",
        backgroundColor: isDark ? "#111827" : "#ffffff",
        color: isDark ? "#f9fafb" : "#111827",
        fontWeight: 800,
        textDecoration: "none",
        border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
      } as React.CSSProperties,

      muted: {
        marginTop: "14px",
        color: isDark ? "#94a3b8" : "#6b7280",
        fontSize: "14px",
      } as React.CSSProperties,
    }),
    [isAdmin, isDark, loading]
  );

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <Link href="/" style={styles.back}>
            ← 홈으로
          </Link>
        </div>

        <section style={styles.card}>
          <h1 style={styles.title}>플랜 설정</h1>
          <p style={styles.desc}>
            현재 내 계정 상태를 확인하고, 관리자 플랜의 혜택과 신청 방법을 볼 수
            있습니다.
          </p>

          <div style={styles.badge}>
            현재 상태:{" "}
            {loading
              ? "불러오는 중..."
              : isAdmin
              ? "관리자"
              : isLoggedIn
              ? "일반 사용자"
              : "비로그인"}
          </div>

          <p style={styles.text}>
            {loading
              ? "계정 정보를 확인하는 중입니다."
              : isLoggedIn
              ? `로그인 계정: ${email}`
              : "로그인하지 않은 상태입니다."}
          </p>

          <h2 style={styles.subTitle}>관리자 혜택</h2>
          <ul style={styles.list}>
            <li>더 뛰어난 추론 사용 가능</li>
            <li>1일 횟수 제한 없음</li>
            <li>유사·변형 문제 생성 가능</li>
            <li>그래프 시각화와 깔끔한 도형 작도</li>
          </ul>

          <div style={styles.buttonRow}>
            <button type="button" style={styles.primaryBtn}>
              관리자 신청하기
            </button>

            <Link href="/" style={styles.secondaryBtn}>
              홈으로 돌아가기
            </Link>
          </div>

          <p style={styles.muted}>
            현재 신청을 받고 있지 않습니다. 커뮤니티에서 문의바랍니다.
          </p>
        </section>
      </div>
    </main>
  );
}