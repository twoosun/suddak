"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type Props = {
  current?: "home" | "community";
};

export default function SuddakCommunityHeader({
  current = "community",
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setIsDark(getStoredTheme() === "dark");
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) setSession(session);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const theme = useMemo(
    () => ({
      cardBorder: isDark ? "#253041" : "#e5e7eb",
      headerBg: isDark ? "rgba(17,24,39,0.82)" : "rgba(255,255,255,0.8)",
      logoGradient: isDark
        ? "linear-gradient(135deg, #ffffff 0%, #93c5fd 45%, #60a5fa 100%)"
        : "linear-gradient(135deg, #0f172a 0%, #3157c8 45%, #60a5fa 100%)",
      logoSub: isDark ? "#93c5fd" : "#3157c8",
      subtleButtonBg: isDark ? "#0f172a" : "#ffffff",
      subtleButtonBorder: isDark ? "#374151" : "#d1d5db",
      subtleButtonText: isDark ? "#f9fafb" : "#111827",
      primary: "#3157c8",
    }),
    [isDark]
  );

  const actionStyle: React.CSSProperties = {
    minHeight: isMobile ? "36px" : "42px",
    padding: isMobile ? "8px 10px" : "10px 14px",
    borderRadius: isMobile ? "10px" : "12px",
    border: `1px solid ${theme.subtleButtonBorder}`,
    backgroundColor: theme.subtleButtonBg,
    color: theme.subtleButtonText,
    fontWeight: 700,
    fontSize: isMobile ? "12px" : "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header
      style={{
        borderBottom: `1px solid ${theme.cardBorder}`,
        backgroundColor: theme.headerBg,
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: isMobile ? "14px 12px" : "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "16px",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <Link
            href="/"
            style={{ textDecoration: "none", display: "block", width: "fit-content" }}
            aria-label="메인 화면으로 이동"
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: theme.primary,
                marginBottom: "8px",
                letterSpacing: "0.02em",
              }}
            >
              AI 수학 문제 도우미
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "8px" : "10px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: isMobile ? "2px" : "4px",
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? "44px" : "64px",
                    fontWeight: 950,
                    letterSpacing: "-0.07em",
                    lineHeight: 0.95,
                    backgroundImage: theme.logoGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  수딱
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingLeft: isMobile ? "2px" : "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? "16px" : "20px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: theme.logoSub,
                      textTransform: "uppercase",
                    }}
                  >
                    Suddak
                  </div>

                  <div
                    style={{
                      height: "1px",
                      width: isMobile ? "36px" : "52px",
                      background: isDark
                        ? "linear-gradient(90deg, #60a5fa 0%, transparent 100%)"
                        : "linear-gradient(90deg, #3157c8 0%, transparent 100%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </Link>

          {!isMobile && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: session ? "repeat(4, auto)" : "repeat(3, auto)",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setIsDark(toggleTheme() === "dark")}
                style={{ ...actionStyle, cursor: "pointer" }}
              >
                {isDark ? "주간모드" : "야간모드"}
              </button>

              <Link
                href="/"
                style={{
                  ...actionStyle,
                  backgroundColor:
                    current === "home" ? theme.primary : theme.subtleButtonBg,
                  color: current === "home" ? "#fff" : theme.subtleButtonText,
                  border:
                    current === "home"
                      ? `1px solid ${theme.primary}`
                      : `1px solid ${theme.subtleButtonBorder}`,
                }}
              >
                홈
              </Link>

              <Link
                href="/community"
                style={{
                  ...actionStyle,
                  backgroundColor:
                    current === "community" ? theme.primary : theme.subtleButtonBg,
                  color: current === "community" ? "#fff" : theme.subtleButtonText,
                  border:
                    current === "community"
                      ? `1px solid ${theme.primary}`
                      : `1px solid ${theme.subtleButtonBorder}`,
                }}
              >
                커뮤니티
              </Link>

              {session ? (
                <button
                  onClick={handleLogout}
                  style={{ ...actionStyle, cursor: "pointer" }}
                >
                  로그아웃
                </button>
              ) : (
                <Link href="/" style={actionStyle}>
                  로그인
                </Link>
              )}
            </div>
          )}
        </div>

        {isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: session ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
              gap: "8px",
              width: "100%",
            }}
          >
            <button
              onClick={() => setIsDark(toggleTheme() === "dark")}
              style={{ ...actionStyle, cursor: "pointer", width: "100%" }}
            >
              {isDark ? "주간" : "야간"}
            </button>

            <Link
              href="/"
              style={{
                ...actionStyle,
                width: "100%",
                backgroundColor:
                  current === "home" ? theme.primary : theme.subtleButtonBg,
                color: current === "home" ? "#fff" : theme.subtleButtonText,
                border:
                  current === "home"
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.subtleButtonBorder}`,
              }}
            >
              홈
            </Link>

            <Link
              href="/community"
              style={{
                ...actionStyle,
                width: "100%",
                backgroundColor:
                  current === "community" ? theme.primary : theme.subtleButtonBg,
                color: current === "community" ? "#fff" : theme.subtleButtonText,
                border:
                  current === "community"
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.subtleButtonBorder}`,
              }}
            >
              커뮤
            </Link>

            {session ? (
              <button
                onClick={handleLogout}
                style={{ ...actionStyle, cursor: "pointer", width: "100%" }}
              >
                로그아웃
              </button>
            ) : (
              <Link href="/" style={{ ...actionStyle, width: "100%" }}>
                로그인
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}