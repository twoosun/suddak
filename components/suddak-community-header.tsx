"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MoreMenu from "@/components/MoreMenu";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type Props = {
  current?: "home" | "community";
};

export default function SuddakCommunityHeader({ current = "community" }: Props) {
  const [isDark, setIsDark] = useState(() => getStoredTheme() === "dark");

  const theme = useMemo(
    () => ({
      border: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb",
      headerBg: isDark ? "rgba(17,17,17,0.88)" : "rgba(255,255,255,0.9)",
      text: isDark ? "#f8fafc" : "#111827",
      subText: "#a78bfa",
      buttonBg: isDark ? "#181818" : "#ffffff",
      buttonText: isDark ? "#f8fafc" : "#111827",
      primary: "#8b5cf6",
    }),
    [isDark],
  );

  const navButtonStyle: React.CSSProperties = {
    minHeight: "36px",
    padding: "8px 13px",
    borderRadius: "999px",
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.buttonBg,
    color: theme.buttonText,
    fontWeight: 850,
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
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.headerBg,
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px" }}>
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
            aria-label="수딱 홈으로 이동"
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
            }}
          >
            <img
              src="/logo.png"
              alt=""
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                objectFit: "cover",
                border: `1px solid ${theme.border}`,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "25px", fontWeight: 950, lineHeight: 1, color: theme.text }}>
                수딱
              </div>
              <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: 850, color: theme.subText }}>
                Community
              </div>
            </div>
          </Link>

          <MoreMenu
            isDark={isDark}
            onToggleTheme={() => setIsDark(toggleTheme() === "dark")}
            themeLabel={isDark ? "라이트 모드" : "다크 모드"}
            redirectAfterLogout="/login"
          />
        </div>

        <nav style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/" style={{ ...navButtonStyle, ...(current === "home" ? activeStyle : {}) }}>
            문제풀이
          </Link>
          <Link
            href="/community"
            style={{ ...navButtonStyle, ...(current === "community" ? activeStyle : {}) }}
          >
            커뮤니티
          </Link>
        </nav>
      </div>
    </header>
  );
}
