"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MoreMenu from "@/components/MoreMenu";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type Props = {
  current?: "home" | "community";
};

export default function SuddakCommunityHeader({
  current = "community",
}: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(getStoredTheme() === "dark");
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

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setIsDark(next === "dark");
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

            <MoreMenu
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
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
          </div>
        </div>
      </div>
    </header>
  );
}
