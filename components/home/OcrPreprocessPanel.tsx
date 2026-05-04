"use client";

import type { OcrPreprocessOptions } from "@/lib/ocr-preprocess";

type Props = {
  value: OcrPreprocessOptions;
  onChange: (next: OcrPreprocessOptions) => void;
};

const options: Array<{ key: keyof OcrPreprocessOptions; label: string }> = [
  { key: "grayscale", label: "흑백 변환" },
  { key: "increaseContrast", label: "대비 향상" },
  { key: "sharpen", label: "선명도 강화" },
  { key: "threshold", label: "강한 이진화" },
  { key: "deskewHint", label: "기울기 보정 힌트" },
];

export default function OcrPreprocessPanel({ value, onChange }: Props) {
  const update = (key: keyof OcrPreprocessOptions, checked: boolean) => {
    onChange({
      ...value,
      [key]: checked,
    });
  };

  return (
    <div className="questi-ocr-options">
      {options.map((option) => (
        <label key={option.key} className="questi-ocr-option">
          <input
            type="checkbox"
            checked={Boolean(value[option.key])}
            onChange={(event) => update(option.key, event.target.checked)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
