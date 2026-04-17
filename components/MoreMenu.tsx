"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Props = {
  isDark: boolean;
  onToggleTheme: () => void;
  themeLabel: string;
  redirectAfterLogout?: string;
};

export default function MoreMenu({
  isDark,
  onToggleTheme,
  themeLabel,
  redirectAfterLogout = "/login",
}: Props) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) setSession(session);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    const handleOutside = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const theme = useMemo(
    () => ({
      buttonBg: isDark ? "#0f172a" : "#ffffff",
      buttonBorder: isDark ? "#334155" : "#d1d5db",
      buttonText: isDark ? "#f8fafc" : "#111827",
      menuBg: isDark ? "#111827" : "#ffffff",
      menuBorder: isDark ? "#253041" : "#e5e7eb",
      itemHover: isDark ? "#1f2937" : "#f3f4f6",
      muted: isDark ? "#94a3b8" : "#6b7280",
      danger: "#dc2626",
      shadow: isDark
        ? "0 18px 40px rgba(0,0,0,0.38)"
        : "0 18px 40px rgba(15,23,42,0.14)",
    }),
    [isDark]
  );

  const triggerStyle: React.CSSProperties = {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    borderRadius: "12px",
    border: `1px solid ${theme.buttonBorder}`,
    backgroundColor: theme.buttonBg,
    color: theme.buttonText,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  };

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    color: theme.buttonText,
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
    borderRadius: "10px",
  };

  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      await supabase.auth.signOut();
      setOpen(false);
      router.push(redirectAfterLogout);
      router.refresh();
    } finally {
      setLoadingLogout(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="메뉴 열기"
      >
        <div
          style={{
            width: "18px",
            height: "14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              display: "block",
              height: "2px",
              borderRadius: "999px",
              backgroundColor: theme.buttonText,
            }}
          />
          <span
            style={{
              display: "block",
              height: "2px",
              borderRadius: "999px",
              backgroundColor: theme.buttonText,
            }}
          />
          <span
            style={{
              display: "block",
              height: "2px",
              borderRadius: "999px",
              backgroundColor: theme.buttonText,
            }}
          />
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            left: "auto",
            width: "min(220px, calc(100vw - 24px))",
            maxWidth: "calc(100vw - 24px)",
            backgroundColor: theme.menuBg,
            border: `1px solid ${theme.menuBorder}`,
            borderRadius: "16px",
            boxShadow: theme.shadow,
            padding: "8px",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 10px 10px",
              fontSize: "12px",
              color: theme.muted,
              fontWeight: 700,
            }}
          >
            메뉴
          </div>

          <Link
            href="/history"
            style={itemStyle}
            onClick={() => setOpen(false)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            기록 보기
          </Link>

          <Link
            href="/plan"
            style={itemStyle}
            onClick={() => setOpen(false)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            플랜 설정
          </Link>

          <Link
            href={session ? "/profile" : "/login"}
            style={itemStyle}
            onClick={() => setOpen(false)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            프로필
          </Link>

          <button
            type="button"
            onClick={() => {
              onToggleTheme();
              setOpen(false);
            }}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {themeLabel}
          </button>

          <div
            style={{
              height: "1px",
              backgroundColor: theme.menuBorder,
              margin: "8px 0",
            }}
          />

          {!session ? (
            <>
              <Link
                href="/login"
                style={itemStyle}
                onClick={() => setOpen(false)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                로그인
              </Link>

              <Link
                href="/signup"
                style={itemStyle}
                onClick={() => setOpen(false)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loadingLogout}
              style={{
                ...itemStyle,
                color: theme.danger,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {loadingLogout ? "로그아웃 중..." : "로그아웃"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}