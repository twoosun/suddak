"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSessionWithRecovery, supabase } from "@/lib/supabase";

type NotificationItem = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  body: string;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
};

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

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function NotificationBellPopup({ isDark }: Props) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardClaiming, setRewardClaiming] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<DailyRewardStatus | null>(null);
  const [rewardMessage, setRewardMessage] = useState("");

  const theme = useMemo(
    () => ({
      buttonBg: isDark ? "#0f172a" : "#ffffff",
      buttonBorder: isDark ? "#334155" : "#d1d5db",
      buttonText: isDark ? "#f8fafc" : "#111827",
      menuBg: isDark ? "#111827" : "#ffffff",
      menuBorder: isDark ? "#253041" : "#e5e7eb",
      itemHover: isDark ? "#1f2937" : "#f3f4f6",
      muted: isDark ? "#94a3b8" : "#6b7280",
      shadow: isDark
        ? "0 18px 40px rgba(0,0,0,0.38)"
        : "0 18px 40px rgba(15,23,42,0.14)",
      unreadBg: "rgba(59,130,246,0.10)",
      unreadBorder: "rgba(59,130,246,0.28)",
      badgeBg: "#ef4444",
      badgeText: "#ffffff",
      rewardBg: isDark ? "rgba(96,165,250,0.12)" : "rgba(49,87,200,0.08)",
      rewardBorder: isDark ? "rgba(96,165,250,0.28)" : "rgba(49,87,200,0.16)",
    }),
    [isDark],
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);

      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        setItems([]);
        setUnreadCount(0);
        return;
      }

      const res = await fetch("/api/notifications?limit=8", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) return;

      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unread_count || 0));
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadRewardStatus = async () => {
    try {
      setRewardLoading(true);

      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        setRewardStatus(null);
        setRewardMessage("");
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
        setRewardStatus(null);
        setRewardMessage("error" in data && typeof data.error === "string" ? data.error : "");
        return;
      }

      setRewardStatus(data as DailyRewardStatus);
    } catch {
      setRewardStatus(null);
    } finally {
      setRewardLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
    void loadRewardStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadNotifications();
      void loadRewardStatus();
    });

    const notificationInterval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
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
      window.clearInterval(notificationInterval);
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

  const markOneAsRead = async (notificationId: string) => {
    try {
      const session = await getSessionWithRecovery();

      if (!session?.access_token) return;

      await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notificationId,
        }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      const session = await getSessionWithRecovery();

      if (!session?.access_token) return;

      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          markAll: true,
        }),
      });

      if (!res.ok) return;

      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleOpenItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markOneAsRead(item.id);
    }

    setOpen(false);

    if (item.target_url) {
      router.push(item.target_url);
    }
  };

  const handleClaimReward = async () => {
    try {
      setRewardClaiming(true);
      setRewardMessage("");

      const session = await getSessionWithRecovery();

      if (!session?.access_token) {
        setRewardStatus(null);
        setRewardMessage("로그인이 필요합니다.");
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
          setRewardStatus({
            canClaim: false,
            claimedToday: true,
            credits: conflictData.credits,
            rewardAmount: conflictData.rewardAmount,
            rewardType: conflictData.rewardType,
            label: conflictData.label,
          });
          setRewardMessage("오늘 리워드를 이미 받았어요.");
          return;
        }

        setRewardMessage(
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
      setRewardStatus({
        canClaim: false,
        claimedToday: true,
        credits: successData.credits,
        rewardAmount: successData.amount,
        rewardType: successData.rewardType,
        label: successData.label,
      });
      setRewardMessage("오늘의 리워드를 받았어요.");
    } catch {
      setRewardMessage("리워드 지급 중 오류가 발생했습니다.");
    } finally {
      setRewardClaiming(false);
    }
  };

  const showAlertDot = unreadCount > 0 || Boolean(rewardStatus?.canClaim);
  const rewardButtonLabel = rewardStatus
    ? rewardStatus.claimedToday
      ? "오늘 수령 완료"
      : `${rewardStatus.rewardAmount.toLocaleString("ko-KR")}딱 받기`
    : "리워드 확인 중";

  return (
    <div ref={boxRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);

          if (!open) {
            void loadNotifications();
            void loadRewardStatus();
          }
        }}
        aria-label="알림"
        style={{
          width: "42px",
          height: "42px",
          minWidth: "42px",
          borderRadius: "12px",
          border: `1px solid ${theme.buttonBorder}`,
          backgroundColor: theme.buttonBg,
          color: theme.buttonText,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          position: "relative",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>

        {showAlertDot && (
          <>
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
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  minWidth: "19px",
                  height: "19px",
                  padding: "0 5px",
                  borderRadius: "999px",
                  background: theme.badgeBg,
                  color: theme.badgeText,
                  fontSize: "10px",
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: isMobileViewport ? "fixed" : "absolute",
            top: isMobileViewport ? "76px" : "calc(100% + 10px)",
            right: isMobileViewport ? "12px" : 0,
            left: isMobileViewport ? "12px" : "auto",
            width: isMobileViewport ? "auto" : "min(360px, calc(100vw - 24px))",
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
              padding: "14px 14px 10px",
              borderBottom: `1px solid ${theme.menuBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: "15px", color: theme.buttonText }}>
                알림
              </div>
              <div style={{ fontSize: "12px", color: theme.muted, marginTop: "2px" }}>
                읽지 않은 알림 {unreadCount}개{rewardStatus?.canClaim ? " · 오늘 리워드 가능" : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              style={{
                border: `1px solid ${theme.menuBorder}`,
                background: "transparent",
                color: theme.buttonText,
                borderRadius: "10px",
                padding: "8px 10px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: unreadCount === 0 ? "default" : "pointer",
                opacity: unreadCount === 0 ? 0.5 : 1,
              }}
            >
              전체 읽음
            </button>
          </div>

          <div style={{ maxHeight: "420px", overflowY: "auto", padding: "8px" }}>
            {rewardStatus && (
              <div
                style={{
                  marginBottom: "8px",
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
                      보유 딱 {rewardStatus.credits.toLocaleString("ko-KR")}딱
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
                    {rewardStatus.label}
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: theme.muted, lineHeight: 1.6 }}>
                  {rewardStatus.claimedToday
                    ? "오늘 리워드를 받았어요."
                    : `지금 ${rewardStatus.rewardAmount.toLocaleString("ko-KR")}딱을 받을 수 있어요.`}
                </div>

                {rewardMessage && (
                  <div style={{ fontSize: "12px", color: theme.muted, lineHeight: 1.6 }}>
                    {rewardMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleClaimReward()}
                  disabled={rewardLoading || rewardClaiming || !rewardStatus.canClaim}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "12px",
                    minHeight: "40px",
                    background:
                      rewardStatus.canClaim && !rewardClaiming ? "#ef4444" : theme.buttonBorder,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 900,
                    cursor:
                      rewardLoading || rewardClaiming || !rewardStatus.canClaim
                        ? "default"
                        : "pointer",
                    opacity: rewardLoading ? 0.7 : 1,
                  }}
                >
                  {rewardClaiming ? "지급 중.." : rewardButtonLabel}
                </button>
              </div>
            )}

            {loading ? (
              <div
                style={{
                  padding: "18px 14px",
                  color: theme.muted,
                  fontSize: "14px",
                }}
              >
                불러오는 중..
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  padding: "18px 14px",
                  color: theme.muted,
                  fontSize: "14px",
                }}
              >
                아직 알림이 없어요.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleOpenItem(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.itemHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = item.is_read
                        ? "transparent"
                        : theme.unreadBg;
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: item.is_read
                        ? `1px solid ${theme.menuBorder}`
                        : `1px solid ${theme.unreadBorder}`,
                      background: item.is_read ? "transparent" : theme.unreadBg,
                      color: theme.buttonText,
                      borderRadius: "14px",
                      padding: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "6px",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: "14px" }}>{item.title}</div>
                      <div style={{ fontSize: "11px", color: theme.muted, flexShrink: 0 }}>
                        {formatDate(item.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.6,
                        color: theme.muted,
                      }}
                    >
                      {item.body}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "10px",
              borderTop: `1px solid ${theme.menuBorder}`,
            }}
          >
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                textDecoration: "none",
                border: `1px solid ${theme.menuBorder}`,
                color: theme.buttonText,
                borderRadius: "12px",
                padding: "10px 12px",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              알림 전체 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
