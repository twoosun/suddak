"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  is_admin: boolean | null;
};

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setIsAdmin(false);
            setEmail("");
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setEmail(user.email ?? "");
        }

        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (mounted) {
          setIsAdmin(Boolean(data?.is_admin));
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ffffff 100%)",
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
        color: "#374151",
        fontWeight: 700,
        fontSize: "14px",
      } as React.CSSProperties,
      card: {
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      } as React.CSSProperties,
      title: {
        fontSize: "28px",
        fontWeight: 900,
        color: "#111827",
        marginBottom: "10px",
      } as React.CSSProperties,
      desc: {
        fontSize: "15px",
        color: "#4b5563",
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
        backgroundColor: isAdmin ? "#dcfce7" : "#f3f4f6",
        color: isAdmin ? "#166534" : "#374151",
      } as React.CSSProperties,
      subTitle: {
        fontSize: "18px",
        fontWeight: 800,
        color: "#111827",
        marginTop: "18px",
        marginBottom: "12px",
      } as React.CSSProperties,
      list: {
        margin: 0,
        paddingLeft: "18px",
        color: "#374151",
        lineHeight: 1.9,
        fontSize: "15px",
      } as React.CSSProperties,
      buttonRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "24px",
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
        backgroundColor: "#ffffff",
        color: "#111827",
        fontWeight: 800,
        textDecoration: "none",
        border: "1px solid #d1d5db",
      } as React.CSSProperties,
      muted: {
        marginTop: "14px",
        color: "#6b7280",
        fontSize: "14px",
      } as React.CSSProperties,
    }),
    [isAdmin]
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

          {loading ? (
            <div style={styles.badge}>불러오는 중...</div>
          ) : (
            <div style={styles.badge}>
              현재 상태: {isAdmin ? "관리자" : "일반 사용자"}
            </div>
          )}

          {email ? (
            <p style={styles.muted}>로그인 계정: {email}</p>
          ) : (
            <p style={styles.muted}>로그인하지 않은 상태입니다.</p>
          )}

          <h2 style={styles.subTitle}>관리자 혜택</h2>
          <ul style={styles.list}>
            <li>더 뛰어난 추론 사용 가능</li>
            <li>1일 횟수 제한 없음</li>
            <li>유사/변형 문제 생성 가능</li>
            <li>그래프 시각화와 깔끔한 도형 작도</li>
          </ul>

          <div style={styles.buttonRow}>
            <a
              href="https://forms.gle/YOUR_ADMIN_APPLY_FORM"
              target="_blank"
              rel="noreferrer"
              style={styles.primaryBtn}
            >
              관리자 신청하기
            </a>

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