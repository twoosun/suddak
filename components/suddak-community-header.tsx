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
  const [isDark, setIsDark] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

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
      headerBg: isDark ? "rgba(17,24,39,0.86)" : "rgba(255,255,255,0.88)",
      logoGradient: isDark
        ? "linear-gradient(135deg, #ffffff 0%, #93c5fd 45%, #60a5fa 100%)"
        : "linear-gradient(135deg, #0f172a 0%, #3157c8 45%, #60a5fa 100%)",
      logoSub: isDark ? "#93c5fd" : "#3157c8",
      subtleButtonBg: isDark ? "#0f172a" : "#ffffff",
      subtleButtonBorder: isDark ? "#374151" : "#d1d5db",
      subtleButtonText: isDark ? "#f9fafb" : "#111827",
      primary: "#3157c8",
      primarySoft: isDark ? "#1d4ed8" : "#e8eefc",
      primarySoftText: isDark ? "#dbeafe" : "#3157c8",
      mutedText: isDark ? "#cbd5e1" : "#6b7280",
    }),
    [isDark]
  );

  const baseButtonStyle: React.CSSProperties = {
    minHeight: "40px",
    padding: "10px 14px",
    borderRadius: "999px",
    border: `1px solid ${theme.subtleButtonBorder}`,
    backgroundColor: theme.subtleButtonBg,
    color: theme.subtleButtonText,
    fontWeight: 800,
    fontSize: "13px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    lineHeight: 1,
  };

  const activeButtonStyle: React.CSSProperties = {
    backgroundColor: theme.primary,
    color: "#ffffff",
    border: `1px solid ${theme.primary}`,
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: `1px solid ${theme.cardBorder}`,
        backgroundColor: theme.headerBg,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "14px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              aria-label="메인 화면으로 이동"
              style={{
                textDecoration: "none",
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: theme.primary,
                  marginBottom: "6px",
                  letterSpacing: "0.02em",
                }}
              >
                AI 수학 문제 도우미
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: "36px",
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
                      paddingLeft: "2px",
                      marginTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
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
                        width: "28px",
                        background: isDark
                          ? "linear-gradient(90deg, #60a5fa 0%, transparent 100%)"
                          : "linear-gradient(90deg, #3157c8 0%, transparent 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsDark(toggleTheme() === "dark")}
              style={{
                ...baseButtonStyle,
                cursor: "pointer",
                padding: "10px 12px",
                flexShrink: 0,
              }}
            >
              {isDark ? "주간모드" : "야간모드"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                flex: "1 1 auto",
              }}
            >
              <Link
                href="/"
                style={{
                  ...baseButtonStyle,
                  ...(current === "home" ? activeButtonStyle : {}),
                }}
              >
                홈
              </Link>

              <Link
                href="/community"
                style={{
                  ...baseButtonStyle,
                  ...(current === "community" ? activeButtonStyle : {}),
                }}
              >
                커뮤니티
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {session ? (
                <>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: `1px solid ${theme.cardBorder}`,
                      backgroundColor: theme.primarySoft,
                      color: theme.primarySoftText,
                      fontSize: "12px",
                      fontWeight: 700,
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "none",
                    }}
                    className="suddak-session-chip"
                  >
                    로그인됨
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      ...baseButtonStyle,
                      cursor: "pointer",
                    }}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link href="/login" style={baseButtonStyle}>
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}