"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MoreMenu from "@/components/MoreMenu";

type MyProfile = {
  id: string;
  email: string;
  full_name: string;
  grade: string;
  profile_name: string;
  avatar_url: string | null;
  bio: string;
  guestbook_open: boolean;
};

export default function MyProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [guestbookOpen, setGuestbookOpen] = useState(true);

  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadMyProfile = async () => {
      setLoading(true);
      setMessage("");

      try {
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
          setMessage(data?.error || "프로필을 불러오지 못했어.");
          return;
        }

        setProfile(data.profile);
        setProfileName(data.profile.profile_name || "");
        setAvatarUrl(data.profile.avatar_url || "");
        setBio(data.profile.bio || "");
        setGuestbookOpen(Boolean(data.profile.guestbook_open));
      } catch {
        setMessage("프로필을 불러오지 못했어.");
      } finally {
        setLoading(false);
      }
    };

    loadMyProfile();
  }, [mounted]);

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
        setMessage("이미지 업로드에 실패했어.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-avatars").getPublicUrl(path);

      setAvatarUrl(publicUrl);
      setMessage("프로필 사진 업로드 완료.");
    } catch {
      setMessage("이미지 업로드 중 오류가 발생했어.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("로그인 후 저장할 수 있어.");
        return;
      }

      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          profile_name: profileName,
          avatar_url: avatarUrl || null,
          bio,
          guestbook_open: guestbookOpen,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "프로필 저장에 실패했어.");
        return;
      }

      setMessage("프로필 저장 완료.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_name: profileName,
              avatar_url: avatarUrl || null,
              bio,
              guestbook_open: guestbookOpen,
            }
          : prev
      );
    } catch {
      setMessage("프로필 저장 중 오류가 발생했어.");
    } finally {
      setSaving(false);
    }
  };

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
                Community Profile · 프로필 수정
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

      {message && (
        <div
          className="suddak-card"
          style={{
            padding: "14px 16px",
            marginBottom: "18px",
            borderColor: "var(--success-border)",
            background: "var(--success-soft)",
            fontWeight: 700,
            lineHeight: 1.7,
          }}
        >
          {message}
        </div>
      )}

      <SectionCard
        title="프로필 설정"
        description="커뮤니티에서 보일 프로필네임, 사진, 소개글, 방명록 공개 여부를 설정할 수 있어."
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
          <div style={{ display: "grid", gap: "18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 160px) 1fr",
                gap: "16px",
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
                      {profileName?.[0] || "수"}
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
                  <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "8px" }}>
                    커뮤니티 프로필네임
                  </div>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    maxLength={20}
                    placeholder="예: 수딱고수"
                    className="suddak-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "8px" }}>
                    소개글
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    placeholder="간단한 소개를 적어줘."
                    className="suddak-input"
                    style={{ width: "100%", minHeight: "110px", resize: "vertical" }}
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
                  방명록 열기
                </label>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="suddak-btn suddak-btn-primary"
                  >
                    {saving ? "저장 중..." : "프로필 저장"}
                  </button>

                  <Link href={`/profile/${profile.id}`} className="suddak-btn suddak-btn-ghost">
                    공개 프로필 보기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}