"use client";

import { RotateCcw, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getSessionWithRecovery } from "@/lib/supabase";

type FormulaHelperModalProps = {
  open: boolean;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

const quickTemplates = [
  { label: "분수", value: "\\frac{□}{□}" },
  { label: "루트", value: "\\sqrt{□}" },
  { label: "제곱", value: "□^2" },
  { label: "지수", value: "□^{□}" },
  { label: "괄호", value: "(□)" },
  { label: "절댓값", value: "|□|" },
  { label: "π", value: "\\pi" },
  { label: "sin", value: "\\sin □" },
  { label: "cos", value: "\\cos □" },
  { label: "tan", value: "\\tan □" },
  { label: "log", value: "\\log_{□} □" },
  { label: "ln", value: "\\ln □" },
  { label: "<", value: "<" },
  { label: ">", value: ">" },
  { label: "≤", value: "\\le" },
  { label: "≥", value: "\\ge" },
];

export default function FormulaHelperModal({
  open,
  initialValue = "",
  onClose,
  onConfirm,
}: FormulaHelperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const snapshotsRef = useRef<ImageData[]>([]);
  const [result, setResult] = useState(initialValue);
  const [hasInk, setHasInk] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111827";
    contextRef.current = ctx;
    snapshotsRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setResult(initialValue);
    setMessage("");
    setHasInk(false);
  }, [initialValue, open]);

  if (!open) return null;

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    const point = getPoint(event);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = contextRef.current;
    if (!ctx || !drawingRef.current) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasInk(true);
  };

  const stopDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;
    snapshotsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (snapshotsRef.current.length > 16) snapshotsRef.current.shift();
  };

  const insertTemplate = (template: string) => {
    setResult((current) => `${current}${current ? " " : ""}${template}`);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    snapshotsRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHasInk(false);
  };

  const undoCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx || snapshotsRef.current.length <= 1) return;
    snapshotsRef.current.pop();
    const previous = snapshotsRef.current[snapshotsRef.current.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHasInk(snapshotsRef.current.length > 1);
  };

  const recognizeInk = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) {
      setMessage("손글씨 수식을 먼저 적어주세요.");
      return;
    }

    setRecognizing(true);
    setMessage("");

    try {
      const currentSession = await getSessionWithRecovery();
      if (!currentSession?.access_token) {
        setMessage("로그인하면 손글씨 수식 인식을 사용할 수 있어요.");
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
      });

      if (!blob) {
        setMessage("캔버스 이미지를 만들지 못했어요. 다시 시도해주세요.");
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "formula.png");

      const res = await fetch("/api/formula-recognize", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "손글씨 수식 인식에 실패했어요.");
        return;
      }

      const latex = String(data?.latex || "").trim();
      if (!latex) {
        setMessage("인식된 수식이 비어 있어요. 조금 더 크게 써보세요.");
        return;
      }

      setResult((current) => `${current}${current ? " " : ""}${latex}`);
      setMessage("수식을 인식했어요. 필요하면 아래에서 다듬어주세요.");
    } catch {
      setMessage("손글씨 수식 인식 중 오류가 발생했어요.");
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <div className="formula-helper-backdrop" role="dialog" aria-modal="true" aria-label="수식 수정 도우미">
      <div className="formula-helper-modal">
        <div className="formula-helper-head">
          <div>
            <h2>수식 수정 도우미</h2>
            <p>수식을 손으로 쓰거나 아래 버튼을 눌러 입력하세요.</p>
          </div>
          <button type="button" className="formula-helper-icon-button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="formula-helper-canvas"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />

        <div className="formula-helper-row">
          <button
            type="button"
            className="questi-tool-button"
            onClick={() => void recognizeInk()}
            disabled={recognizing || !hasInk}
          >
            {recognizing ? "인식 중" : "인식하기"}
          </button>
          <button type="button" className="questi-tool-button" onClick={undoCanvas}>
            <Undo2 size={16} />되돌리기
          </button>
          <button type="button" className="questi-tool-button" onClick={clearCanvas}>
            <RotateCcw size={16} />초기화
          </button>
        </div>

        {message ? <div className="questi-notice">{message}</div> : null}

        <div>
          <div className="formula-helper-title">자주 쓰는 수식</div>
          <div className="formula-helper-quick-grid">
            {quickTemplates.map((item) => (
              <button key={item.label} type="button" onClick={() => insertTemplate(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="formula-helper-result">
          <span>인식 결과</span>
          <textarea
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="손글씨를 입력하면 잠시 후 자동으로 인식됩니다."
          />
        </label>

        <div className="formula-helper-actions">
          <button type="button" className="questi-tool-button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="questi-solve-button" onClick={() => onConfirm(result.trim())}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
