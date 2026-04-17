"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  previewUrl: string | null;
  onFileSelect: (file: File, source: "upload" | "camera") => void;
  disabled?: boolean;
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
}: Props) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const draftImageRef = useRef<HTMLImageElement | null>(null);

  const [dragging, setDragging] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftSource, setDraftSource] = useState<"upload" | "camera">("upload");
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [selection, setSelection] = useState<CropSelection | null>(null);
  const [draftSelection, setDraftSelection] = useState<CropSelection | null>(null);
  const [pointerStart, setPointerStart] = useState<{ x: number; y: number } | null>(null);

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
    setDraftSource("upload");
    setDraftPreviewUrl(null);
    setCropping(false);
    setSelection(null);
    setDraftSelection(null);
    setPointerStart(null);
  };

  const loadDraftFile = (file?: File | null, source: "upload" | "camera" = "upload") => {
    if (!file || disabled) return;

    if (draftPreviewUrl) {
      URL.revokeObjectURL(draftPreviewUrl);
    }

    setDraftFile(file);
    setDraftSource(source);
    setDraftPreviewUrl(URL.createObjectURL(file));
    setSelection(null);
    setDraftSelection(null);
    setPointerStart(null);
  };

  const getRelativePoint = (clientX: number, clientY: number) => {
    const image = draftImageRef.current;
    if (!image) return null;

    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !draftFile) return;

    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;

    setPointerStart(point);
    setDraftSelection({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
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
    if (!draftSelection) {
      setPointerStart(null);
      return;
    }

    if (draftSelection.width < 2 || draftSelection.height < 2) {
      setSelection(null);
    } else {
      setSelection(draftSelection);
    }

    setDraftSelection(null);
    setPointerStart(null);
  };

  const createCroppedFile = async (file: File) => {
    if (!selection) {
      return file;
    }

    const bitmap = await createImageBitmap(file);
    const sourceX = Math.max(0, Math.round((bitmap.width * selection.x) / 100));
    const sourceY = Math.max(0, Math.round((bitmap.height * selection.y) / 100));
    const sourceWidth = Math.max(40, Math.round((bitmap.width * selection.width) / 100));
    const sourceHeight = Math.max(40, Math.round((bitmap.height * selection.height) / 100));

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
    onFileSelect(draftFile, draftSource);
    resetDraft();
  };

  const handleApplyCrop = async () => {
    if (!draftFile || cropping || !selection) return;

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
      className={`suddak-card-soft home-dropzone ${dragging ? "suddak-dropzone-active" : ""}`}
      style={{
        padding: "18px",
        borderStyle: "dashed",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={() => {
        if (!disabled && !draftFile) uploadInputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        loadDraftFile(e.dataTransfer.files?.[0], "upload");
      }}
    >
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => loadDraftFile(e.target.files?.[0], "upload")}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => loadDraftFile(e.target.files?.[0], "camera")}
      />

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
            onClick={(e) => {
              e.stopPropagation();
              uploadInputRef.current?.click();
            }}
            style={{
              width: "min(100%, 320px)",
            }}
          >
            사진 업로드
          </button>

          <button
            type="button"
            className="suddak-btn suddak-btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            style={{
              width: "min(100%, 320px)",
            }}
          >
            바로 촬영
          </button>
        </div>
      </div>

      {draftPreviewUrl && draftFile ? (
        <div className="home-crop-panel" onClick={(e) => e.stopPropagation()}>
          <div className="home-crop-guide">
            사진 위를 손가락이나 마우스로 직접 드래그해서 문제 영역을 잡아줘.
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
              ref={draftImageRef}
              src={draftPreviewUrl}
              alt="자르기 미리보기"
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
              disabled={cropping || !selection}
            >
              {cropping ? "자르는 중.." : "자르고 사용"}
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
