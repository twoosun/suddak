"use client";

import { useEffect, useRef, useState } from "react";

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
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    return () => {
      if (draftPreviewUrl) {
        URL.revokeObjectURL(draftPreviewUrl);
      }
    };
  }, [draftPreviewUrl]);

  const resetDraft = () => {
    if (draftPreviewUrl) {
      URL.revokeObjectURL(draftPreviewUrl);
    }
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    setCropping(false);
  };

  const loadDraftFile = (file?: File | null) => {
    if (!file || disabled) return;

    if (draftPreviewUrl) {
      URL.revokeObjectURL(draftPreviewUrl);
    }

    setDraftFile(file);
    setDraftPreviewUrl(URL.createObjectURL(file));
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
  };

  const createCroppedFile = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;

    const leftPx = Math.round((width * cropLeft) / 100);
    const rightPx = Math.round((width * cropRight) / 100);
    const topPx = Math.round((height * cropTop) / 100);
    const bottomPx = Math.round((height * cropBottom) / 100);

    const sourceX = Math.max(0, leftPx);
    const sourceY = Math.max(0, topPx);
    const sourceWidth = Math.max(40, width - leftPx - rightPx);
    const sourceHeight = Math.max(40, height - topPx - bottomPx);

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("크롭용 캔버스를 만들지 못했습니다.");
    }

    ctx.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    const outputType = file.type || "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.95)
    );

    if (!blob) {
      throw new Error("자른 이미지를 만들지 못했습니다.");
    }

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  };

  const handleUseOriginal = () => {
    if (!draftFile) return;
    onFileSelect(draftFile);
    resetDraft();
  };

  const handleApplyCrop = async () => {
    if (!draftFile || cropping) return;

    try {
      setCropping(true);
      const croppedFile = await createCroppedFile(draftFile);
      onFileSelect(croppedFile);
      resetDraft();
    } finally {
      setCropping(false);
    }
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
        if (!disabled && !draftFile) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        loadDraftFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => loadDraftFile(e.target.files?.[0])}
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
          문제 사진 업로드 또는 바로 촬영
        </div>

        <div className="home-dropzone-inline-badge">
          모바일에서는 카메라로 바로 찍을 수 있어
        </div>

        <div
          style={{
            color: "var(--muted)",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          클릭하거나 이미지를 끌어다 놓아 업로드해.
          모바일에서는 버튼을 누르면 사진 보관함 대신 카메라 촬영으로 바로 들어갈 수 있어.
        </div>

        <div className="home-dropzone-cta">
          <button
            type="button"
            className="suddak-btn suddak-btn-primary"
            style={{
              width: "min(100%, 320px)",
            }}
          >
            사진 올리기 / 바로 촬영
          </button>
        </div>
      </div>

      {/* # 3. 미리보기 */}
      {draftPreviewUrl && draftFile ? (
        <div
          className="home-crop-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="home-dropzone-preview">
            <img
              src={draftPreviewUrl}
              alt="자르기 미리보기"
              style={{
                display: "block",
                width: "100%",
                maxHeight: "420px",
                objectFit: "contain",
                background: "var(--card)",
              }}
            />
          </div>

          <div className="home-crop-grid">
            <label className="home-crop-control">
              <span>위쪽 자르기 {cropTop}%</span>
              <input
                type="range"
                min="0"
                max="35"
                value={cropTop}
                onChange={(e) => setCropTop(Number(e.target.value))}
              />
            </label>

            <label className="home-crop-control">
              <span>아래쪽 자르기 {cropBottom}%</span>
              <input
                type="range"
                min="0"
                max="35"
                value={cropBottom}
                onChange={(e) => setCropBottom(Number(e.target.value))}
              />
            </label>

            <label className="home-crop-control">
              <span>왼쪽 자르기 {cropLeft}%</span>
              <input
                type="range"
                min="0"
                max="35"
                value={cropLeft}
                onChange={(e) => setCropLeft(Number(e.target.value))}
              />
            </label>

            <label className="home-crop-control">
              <span>오른쪽 자르기 {cropRight}%</span>
              <input
                type="range"
                min="0"
                max="35"
                value={cropRight}
                onChange={(e) => setCropRight(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="home-crop-actions">
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={handleUseOriginal}
              disabled={cropping}
            >
              원본 그대로 사용
            </button>

            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={handleApplyCrop}
              disabled={cropping}
            >
              {cropping ? "자르는 중.." : "자르고 사용"}
            </button>

            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={() => inputRef.current?.click()}
              disabled={cropping}
            >
              다른 사진 선택
            </button>
          </div>
        </div>
      ) : previewUrl ? (
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
      ) : null}
    </div>
  );
}
