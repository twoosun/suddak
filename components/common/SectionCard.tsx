"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  rightSlot?: ReactNode;
};

/* # 1. 공통 카드 */
export default function SectionCard({
  title,
  description,
  children,
  style,
  bodyStyle,
  rightSlot,
}: Props) {
  return (
    <section
      className="suddak-card"
      style={{
        padding: "20px",
        ...style,
      }}
    >
      {(title || description || rightSlot) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && (
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                }}
              >
                {title}
              </div>
            )}
            {description && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "14px",
                  color: "var(--muted)",
                  lineHeight: 1.6,
                }}
              >
                {description}
              </div>
            )}
          </div>

          {rightSlot}
        </div>
      )}

      <div style={bodyStyle}>{children}</div>
    </section>
  );
}