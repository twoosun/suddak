"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MoreMenu from "@/components/MoreMenu";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  grade: string | null;
};

export default function MyProfilePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nicknameChecking, setNicknameChecking] = useState(false);

  const [message, setMessage] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");

  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setMessage("로그인 후 이용할 수 있어.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, grade")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error || !data) {
          setMessage("프로필 정보를 불러오지 못했어.");
          return;
        }

        setProfile(data);
        setNickname(data.full_name || "");
        setGrade(data.grade || "");
      } catch (error) {
        console.error(error);
        setMessage("프로필 정보를 불러오지 못했어.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [mounted]);

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
          excludeUserId: profile?.id || "",
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setMessage("");

    if (!nickname.trim()) {
      setMessage("닉네임을 입력해줘.");
      return;
    }

    if (!grade.trim()) {
      setMessage("학년 정보를 입력해줘.");
      return;
    }

    if (nicknameStatus.includes("이미 사용 중")) {
      setMessage("다른 닉네임을 입력해줘.");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("로그인 정보가 필요해.");
        return;
      }

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          grade: grade.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "회원정보 수정에 실패했어.");
        return;
      }

      setMessage("회원정보를 수정했어.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: nickname.trim(),
              grade: grade.trim(),
            }
          : prev
      );

      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("회원정보 수정 중 오류가 발생했어.");
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => {
    return {
      message: {
        padding: "14px 16px",
        marginBottom: "18px",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        background: "var(--card)",
        fontWeight: 700,
        lineHeight: 1.7,
      } as React.CSSProperties,

      inputLabel: {
        fontSize: "13px",
        fontWeight: 800,
        marginBottom: "8px",
        display: "block",
      } as React.CSSProperties,

      input: {
        width: "100%",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--foreground)",
        padding: "13px 14px",
        fontSize: "15px",
        outline: "none",
      } as React.CSSProperties,

      hint: {
        marginTop: "8px",
        fontSize: "12px",
        fontWeight: 700,
        color: nicknameStatus.includes("사용 가능")
          ? "#16a34a"
          : nicknameStatus.includes("이미 사용 중")
          ? "#dc2626"
          : "var(--muted)",
      } as React.CSSProperties,
    };
  }, [nicknameStatus]);

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
      <header
        className="suddak-card"
        style={{
          position: "sticky",
          top: 14,
          zIndex: 20,
          padding: "14px 16px",
          marginBottom: "18px",
          background: "var(--header-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "15px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--card)",
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="수딱 로고"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: "clamp(1.55rem, 4vw, 2.3rem)",
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  lineHeight: 0.95,
                }}
              >
                내 프로필
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                Nickname Settings · 닉네임 관리
              </div>
            </div>
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              width: "min(100%, 420px)",
              marginLeft: "auto",
            }}
          >
            <Link href="/" className="suddak-btn suddak-btn-ghost">
              홈
            </Link>
            <Link href="/community" className="suddak-btn suddak-btn-ghost">
              커뮤니티
            </Link>
            {profile?.id && (
              <Link href={`/profile/${profile.id}`} className="suddak-btn suddak-btn-ghost">
                공개 프로필
              </Link>
            )}
            <div style={{ minWidth: "120px", flex: "1 1 120px" }}>
              <ThemeToggleButton mobileFull={false} />
            </div>
            <MoreMenu
              isDark={isDark}
              onToggleTheme={() => setIsDark(getStoredTheme() === "dark")}
              themeLabel={isDark ? "주간모드" : "야간모드"}
              redirectAfterLogout="/login"
            />
          </div>
        </div>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <SectionCard
        title="닉네임 관리"
        description="가입할 때 쓴 닉네임이 커뮤니티와 프로필에 동일하게 표시돼. 여기서 바꾸면 전체에 반영돼."
      >
        {loading ? (
          <div className="suddak-card-soft" style={{ padding: "18px" }}>
            불러오는 중...
          </div>
        ) : !profile ? (
          <div className="suddak-card-soft" style={{ padding: "18px" }}>
            로그인 후 이용할 수 있어.
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "grid", gap: "16px" }}>
            <div>
              <label style={styles.inputLabel}>닉네임</label>
              <input
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameStatus("");
                }}
                onBlur={() => checkNickname(nickname)}
                maxLength={20}
                placeholder="닉네임"
                style={styles.input}
                autoComplete="nickname"
              />
              <div style={styles.hint}>
                {nicknameChecking ? "닉네임 확인 중..." : nicknameStatus}
              </div>
            </div>

            <div>
              <label style={styles.inputLabel}>학년 정보</label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="예: 고1, 고2, 고3"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.inputLabel}>이메일</label>
              <input
                value={profile.email || ""}
                disabled
                style={{
                  ...styles.input,
                  opacity: 0.72,
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                className="suddak-btn suddak-btn-primary"
                disabled={saving || nicknameChecking}
              >
                {saving ? "저장 중..." : "저장"}
              </button>

              <Link
                href={`/profile/${profile.id}`}
                className="suddak-btn suddak-btn-ghost"
              >
                공개 프로필 보기
              </Link>
            </div>
          </form>
        )}
      </SectionCard>
    </PageContainer>
  );
}