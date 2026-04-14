"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, toggleTheme } from "@/lib/theme";

type Props = {
  mobileFull?: boolean;
};

/* # 1. 공통 테마 버튼 */
export default function ThemeToggleButton({ mobileFull = false }: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(getStoredTheme() === "dark");
  }, []);

  return (
    <button
      type="button"
      className="suddak-btn suddak-btn-ghost"
      onClick={() => setIsDark(toggleTheme() === "dark")}
      style={{
        width: mobileFull ? "100%" : undefined,
      }}
    >
      {isDark ? "주간모드" : "야간모드"}
    </button>
  );
}