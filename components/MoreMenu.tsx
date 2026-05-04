"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Menu } from "lucide-react";

import { getSessionWithRecovery, supabase } from "@/lib/supabase";

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

    void getSessionWithRecovery().then((currentSession) => {
      if (mounted) setSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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
      buttonBg: isDark ? "#181818" : "#ffffff",
      buttonBorder: isDark ? "rgba(255,255,255,0.14)" : "#d1d5db",
      buttonText: isDark ? "#f8fafc" : "#111827",
      menuBg: isDark ? "#181818" : "#ffffff",
      menuBorder: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb",
      itemHover: isDark ? "#21183a" : "#f3f4f6",
      muted: isDark ? "#a1a1aa" : "#6b7280",
      danger: "#f87171",
      shadow: isDark
        ? "0 18px 44px rgba(0,0,0,0.44)"
        : "0 18px 40px rgba(15,23,42,0.14)",
    }),
    [isDark],
  );

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    color: theme.buttonText,
    fontSize: "14px",
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
    borderRadius: "8px",
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

  const hoverProps = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      event.currentTarget.style.backgroundColor = theme.itemHover;
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      event.currentTarget.style.backgroundColor = "transparent";
    },
  };

  return (
    <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="메뉴 열기"
        style={{
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
        }}
      >
        <Menu size={22} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(224px, calc(100vw - 24px))",
            maxWidth: "calc(100vw - 24px)",
            backgroundColor: theme.menuBg,
            border: `1px solid ${theme.menuBorder}`,
            borderRadius: "8px",
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
              fontWeight: 800,
            }}
          >
            메뉴
          </div>

          <Link href="/history" style={itemStyle} onClick={() => setOpen(false)} {...hoverProps}>
            기록실
          </Link>
          <Link href="/plan" style={itemStyle} onClick={() => setOpen(false)} {...hoverProps}>
            플랜 설정
          </Link>
          <Link href="/updates" style={itemStyle} onClick={() => setOpen(false)} {...hoverProps}>
            새 소식
          </Link>
          <Link
            href={session ? "/profile" : "/login"}
            style={itemStyle}
            onClick={() => setOpen(false)}
            {...hoverProps}
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
            {...hoverProps}
          >
            {themeLabel}
          </button>

          <div style={{ height: "1px", backgroundColor: theme.menuBorder, margin: "8px 0" }} />

          {!session ? (
            <>
              <Link href="/login" style={itemStyle} onClick={() => setOpen(false)} {...hoverProps}>
                로그인
              </Link>
              <Link href="/signup" style={itemStyle} onClick={() => setOpen(false)} {...hoverProps}>
                회원가입
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loadingLogout}
              style={{ ...itemStyle, color: theme.danger }}
              {...hoverProps}
            >
              {loadingLogout ? "로그아웃 중..." : "로그아웃"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
