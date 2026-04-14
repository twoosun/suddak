"use client";

import type { OcrPreprocessOptions } from "@/lib/ocr-preprocess";

type Props = {
  value: OcrPreprocessOptions;
  onChange: (next: OcrPreprocessOptions) => void;
};

/* # 1. OCR 전처리 설정 패널 */
export default function OcrPreprocessPanel({ value, onChange }: Props) {
  const update = <K extends keyof OcrPreprocessOptions>(
    key: K,
    checked: OcrPreprocessOptions[K]
  ) => {
    onChange({
      ...value,
      [key]: checked,
    });
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--soft)",
    fontSize: "14px",
    fontWeight: 700,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "10px",
      }}
    >
      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={value.grayscale}
          onChange={(e) => update("grayscale", e.target.checked)}
        />
        흑백화
      </label>

      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={value.increaseContrast}
          onChange={(e) => update("increaseContrast", e.target.checked)}
        />
        대비 향상
      </label>

      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={value.sharpen}
          onChange={(e) => update("sharpen", e.target.checked)}
        />
        선명도 강화
      </label>

      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={value.threshold}
          onChange={(e) => update("threshold", e.target.checked)}
        />
        강한 이진화
      </label>

      <label style={itemStyle}>
        <input
          type="checkbox"
          checked={value.deskewHint}
          onChange={(e) => update("deskewHint", e.target.checked)}
        />
        기울기 보정 힌트
      </label>
    </div>
  );
}