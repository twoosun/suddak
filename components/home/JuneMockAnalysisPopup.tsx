"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, X } from "lucide-react";

import {
  JUNE_MOCK_ANALYSIS_ENABLED,
  JUNE_MOCK_ANALYSIS_URL,
  JUNE_MOCK_POPUP_SESSION_KEY,
  JUNE_MOCK_POPUP_STORAGE_KEY,
} from "@/lib/juneMockAnalysis";

function getNextLocalMidnightTimestamp() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  return String(nextMidnight.getTime());
}

export default function JuneMockAnalysisPopup() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeForSession = useCallback(() => {
    try {
      sessionStorage.setItem(JUNE_MOCK_POPUP_SESSION_KEY, "true");
    } catch {}

    setOpen(false);
  }, []);

  useEffect(() => {
    if (!JUNE_MOCK_ANALYSIS_ENABLED) return;

    try {
      const hiddenUntil = Number(localStorage.getItem(JUNE_MOCK_POPUP_STORAGE_KEY) ?? 0);
      const closedInSession = sessionStorage.getItem(JUNE_MOCK_POPUP_SESSION_KEY) === "true";

      if (hiddenUntil > Date.now() || closedInSession) return;
    } catch {}

    const timer = window.setTimeout(() => setOpen(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeForSession();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeForSession, open]);

  const hideUntilTomorrow = () => {
    try {
      localStorage.setItem(JUNE_MOCK_POPUP_STORAGE_KEY, getNextLocalMidnightTimestamp());
      sessionStorage.setItem(JUNE_MOCK_POPUP_SESSION_KEY, "true");
    } catch {}

    setOpen(false);
  };

  if (!JUNE_MOCK_ANALYSIS_ENABLED || !open) return null;

  return (
    <div className="june-mock-popup-backdrop" onMouseDown={closeForSession}>
      <section
        className="june-mock-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="june-mock-popup-title"
        aria-describedby="june-mock-popup-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="june-mock-popup-close"
          onClick={closeForSession}
          aria-label="팝업 닫기"
        >
          <X size={18} />
        </button>

        <div className="june-mock-popup-icon" aria-hidden="true">
          <BarChart3 size={28} />
        </div>
        <span className="june-mock-popup-badge">6평 특집</span>
        <h2 id="june-mock-popup-title">2027학년도 6평 분석이 올라왔어요!</h2>
        <p id="june-mock-popup-description">
          공통 22번을 비롯한 주요 문항의 핵심 아이디어를 정리했어요.
          문항별 유사문제로 바로 복습해 보세요.
        </p>

        <div className="june-mock-popup-actions">
          <Link href={JUNE_MOCK_ANALYSIS_URL} className="june-mock-popup-primary">
            주요 문항 분석 보기
          </Link>
          <button type="button" className="june-mock-popup-secondary" onClick={closeForSession}>
            닫기
          </button>
        </div>

        <button type="button" className="june-mock-popup-hide" onClick={hideUntilTomorrow}>
          오늘 하루 보지 않기
        </button>
      </section>
    </div>
  );
}
