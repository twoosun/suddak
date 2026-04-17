"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  avatar_url: string | null;
  bio: string;
  guestbook_open: boolean;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "정보 없음";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default function MyProfilePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [bio, setBio] = useState("");
  const [guestbookOpen, setGuestbookOpen] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");

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

        if (!session?.access_token) {
          setMessage("로그인 후 이용할 수 있어.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/profile/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data?.error || "프로필 정보를 불러오지 못했어.");
          return;
        }

        const nextProfile = data.profile as ProfileRow;
        setProfile(nextProfile);
        setNickname(nextProfile.full_name || "");
        setGrade(nextProfile.grade || "");
        setAvatarUrl(nextProfile.avatar_url || "");
        setBio(nextProfile.bio || "");
        setGuestbookOpen(Boolean(nextProfile.guestbook_open));
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

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setMessage("로그인 후 업로드할 수 있어.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setMessage("이미지 파일만 업로드할 수 있어.");
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        setMessage("프로필 사진은 3MB 이하로 올려줘.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, {
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error(uploadError);
        setMessage("이미지 업로드에 실패했어.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-avatars").getPublicUrl(path);

      setAvatarUrl(publicUrl);
      setMessage("프로필 사진 업로드 완료.");
    } catch (error) {
      console.error(error);
      setMessage("이미지 업로드 중 오류가 발생했어.");
    } finally {
      setUploading(false);
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
          avatar_url: avatarUrl,
          bio: bio.trim(),
          guestbook_open: guestbookOpen,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "회원정보 수정에 실패했어.");
        return;
      }

      setMessage("프로필을 수정했어.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: nickname.trim(),
              grade: grade.trim(),
              avatar_url: avatarUrl || null,
              bio: bio.trim(),
              guestbook_open: guestbookOpen,
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
                Profile Settings · 프로필 설정
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
        title="프로필 관리"
        description="가입 닉네임, 프로필 사진, 소개글, 방명록 허용 여부를 관리할 수 있어."
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
          <form onSubmit={handleSave} style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 150px) 1fr",
                gap: "18px",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "24px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--card-soft)",
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="프로필 사진"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "34px",
                        fontWeight: 900,
                        color: "var(--muted)",
                      }}
                    >
                      {(nickname || "수")[0]}
                    </div>
                  )}
                </div>

                <label
                  className="suddak-btn suddak-btn-ghost"
                  style={{ marginTop: "12px", display: "inline-flex", cursor: "pointer" }}
                >
                  {uploading ? "업로드 중..." : "사진 업로드"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
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
                  <label style={styles.inputLabel}>소개글</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    placeholder="간단한 소개를 적어줘."
                    style={{
                      ...styles.input,
                      minHeight: "110px",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--muted)" }}>
                    {bio.length}/300
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={guestbookOpen}
                    onChange={(e) => setGuestbookOpen(e.target.checked)}
                  />
                  방명록 허용
                </label>

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

                <div>
                  <label style={styles.inputLabel}>가입 일자</label>
                  <input
                    value={formatDate(profile.created_at)}
                    disabled
                    style={{
                      ...styles.input,
                      opacity: 0.72,
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="submit"
                className="suddak-btn suddak-btn-primary"
                disabled={saving || nicknameChecking || uploading}
              >
                {saving ? "저장 중..." : "저장"}
              </button>

              <Link href={`/profile/${profile.id}`} className="suddak-btn suddak-btn-ghost">
                공개 프로필 보기
              </Link>
            </div>
          </form>
        )}
      </SectionCard>
    </PageContainer>
  );
}