"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import SectionCard from "@/components/common/SectionCard";
import {
  SIMILAR_PROBLEM_COST,
  getDailyRewardByKstDate,
  type RewardType,
} from "@/lib/rewards";
import { getSessionWithRecovery, supabase } from "@/lib/supabase";

type DailyRewardStatus = {
  canClaim: boolean;
  claimedToday: boolean;
  credits: number;
  rewardAmount: number;
  rewardType: RewardType;
  label: string;
};

type ClaimRewardResponse = {
  ok: boolean;
  credits: number;
  amount: number;
  rewardType: RewardType;
  label: string;
};

function isRewardType(value: unknown): value is RewardType {
  return value === "daily" || value === "friday_double" || value === "saturday_weekly";
}

function parseRewardStatus(data: Record<string, unknown>): DailyRewardStatus {
  return {
    canClaim: Boolean(data.canClaim),
    claimedToday: Boolean(data.claimedToday),
    credits: Number(data.credits ?? 0),
    rewardAmount: Number(data.rewardAmount ?? 0),
    rewardType: isRewardType(data.rewardType) ? data.rewardType : "daily",
    label: typeof data.label === "string" ? data.label : "오늘의 리워드",
  };
}

function formatCredits(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function DailyRewardCard() {
  const previewReward = useMemo(() => getDailyRewardByKstDate(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const nextSession = await getSessionWithRecovery();

      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setAuthLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setStatus(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadRewardStatus = async () => {
      try {
        setLoading(true);
        setMessage("");

        const activeSession = await getSessionWithRecovery();

        if (!activeSession?.access_token) {
          if (isMounted) {
            setSession(null);
            setStatus(null);
          }
          return;
        }

        const res = await fetch("/api/daily-reward", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${activeSession.access_token}`,
          },
        });
        const data = (await res.json()) as Record<string, unknown>;

        if (!isMounted) {
          return;
        }

        if (!res.ok) {
          setStatus(null);
          setMessage(
            typeof data.error === "string" ? data.error : "리워드 상태를 불러오지 못했습니다.",
          );
          return;
        }

        setStatus(parseRewardStatus(data));
      } catch {
        if (!isMounted) {
          return;
        }

        setStatus(null);
        setMessage("리워드 상태를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadRewardStatus();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleClaim = async () => {
    if (!session?.access_token || claiming) {
      return;
    }

    try {
      setClaiming(true);
      setMessage("");

      const activeSession = await getSessionWithRecovery();

      if (!activeSession?.access_token) {
        setSession(null);
        setMessage("로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/daily-reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        if (res.status === 409) {
          setStatus(parseRewardStatus(data));
          setMessage("오늘 리워드를 이미 받았어요.");
          return;
        }

        setMessage(typeof data.error === "string" ? data.error : "리워드 지급에 실패했습니다.");
        return;
      }

      const successData = data as Partial<ClaimRewardResponse>;
      setStatus({
        canClaim: false,
        claimedToday: true,
        credits: Number(successData.credits ?? 0),
        rewardAmount: Number(successData.amount ?? 0),
        rewardType: isRewardType(successData.rewardType) ? successData.rewardType : "daily",
        label: typeof successData.label === "string" ? successData.label : "오늘의 리워드",
      });
      setMessage("오늘의 리워드를 받았어요.");
    } catch {
      setMessage("리워드 지급 중 오류가 발생했습니다.");
    } finally {
      setClaiming(false);
    }
  };

  const currentReward = status ?? {
    canClaim: false,
    claimedToday: false,
    credits: 0,
    rewardAmount: previewReward.amount,
    rewardType: previewReward.rewardType,
    label: previewReward.label,
  };

  const buttonLabel = currentReward.claimedToday
    ? "오늘 수령 완료"
    : `${formatCredits(currentReward.rewardAmount)}딱 받기`;

  const rewardHint =
    currentReward.rewardType === "friday_double"
      ? "금요일에는 2배 리워드가 지급돼요."
      : currentReward.rewardType === "saturday_weekly"
        ? "토요일에는 2배 + 주간 리워드가 지급돼요."
        : "매일 접속하고 유사문제 생성에 사용할 딱을 받아보세요.";

  return (
    <SectionCard
      title="오늘의 리워드"
      description="매일 접속하고 유사문제 생성에 사용할 딱을 받아보세요."
      rightSlot={<span className="suddak-badge">{currentReward.label}</span>}
    >
      <div style={{ display: "grid", gap: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          <div className="suddak-card-soft" style={{ padding: "16px" }}>
            <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 800 }}>
              보유 딱
            </div>
            <div style={{ marginTop: "8px", fontSize: "1.9rem", fontWeight: 950 }}>
              {authLoading && !session ? "-" : `${formatCredits(currentReward.credits)}딱`}
            </div>
          </div>

          <div className="suddak-card-soft" style={{ padding: "16px" }}>
            <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 800 }}>
              유사문제 1회
            </div>
            <div style={{ marginTop: "8px", fontSize: "1.15rem", fontWeight: 900 }}>
              {formatCredits(SIMILAR_PROBLEM_COST)}딱
            </div>
          </div>
        </div>

        <div
          className="suddak-card-soft"
          style={{
            padding: "14px 16px",
            lineHeight: 1.7,
            color: "var(--muted)",
            background:
              currentReward.rewardType === "daily"
                ? "var(--soft)"
                : "color-mix(in srgb, var(--primary) 8%, var(--soft))",
          }}
        >
          {rewardHint}
        </div>

        {!session ? (
          <div className="suddak-card-soft" style={{ padding: "16px", display: "grid", gap: "12px" }}>
            <div style={{ lineHeight: 1.7 }}>로그인하고 오늘의 리워드를 받아보세요.</div>
            <Link href="/login" className="suddak-btn suddak-btn-primary">
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <>
            {currentReward.claimedToday ? (
              <div
                className="suddak-card-soft"
                style={{
                  padding: "14px 16px",
                  borderColor: "var(--success-border)",
                  background: "var(--success-soft)",
                  fontWeight: 800,
                  lineHeight: 1.7,
                }}
              >
                오늘 리워드를 받았어요.
              </div>
            ) : null}

            {message ? (
              <div
                className="suddak-card-soft"
                style={{
                  padding: "14px 16px",
                  lineHeight: 1.7,
                  borderColor: message.includes("오류") ? "#ef4444" : "var(--border)",
                  background: message.includes("오류")
                    ? "color-mix(in srgb, #ef4444 10%, var(--card))"
                    : "var(--soft)",
                }}
              >
                {message}
              </div>
            ) : null}

            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={() => void handleClaim()}
              disabled={authLoading || loading || claiming || !currentReward.canClaim}
            >
              {claiming ? "리워드 지급 중.." : buttonLabel}
            </button>
          </>
        )}
      </div>
    </SectionCard>
  );
}
