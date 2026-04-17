"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(false);

  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileRenderKey, setTurnstileRenderKey] = useState(0);

  const [nicknameStatus, setNicknameStatus] = useState("");
  const [nicknameChecking, setNicknameChecking] = useState(false);

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

  const checkNickname = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setNicknameStatus("");
      return;
    }

    try {
      setNicknameChecking(true);

      const res = await fetch("/api/profile/check-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setNicknameStatus(data?.error || "닉네임 확인에 실패했어.");
        return;
      }

      setNicknameStatus(data?.message || "");
    } catch (error) {
      console.error(error);
      setNicknameStatus("닉네임 확인 중 오류가 발생했어.");
    } finally {
      setNicknameChecking(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setMessage("");

    if (!nickname.trim()) {
      setMessage("닉네임을 입력해줘.");
      return;
    }

    if (nicknameStatus.includes("이미 사용 중")) {
      setMessage("다른 닉네임을 입력해줘.");
      return;
    }

    if (!grade.trim()) {
      setMessage("학년 정보를 입력해줘.");
      return;
    }

    if (!email.trim()) {
      setMessage("이메일을 입력해줘.");
      return;
    }

    if (!password.trim()) {
      setMessage("비밀번호를 입력해줘.");
      return;
    }

    if (!captchaToken.trim()) {
      setMessage("CAPTCHA 확인을 먼저 완료해줘.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nickname: nickname.trim(),
        grade: grade.trim(),
        email: email.trim(),
        password,
        captchaToken: captchaToken.trim(),
      };

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "회원가입에 실패했어.");
        resetTurnstile();
        return;
      }

      const loginResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: {
          captchaToken: captchaToken.trim(),
        },
      });

      if (loginResult.error) {
        setMessage(
          "회원가입은 완료됐지만 자동 로그인에 실패했어. 로그인 페이지에서 다시 로그인해줘."
        );
        router.push("/login");
        return;
      }

      setMessage("회원가입이 완료되었어. 잠시 후 이동할게.");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(error);
      setMessage("회원가입 중 오류가 발생했어.");
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
        background: isDark ? "#0f172a" : "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      } as React.CSSProperties,

      card: {
        width: "100%",
        maxWidth: "460px",
        background: isDark ? "#111827" : "#ffffff",
        border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
        borderRadius: "24px",
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
        background: isDark ? "#1f2937" : "#ffffff",
        color: isDark ? "#f9fafb" : "#111827",
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
      } as React.CSSProperties,

      notice: {
        marginTop: "14px",
        marginBottom: "14px",
        borderRadius: "16px",
        padding: "14px 16px",
        background: isDark ? "#172554" : "#eef2ff",
        border: `1px solid ${isDark ? "#3730a3" : "#c7d2fe"}`,
        color: isDark ? "#c7d2fe" : "#475569",
        fontSize: "14px",
        lineHeight: 1.7,
      } as React.CSSProperties,

      input: {
        width: "100%",
        height: "54px",
        borderRadius: "14px",
        border: `1px solid ${isDark ? "#4b5563" : "#cbd5e1"}`,
        background: isDark ? "#0f172a" : "#f8fafc",
        color: isDark ? "#f9fafb" : "#111827",
        padding: "0 16px",
        fontSize: "16px",
        outline: "none",
        marginBottom: "10px",
      } as React.CSSProperties,

      nicknameHint: {
        marginTop: "-2px",
        marginBottom: "10px",
        fontSize: "13px",
        minHeight: "18px",
        color: nicknameStatus.includes("사용 가능")
          ? isDark
            ? "#86efac"
            : "#166534"
          : isDark
          ? "#fca5a5"
          : "#b91c1c",
      } as React.CSSProperties,

      captchaWrap: {
        minHeight: "78px",
        borderRadius: "14px",
        border: `1px solid ${isDark ? "#4b5563" : "#d1d5db"}`,
        background: isDark ? "#0f172a" : "#ffffff",
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
        borderRadius: "14px",
        border: "none",
        background: "#3659c9",
        color: "#ffffff",
        fontSize: "18px",
        fontWeight: 800,
      } as React.CSSProperties,

      message: {
        marginTop: "12px",
        color:
          message.includes("완료") || message.includes("이동")
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
        color: isDark ? "#cbd5e1" : "#475569",
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
  }, [isDark, message, nicknameChecking, nicknameStatus]);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>통합회원가입</div>
            <div style={styles.desc}>
              CAPTCHA가 보이지 않으면 광고 차단기 또는 개인정보 보호 확장 프로그램을 잠시 끄고 다시 시도해 주세요.
              신규 계정은 초기 일일 풀이 한도가 낮게 적용되어요.
            </div>
          </div>

          <button type="button" onClick={toggleTheme} style={styles.themeBtn}>
            {isDark ? "주간모드" : "야간모드"}
          </button>
        </div>

        <div style={styles.notice}>
          같은 이메일로는 중복 가입할 수 없고, 닉네임 중복도 막혀 있어.
          CAPTCHA를 통과해야 가입이 완료돼.
        </div>

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameStatus("");
            }}
            onBlur={() => checkNickname(nickname)}
            style={styles.input}
            autoComplete="nickname"
          />

          <div style={styles.nicknameHint}>
            {nicknameChecking ? "닉네임 확인 중..." : nicknameStatus}
          </div>

          <input
            type="text"
            placeholder="학년 정보"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={styles.input}
            autoComplete="organization-title"
          />

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
            autoComplete="new-password"
          />

          <div style={styles.captchaWrap}>
            {siteKey ? (
              <Turnstile
                key={turnstileRenderKey}
                siteKey={siteKey}
                options={{
                  theme: isDark ? "dark" : "light",
                  size: "normal",
                }}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setMessage("");
                }}
                onExpire={() => {
                  setCaptchaToken("");
                  setMessage("CAPTCHA가 만료되었어. 다시 확인해줘.");
                }}
                onError={() => {
                  setCaptchaToken("");
                  setMessage("CAPTCHA를 불러오지 못했어. 새로고침 후 다시 시도해줘.");
                }}
              />
            ) : (
              <div style={styles.warning}>
                TURNSTILE SITE KEY가 설정되지 않았어.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !captchaToken ||
              nicknameChecking ||
              nicknameStatus.includes("이미 사용 중")
            }
            style={{
              ...styles.submit,
              opacity:
                loading ||
                !captchaToken ||
                nicknameChecking ||
                nicknameStatus.includes("이미 사용 중")
                  ? 0.65
                  : 1,
              cursor:
                loading ||
                !captchaToken ||
                nicknameChecking ||
                nicknameStatus.includes("이미 사용 중")
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "가입 중..."
              : !captchaToken
              ? "CAPTCHA 확인 필요"
              : nicknameChecking
              ? "닉네임 확인 중..."
              : nicknameStatus.includes("이미 사용 중")
              ? "다른 닉네임 필요"
              : "회원가입"}
          </button>
        </form>

        <div style={styles.message}>{message}</div>

        <Link href="/login" style={styles.bottomLink}>
          이미 계정이 있으면 로그인
        </Link>
      </div>
    </main>
  );
}