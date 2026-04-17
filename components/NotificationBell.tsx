"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (mounted) setUnreadCount(0);
          return;
        }

        const res = await fetch("/api/notifications?limit=1", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) return;
        if (mounted) setUnreadCount(Number(data.unread_count || 0));
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };

    loadUnreadCount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUnreadCount();
    });

    const interval = window.setInterval(loadUnreadCount, 30000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="suddak-btn suddak-btn-ghost"
      style={{
        position: "relative",
        minWidth: "46px",
        justifyContent: "center",
      }}
      aria-label="알림"
    >
      알림
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            minWidth: "20px",
            height: "20px",
            padding: "0 6px",
            borderRadius: "999px",
            background: "#ef4444",
            color: "#fff",
            fontSize: "11px",
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
    </Link>
  );
}