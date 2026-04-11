"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function ApprovalGate({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAllowed(false);
        setMessage("로그인 후 이용할 수 있습니다.");
        setLoading(false);
        return;
      }

      setAllowed(true);
      setLoading(false);
    };

    check();
  }, []);

  if (loading) {
    return <p style={{ color: "#6b7280" }}>확인 중...</p>;
  }

  if (!allowed) {
    return (
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#fff",
          color: "#374151",
        }}
      >
        {message}
      </div>
    );
  }

  return <>{children}</>;
}
