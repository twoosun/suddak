"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  topPadding?: number;
  bottomPadding?: number;
};

/* # 1. 공통 페이지 래퍼 */
export default function PageContainer({
  children,
  topPadding = 24,
  bottomPadding = 40,
}: Props) {
  return (
    <main className="suddak-shell">
      <div
        className="suddak-container"
        style={{
          paddingTop: `${topPadding}px`,
          paddingBottom: `${bottomPadding}px`,
        }}
      >
        {children}
      </div>
    </main>
  );
}