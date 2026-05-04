"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSessionWithRecovery, supabase } from "@/lib/supabase";

type RewardType = "daily" | "friday_double" | "saturday_weekly";

type DailyRewardStatus = {
  canClaim: boolean;
  claimedToday: boolean;
  credits: number;
  rewardAmount: number;
  rewardType: RewardType;
  label: string;
};

type Props = {
  isDark: boolean;
};

export default function CurrencyRewardPopup({ isDark }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [message, setMessage] = useState("");

  const theme = useMemo(
    () => ({
      buttonBg: isDark ? "#0f172a" : "#ffffff",
      buttonBorder: isDark ? "#334155" : "#d1d5db",
      buttonText: isDark ? "#f8fafc" : "#111827",
      menuBg: isDark ? "#111827" : "#ffffff",
      menuBorder: isDark ? "#253041" : "#e5e7eb",
      muted: isDark ? "#94a3b8" : "#6b7280",
      shadow: isDark
        ? "0 18px 40px rgba(0,0,0,0.38)"
        : "0 18px 40px rgba(15,23,42,0.14)",
      badgeBg: "#ef4444",
      rewardBg: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.10)",
      rewardBorder: isDark ? "rgba(167,139,250,0.34)" : "rgba(139,92,246,0.24)",
    }),
    [isDark],
  );

  const loadRewardStatus = async () => {
    try {
      setLoading(true);

      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        setStatus(null);
        setMessage("");
        return;
      }

      const res = await fetch("/api/daily-reward", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const data = (await res.json()) as DailyRewardStatus | { error?: string };

      if (!res.ok) {
        setStatus(null);
        setMessage("error" in data && typeof data.error === "string" ? data.error : "");
        return;
      }

      setStatus(data as DailyRewardStatus);
    } catch {
      setStatus(null);
      setMessage("리워드 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRewardStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadRewardStatus();
    });

    const rewardInterval = window.setInterval(() => {
      void loadRewardStatus();
    }, 30000);

    const handleOutside = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      subscription.unsubscribe();
      window.clearInterval(rewardInterval);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const handleClaimReward = async () => {
    try {
      setClaiming(true);
      setMessage("");

      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        setStatus(null);
        setMessage("로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/daily-reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = (await res.json()) as
        | {
            ok: true;
            credits: number;
            amount: number;
            rewardType: RewardType;
            label: string;
          }
        | (DailyRewardStatus & { ok?: false; error?: string });

      if (!res.ok) {
        if (res.status === 409) {
          const conflictData = data as DailyRewardStatus;
          setStatus({
            canClaim: false,
            claimedToday: true,
            credits: conflictData.credits,
            rewardAmount: conflictData.rewardAmount,
            rewardType: conflictData.rewardType,
            label: conflictData.label,
          });
          setMessage("오늘 리워드를 이미 받았어요.");
          return;
        }

        setMessage(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "리워드 지급에 실패했습니다.",
        );
        return;
      }

      const successData = data as {
        ok: true;
        credits: number;
        amount: number;
        rewardType: RewardType;
        label: string;
      };
      setStatus({
        canClaim: false,
        claimedToday: true,
        credits: successData.credits,
        rewardAmount: successData.amount,
        rewardType: successData.rewardType,
        label: successData.label,
      });
      setMessage("오늘의 리워드를 받았어요.");
    } catch {
      setMessage("리워드 지급 중 오류가 발생했습니다.");
    } finally {
      setClaiming(false);
    }
  };

  const buttonLabel = status
    ? status.claimedToday
      ? "오늘 수령 완료"
      : `${status.rewardAmount.toLocaleString("ko-KR")}딱 받기`
    : loading
      ? "리워드 확인 중"
      : "리워드 확인";

  return (
    <div ref={boxRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);

          if (!open) {
            void loadRewardStatus();
          }
        }}
        aria-label="재화"
        style={{
          width: "42px",
          height: "42px",
          minWidth: "42px",
          borderRadius: "12px",
          border: `1px solid ${theme.buttonBorder}`,
          backgroundColor: theme.buttonBg,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src="/currency-reward.png"
          alt=""
          aria-hidden="true"
          style={{
            width: "30px",
            height: "30px",
            objectFit: "contain",
            display: "block",
          }}
        />

        {status?.canClaim && (
          <span
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: theme.badgeBg,
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: isMobileViewport ? "fixed" : "absolute",
            top: isMobileViewport ? "76px" : "calc(100% + 10px)",
            right: isMobileViewport ? "12px" : 0,
            left: isMobileViewport ? "12px" : "auto",
            width: isMobileViewport ? "auto" : "min(340px, calc(100vw - 24px))",
            maxWidth: isMobileViewport ? "none" : "calc(100vw - 24px)",
            backgroundColor: theme.menuBg,
            border: `1px solid ${theme.menuBorder}`,
            borderRadius: "18px",
            boxShadow: theme.shadow,
            zIndex: 1100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px",
              borderBottom: `1px solid ${theme.menuBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: "15px", color: theme.buttonText }}>
                재화
              </div>
              <div style={{ fontSize: "12px", color: theme.muted, marginTop: "2px" }}>
                오늘의 리워드와 보유 딱
              </div>
            </div>
            <img
              src="/currency-reward.png"
              alt=""
              aria-hidden="true"
              style={{ width: "34px", height: "34px", objectFit: "contain" }}
            />
          </div>

          <div style={{ padding: "12px", display: "grid", gap: "10px" }}>
            {status ? (
              <>
                <div
                  style={{
                    border: `1px solid ${theme.rewardBorder}`,
                    background: theme.rewardBg,
                    borderRadius: "14px",
                    padding: "12px",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "14px", color: theme.buttonText }}>
                        오늘의 리워드
                      </div>
                      <div style={{ fontSize: "12px", color: theme.muted, marginTop: "3px" }}>
                        보유 {status.credits.toLocaleString("ko-KR")}딱
                      </div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: "28px",
                        padding: "0 10px",
                        borderRadius: "999px",
                        border: `1px solid ${theme.menuBorder}`,
                        fontSize: "12px",
                        fontWeight: 800,
                        color: theme.buttonText,
                        background: isDark ? "rgba(15,23,42,0.55)" : "#ffffff",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: theme.muted, lineHeight: 1.6 }}>
                    {status.claimedToday
                      ? "오늘 리워드를 받았어요."
                      : `지금 ${status.rewardAmount.toLocaleString("ko-KR")}딱을 받을 수 있어요.`}
                  </div>
                </div>

                {message && (
                  <div style={{ fontSize: "12px", color: theme.muted, lineHeight: 1.6 }}>
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleClaimReward()}
                  disabled={loading || claiming || !status.canClaim}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "12px",
                    minHeight: "40px",
                    background: status.canClaim && !claiming ? "#8b5cf6" : theme.buttonBorder,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 900,
                    cursor: loading || claiming || !status.canClaim ? "default" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {claiming ? "지급 중.." : buttonLabel}
                </button>
              </>
            ) : (
              <div
                style={{
                  padding: "16px",
                  border: `1px solid ${theme.menuBorder}`,
                  borderRadius: "14px",
                  color: theme.muted,
                  fontSize: "13px",
                  lineHeight: 1.7,
                }}
              >
                {loading ? "리워드 확인 중.." : message || "로그인하고 오늘의 리워드를 받아보세요."}
                {!loading && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      marginTop: "10px",
                      textAlign: "center",
                      textDecoration: "none",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      background: "#8b5cf6",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 900,
                    }}
                  >
                    로그인하러 가기
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
