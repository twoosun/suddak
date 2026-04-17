"use client";

import { useRef, useState } from "react";

type Props = {
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
};

/* # 1. 업로드 드롭존 */
export default function FileDropzone({
  previewUrl,
  onFileSelect,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file?: File | null) => {
    if (!file || disabled) return;
    onFileSelect(file);
  };

  return (
    <div
      className={`suddak-card-soft home-dropzone ${dragging ? "suddak-dropzone-active" : ""}`}
      style={{
        padding: "18px",
        borderStyle: "dashed",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* # 2. 안내 문구 */}
      <div className="home-dropzone-content">
        <div
          style={{
            fontSize: "18px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          문제 사진 업로드
        </div>

        <div
          style={{
            color: "var(--muted)",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          클릭하거나 이미지를 끌어다 놓아 업로드해.  
          모바일에서는 사진 선택 또는 촬영으로 바로 넣을 수 있어.
        </div>

        <div className="home-dropzone-cta">
          <button
            type="button"
            className="suddak-btn suddak-btn-primary"
            style={{
              width: "min(100%, 320px)",
            }}
          >
            사진 업로드하기
          </button>
        </div>
      </div>

      {/* # 3. 미리보기 */}
      {previewUrl && (
        <div className="home-dropzone-preview">
          <img
            src={previewUrl}
            alt="문제 미리보기"
            style={{
              display: "block",
              width: "100%",
              maxHeight: "420px",
              objectFit: "contain",
              background: "var(--card)",
            }}
          />
        </div>
      )}
    </div>
  );
}
