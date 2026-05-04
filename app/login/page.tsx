"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { getSessionWithRecovery, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileRenderKey, setTurnstileRenderKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    setIsDark(saved === "dark");
  }, []);

  useEffect(() => {
    setTurnstileRenderKey((prev) => prev + 1);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);

    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next ? "dark" : "light");
    }
  };

  const resetTurnstile = () => {
    setCaptchaToken("");
    setTurnstileRenderKey((prev) => prev + 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setMessage("");

    if (!email.trim()) {
      setMessage("이메일을 입력해 줘.");
      return;
    }

    if (!password.trim()) {
      setMessage("비밀번호를 입력해 줘.");
      return;
    }

    if (!captchaToken) {
      setMessage("CAPTCHA 확인을 먼저 완료해 줘.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: {
          captchaToken,
        },
      });

      if (error) {
        setMessage(error.message || "로그인에 실패했어.");
        resetTurnstile();
        return;
      }

      const recoveredSession = await getSessionWithRecovery();

      if (!recoveredSession?.access_token) {
        setMessage("로그인은 성공했지만 세션을 복구하지 못했어. 한 번만 다시 시도해 줘.");
        resetTurnstile();
        return;
      }

      setMessage("로그인 성공! 바로 홈으로 이동할게.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("로그인 중 오류가 발생했어.");
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const styles = useMemo(() => {
    return {
      page: {
        minHeight: "100vh",
        background: isDark ? "#111111" : "#f7f5ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      } as React.CSSProperties,

      card: {
        width: "100%",
        maxWidth: "460px",
        background: isDark ? "#181818" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#ddd6fe"}`,
        borderRadius: "8px",
        padding: "28px 20px",
        boxShadow: isDark
          ? "0 16px 40px rgba(0,0,0,0.35)"
          : "0 16px 40px rgba(0,0,0,0.08)",
      } as React.CSSProperties,

      top: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "18px",
      } as React.CSSProperties,

      title: {
        fontSize: "28px",
        fontWeight: 900,
        color: isDark ? "#f9fafb" : "#111827",
        marginBottom: "6px",
      } as React.CSSProperties,

      desc: {
        fontSize: "15px",
        lineHeight: 1.7,
        color: isDark ? "#cbd5e1" : "#475569",
      } as React.CSSProperties,

      themeBtn: {
        minHeight: "42px",
        padding: "10px 14px",
        borderRadius: "14px",
        border: `1px solid ${isDark ? "#4b5563" : "#d1d5db"}`,
        background: isDark ? "#1f1f1f" : "#ffffff",
        color: isDark ? "#f9fafb" : "#111827",
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
      } as React.CSSProperties,

      input: {
        width: "100%",
        height: "54px",
        borderRadius: "14px",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "#ddd6fe"}`,
        background: isDark ? "#101010" : "#fbfaff",
        color: isDark ? "#f9fafb" : "#111827",
        padding: "0 16px",
        fontSize: "16px",
        outline: "none",
        marginBottom: "10px",
      } as React.CSSProperties,

      captchaWrap: {
        minHeight: "78px",
        borderRadius: "14px",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "#ddd6fe"}`,
        background: isDark ? "#101010" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        marginTop: "8px",
        marginBottom: "10px",
        overflow: "hidden",
      } as React.CSSProperties,

      submit: {
        width: "100%",
        height: "52px",
        borderRadius: "999px",
        border: "none",
        background: "#8b5cf6",
        color: "#ffffff",
        fontSize: "18px",
        fontWeight: 800,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.72 : 1,
        boxShadow: "0 12px 26px rgba(139, 92, 246, 0.24)",
      } as React.CSSProperties,

      message: {
        marginTop: "12px",
        color:
          message.includes("성공") || message.includes("이동")
            ? isDark
              ? "#86efac"
              : "#166534"
            : isDark
            ? "#fca5a5"
            : "#b91c1c",
        fontSize: "14px",
        lineHeight: 1.6,
        minHeight: "22px",
      } as React.CSSProperties,

      bottomLink: {
        display: "inline-block",
        marginTop: "18px",
        color: isDark ? "#c4b5fd" : "#7c3aed",
        fontSize: "15px",
        textDecoration: "none",
      } as React.CSSProperties,

      warning: {
        marginTop: "8px",
        color: isDark ? "#fca5a5" : "#b91c1c",
        fontSize: "13px",
        lineHeight: 1.6,
      } as React.CSSProperties,
    };
  }, [isDark, loading, message]);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>로그인</div>
            <div style={styles.desc}>
              수딱 계정으로 로그인해. CAPTCHA가 보이지 않으면 광고 차단기나 개인정보 보호
              확장 프로그램을 잠시 끄고 다시 시도해 줘.
            </div>
          </div>

          <button type="button" onClick={toggleTheme} style={styles.themeBtn}>
            {isDark ? "주간모드" : "야간모드"}
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
          />

          {siteKey ? (
            <div style={styles.captchaWrap}>
              <Turnstile
                key={turnstileRenderKey}
                siteKey={siteKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken("")}
                onError={() => {
                  setCaptchaToken("");
                  setMessage("CAPTCHA 인증 중 오류가 발생했어. 다시 시도해 줘.");
                }}
                options={{
                  theme: isDark ? "dark" : "light",
                  language: "ko",
                }}
              />
            </div>
          ) : (
            <div style={styles.warning}>
              TURNSTILE 사이트 키가 설정되지 않았어. 환경 변수를 먼저 확인해 줘.
            </div>
          )}

          <button type="submit" disabled={loading || !siteKey} style={styles.submit}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={styles.message}>{message}</div>

        <Link href="/signup" style={styles.bottomLink}>
          아직 계정이 없다면 회원가입으로 이동
        </Link>
      </div>
    </main>
  );
}
