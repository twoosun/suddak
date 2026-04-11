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
      headerBg: isDark ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.9)",
      text: isDark ? "#f8fafc" : "#111827",
      subText: isDark ? "#93c5fd" : "#3157c8",
      subtleButtonBg: isDark ? "#0f172a" : "#ffffff",
      subtleButtonBorder: isDark ? "#374151" : "#d1d5db",
      subtleButtonText: isDark ? "#f9fafb" : "#111827",
      primary: "#3157c8",
      logoBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
      logoShadow: isDark
        ? "0 8px 20px rgba(0,0,0,0.30)"
        : "0 8px 20px rgba(37,99,235,0.14)",
    }),
    [isDark]
  );

  const navButtonStyle: React.CSSProperties = {
    minHeight: "36px",
    padding: "8px 13px",
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

  const activeStyle: React.CSSProperties = {
    backgroundColor: theme.primary,
    color: "#ffffff",
    border: `1px solid ${theme.primary}`,
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
          padding: "12px 12px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <Link
            href="/"
            aria-label="메인 화면으로 이동"
            style={{
              textDecoration: "none",
              minWidth: 0,
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                overflow: "hidden",
                flexShrink: 0,
                border: `1px solid ${theme.logoBorder}`,
                boxShadow: theme.logoShadow,
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
              }}
            >
              <img
                src="/logo.png"
                alt="수딱 로고"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.95,
                  color: theme.text,
                }}
              >
                수딱
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: theme.subText,
                  marginTop: "4px",
                  lineHeight: 1.1,
                }}
              >
                Community
              </div>
            </div>
          </Link>

          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <MoreMenu
              isDark={isDark}
              onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              ...navButtonStyle,
              ...(current === "home" ? activeStyle : {}),
            }}
          >
            홈
          </Link>
          <Link
            href="/community"
            style={{
              ...navButtonStyle,
              ...(current === "community" ? activeStyle : {}),
            }}
          >
            커뮤니티
          </Link>
        </div>
      </div>
    </header>
  );
}