"use client";

import { useState } from "react";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type Props = {
  mobileFull?: boolean;
};

export default function ThemeToggleButton({ mobileFull = false }: Props) {
  const [isDark, setIsDark] = useState(() => getStoredTheme() === "dark");

  return (
    <button
      type="button"
      className="suddak-btn suddak-btn-ghost"
      onClick={() => setIsDark(toggleTheme() === "dark")}
      style={{
        width: mobileFull ? "100%" : undefined,
      }}
    >
      {isDark ? "라이트 모드" : "다크 모드"}
    </button>
  );
}
