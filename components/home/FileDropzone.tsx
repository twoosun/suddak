"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  previewUrl: string | null;
  onFileSelect: (file: File, source: "upload" | "camera") => void;
  disabled?: boolean;
  compact?: boolean;
};

type CropSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function FileDropzone({
  previewUrl,
  onFileSelect,
  disabled = false,
  compact = false,
}: Props) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [dragging, setDragging] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftSource, setDraftSource] = useState<"upload" | "camera">("upload");
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<CropSelection | null>(null);
  const [draftSelection, setDraftSelection] = useState<CropSelection | null>(null);
  const [pointerStart, setPointerStart] = useState<{ x: number; y: number } | null>(null);
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    return () => {
      if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
    };
  }, [draftPreviewUrl]);

  const resetDraft = () => {
    if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
    setDraftFile(null);
    setDraftSource("upload");
    setDraftPreviewUrl(null);
    setSelection(null);
    setDraftSelection(null);
    setPointerStart(null);
    setCropping(false);
  };

  const loadDraftFile = (file?: File | null, source: "upload" | "camera" = "upload") => {
    if (!file || disabled) return;

    if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);

    setDraftFile(file);
    setDraftSource(source);
    setDraftPreviewUrl(URL.createObjectURL(file));
    setSelection(null);
    setDraftSelection(null);
    setPointerStart(null);
  };

  const getRelativePoint = (clientX: number, clientY: number) => {
    const image = imageRef.current;
    if (!image) return null;

    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !draftFile) return;
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;

    setPointerStart(point);
    setDraftSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart) return;
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;

    setDraftSelection({
      x: Math.min(pointerStart.x, point.x),
      y: Math.min(pointerStart.y, point.y),
      width: Math.abs(point.x - pointerStart.x),
      height: Math.abs(point.y - pointerStart.y),
    });
  };

  const finalizeSelection = () => {
    if (draftSelection && draftSelection.width >= 2 && draftSelection.height >= 2) {
      setSelection(draftSelection);
    }
    setDraftSelection(null);
    setPointerStart(null);
  };

  const createCroppedFile = async (file: File) => {
    if (!selection) return file;

    const bitmap = await createImageBitmap(file);
    const sourceX = Math.max(0, Math.round((bitmap.width * selection.x) / 100));
    const sourceY = Math.max(0, Math.round((bitmap.height * selection.y) / 100));
    const sourceWidth = Math.max(40, Math.round((bitmap.width * selection.width) / 100));
    const sourceHeight = Math.max(40, Math.round((bitmap.height * selection.height) / 100));

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 자를 수 없어요.");

    ctx.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    const outputType = file.type || "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.95),
    );

    if (!blob) throw new Error("잘라낸 이미지를 만들 수 없어요.");

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  };

  const useOriginal = () => {
    if (!draftFile) return;
    onFileSelect(draftFile, draftSource);
    resetDraft();
  };

  const applyCrop = async () => {
    if (!draftFile || !selection || cropping) return;

    try {
      setCropping(true);
      const croppedFile = await createCroppedFile(draftFile);
      onFileSelect(croppedFile, draftSource);
      resetDraft();
    } finally {
      setCropping(false);
    }
  };

  const activeSelection = draftSelection ?? selection;

  return (
    <div
      className={`suddak-card-soft home-dropzone ${compact ? "home-dropzone-compact" : ""} ${
        dragging ? "suddak-dropzone-active" : ""
      }`}
      style={{
        padding: "18px",
        borderStyle: "dashed",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={() => {
        if (!disabled && !draftFile) uploadInputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        loadDraftFile(event.dataTransfer.files?.[0], "upload");
      }}
    >
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => loadDraftFile(event.target.files?.[0], "upload")}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => loadDraftFile(event.target.files?.[0], "camera")}
      />

      {!draftPreviewUrl && (
        <div className={`home-dropzone-content ${compact ? "home-dropzone-content-compact" : ""}`}>
          <div style={{ fontSize: "18px", fontWeight: 900 }}>문제 사진 업로드 또는 바로 촬영</div>
          {!compact && (
            <>
              <div className="home-dropzone-inline-badge">사진을 올린 뒤 문제 영역만 자를 수 있어요</div>
              <div style={{ color: "var(--muted)", fontSize: "14px", lineHeight: 1.7 }}>
                클릭하거나 이미지를 끌어다 놓으세요. 모바일에서는 촬영 버튼으로 바로 찍을 수 있어요.
              </div>
            </>
          )}
          {compact && (
            <div style={{ color: "#71717a", fontSize: "14px", lineHeight: 1.6 }}>
              궁금한 문제 사진을 올리거나 파일을 끌어오세요.
            </div>
          )}
          <div className="home-dropzone-cta">
            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={(event) => {
                event.stopPropagation();
                uploadInputRef.current?.click();
              }}
              style={{ width: "min(100%, 280px)" }}
            >
              사진 업로드
            </button>
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={(event) => {
                event.stopPropagation();
                cameraInputRef.current?.click();
              }}
              style={{ width: "min(100%, 280px)" }}
            >
              바로 촬영
            </button>
          </div>
        </div>
      )}

      {draftPreviewUrl && draftFile ? (
        <div className="home-crop-panel" onClick={(event) => event.stopPropagation()}>
          <div className="home-crop-guide">
            이미지에서 문제 부분을 드래그해 선택하세요. 자르지 않고 원본 그대로 사용할 수도 있어요.
          </div>

          <div
            className="home-dropzone-preview home-dropzone-preview-crop"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finalizeSelection}
            onPointerCancel={finalizeSelection}
            onPointerLeave={finalizeSelection}
          >
            <img
              ref={imageRef}
              src={draftPreviewUrl}
              alt="자를 영역 미리보기"
              draggable={false}
              style={{
                display: "block",
                width: "100%",
                maxHeight: "420px",
                objectFit: "contain",
                background: "var(--card)",
              }}
            />

            {activeSelection && (
              <div
                className="home-crop-selection"
                style={{
                  left: `${activeSelection.x}%`,
                  top: `${activeSelection.y}%`,
                  width: `${activeSelection.width}%`,
                  height: `${activeSelection.height}%`,
                }}
              />
            )}
          </div>

          <div className="home-crop-actions">
            <button type="button" className="suddak-btn suddak-btn-ghost" onClick={useOriginal} disabled={cropping}>
              원본 사용
            </button>
            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={applyCrop}
              disabled={cropping || !selection}
            >
              {cropping ? "자르는 중..." : "자르고 사용"}
            </button>
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={() => setSelection(null)}
              disabled={cropping || !selection}
            >
              선택 초기화
            </button>
            <button
              type="button"
              className="suddak-btn suddak-btn-ghost"
              onClick={() => uploadInputRef.current?.click()}
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
