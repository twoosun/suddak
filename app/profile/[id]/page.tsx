"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";

type CommunityPost = {
  id: number;
  title: string;
  content: string | null;
  post_type: "free" | "problem";
  recognized_text: string | null;
  solve_result: string | null;
  created_at: string;
  user_id: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
};

type PublicProfile = {
  id: string;
  full_name: string;
  grade: string;
  avatar_url: string | null;
  bio: string;
  guestbook_open: boolean;
  joined_at: string | null;
  stats: {
    total: number;
    free: number;
    problem: number;
  };
};

type GuestbookEntry = {
  id: string;
  profile_user_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar_url: string | null;
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
function clampText(text: string, max = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max) + "...";
}

export default function ProfilePage() {
  const params = useParams();
  const profileId = String(params?.id || "");

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [guestbooks, setGuestbooks] = useState<GuestbookEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [guestbookLoading, setGuestbookLoading] = useState(true);
  const [message, setMessage] = useState("불러오는 중...");
  const [guestbookMessage, setGuestbookMessage] = useState("");
  const [guestbookInput, setGuestbookInput] = useState("");
  const [submittingGuestbook, setSubmittingGuestbook] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !profileId) return;

    const init = async () => {
      setLoading(true);
      setGuestbookLoading(true);
      setMessage("불러오는 중...");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setMyUserId(session?.user?.id ?? null);

        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const [profileRes, guestbookRes] = await Promise.all([
          fetch(`/api/profile/${profileId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`/api/profile/${profileId}/guestbook`, {
            headers,
            cache: "no-store",
          }),
        ]);

        const profileData = await profileRes.json();
        const guestbookData = await guestbookRes.json();

        if (!profileRes.ok) {
          setProfile(null);
          setPosts([]);
          setMessage(profileData?.error || "프로필 정보를 불러오지 못했어.");
        } else {
          setProfile(profileData.profile);
          setPosts(Array.isArray(profileData.posts) ? profileData.posts : []);
          setMessage("");
        }

        if (!guestbookRes.ok) {
          setGuestbooks([]);
          setGuestbookMessage(guestbookData?.error || "방명록을 불러오지 못했어.");
        } else {
          setGuestbooks(Array.isArray(guestbookData.entries) ? guestbookData.entries : []);
          setGuestbookMessage(
            guestbookData?.guestbook_open === false
              ? "이 사용자는 방명록을 닫아두었어."
              : ""
          );
        }
      } catch {
        setMessage("프로필 정보를 불러오지 못했어.");
        setGuestbookMessage("방명록을 불러오지 못했어.");
      } finally {
        setLoading(false);
        setGuestbookLoading(false);
      }
    };

    init();
  }, [mounted, profileId]);

  const handleGuestbookSubmit = async () => {
    if (!guestbookInput.trim()) {
      setGuestbookMessage("방명록 내용을 입력해줘.");
      return;
    }

    try {
      setSubmittingGuestbook(true);
      setGuestbookMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setGuestbookMessage("로그인 후 방명록을 남길 수 있어.");
        return;
      }

      const res = await fetch(`/api/profile/${profileId}/guestbook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: guestbookInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGuestbookMessage(data?.error || "방명록 작성에 실패했어.");
        return;
      }

      setGuestbookInput("");
      setGuestbooks((prev) => [data.entry, ...prev]);
      setGuestbookMessage("방명록 작성 완료.");
    } catch {
      setGuestbookMessage("방명록 작성 중 오류가 발생했어.");
    } finally {
      setSubmittingGuestbook(false);
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
            href="/community"
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
                프로필
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                Community Profile · 공개 프로필
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
<NotificationBell />
            <Link href="/community" className="suddak-btn suddak-btn-ghost">
              커뮤니티
            </Link>
<NotificationBell />
            <Link href="/profile" className="suddak-btn suddak-btn-ghost">
              내 프로필
            </Link>
<NotificationBell />
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

      {loading ? (
        <div className="suddak-card" style={{ padding: "18px" }}>
          불러오는 중...
        </div>
      ) : !profile ? (
        <div className="suddak-card" style={{ padding: "18px" }}>
          {message || "프로필을 불러오지 못했어."}
        </div>
      ) : (
        <>
          <SectionCard
            title={profile.full_name}
            description={profile.bio || "아직 소개글이 없어."}
            style={{ marginBottom: "18px" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 160px) 1fr",
                gap: "18px",
                alignItems: "center",
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
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
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
                      {profile.full_name?.[0] || "수"}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                }}
              >
                <div className="suddak-card-soft" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>전체 게시글</div>
                  <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
                    {profile.stats.total}
                  </div>
                </div>

                <div className="suddak-card-soft" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>문제글</div>
                  <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
                    {profile.stats.problem}
                  </div>
                </div>


<div className="suddak-card-soft" style={{ padding: "14px" }}>
  <div style={{ fontSize: "12px", color: "var(--muted)" }}>가입일</div>
  <div style={{ fontSize: "18px", fontWeight: 900, marginTop: "8px", lineHeight: 1.5 }}>
    {formatDate(profile.joined_at)}
  </div>
</div>

                <div className="suddak-card-soft" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>자유글</div>
                  <div style={{ fontSize: "28px", fontWeight: 950, marginTop: "6px" }}>
                    {profile.stats.free}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="방명록"
            description="간단한 응원이나 한마디를 남길 수 있어."
            style={{ marginBottom: "18px" }}
          >
            {profile.guestbook_open ? (
              <>
                {myUserId && myUserId !== profile.id && (
                  <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
                    <textarea
                      value={guestbookInput}
                      onChange={(e) => setGuestbookInput(e.target.value)}
                      maxLength={300}
                      placeholder="방명록을 남겨봐."
                      className="suddak-input"
                      style={{ width: "100%", minHeight: "100px", resize: "vertical" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {guestbookInput.length}/300
                      </div>
                      <button
                        type="button"
                        onClick={handleGuestbookSubmit}
                        disabled={submittingGuestbook}
                        className="suddak-btn suddak-btn-primary"
                      >
                        {submittingGuestbook ? "작성 중..." : "방명록 남기기"}
                      </button>
                    </div>
                  </div>
                )}

                {guestbookMessage && (
                  <div
                    className="suddak-card-soft"
                    style={{ padding: "14px", marginBottom: "14px" }}
                  >
                    {guestbookMessage}
                  </div>
                )}

                {guestbookLoading ? (
                  <div className="suddak-card-soft" style={{ padding: "18px" }}>
                    방명록 불러오는 중...
                  </div>
                ) : guestbooks.length === 0 ? (
                  <div className="suddak-card-soft" style={{ padding: "18px" }}>
                    아직 방명록이 없어.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {guestbooks.map((entry) => (
                      <div key={entry.id} className="suddak-card-soft" style={{ padding: "14px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "999px",
                              overflow: "hidden",
                              border: "1px solid var(--border)",
                              background: "var(--card)",
                              flexShrink: 0,
                            }}
                          >
                            {entry.author_avatar_url ? (
                              <img
                                src={entry.author_avatar_url}
                                alt={entry.author_name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: "14px",
                                  fontWeight: 900,
                                  color: "var(--muted)",
                                }}
                              >
                                {entry.author_name?.[0] || "수"}
                              </div>
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800 }}>{entry.author_name}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                              {formatDate(entry.created_at)}
                            </div>
                          </div>
                        </div>

                        <div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                          {entry.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="suddak-card-soft" style={{ padding: "18px" }}>
                이 사용자는 방명록을 닫아두었어.
              </div>
            )}
          </SectionCard>

          <SectionCard title="작성글" description="이 사용자가 작성한 최근 게시글이야.">
            {posts.length === 0 ? (
              <div className="suddak-card-soft" style={{ padding: "18px" }}>
                아직 작성한 게시글이 없어.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="suddak-card-soft"
                    style={{
                      padding: "16px",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 900,
                            background:
                              post.post_type === "problem"
                                ? "rgba(37, 99, 235, 0.12)"
                                : "rgba(16, 185, 129, 0.12)",
                            color:
                              post.post_type === "problem"
                                ? "rgb(37, 99, 235)"
                                : "rgb(5, 150, 105)",
                          }}
                        >
                          {post.post_type === "problem" ? "문제글" : "자유글"}
                        </span>

                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {formatDate(post.created_at)}
                        </span>
                      </div>

                      <Link href={`/community/${post.id}`} className="suddak-btn suddak-btn-ghost">
                        게시글 보기
                      </Link>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "1.08rem",
                          fontWeight: 900,
                          lineHeight: 1.5,
                          marginBottom: "8px",
                        }}
                      >
                        {post.title}
                      </div>

                      {post.content && (
                        <div
                          style={{
                            lineHeight: 1.8,
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {clampText(post.content)}
                        </div>
                      )}
                    </div>

                    {post.post_type === "problem" && (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {post.recognized_text && (
                          <div>
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 900,
                                color: "var(--primary)",
                                marginBottom: "6px",
                              }}
                            >
                              인식된 문제
                            </div>
                            <div className="suddak-card" style={{ padding: "12px 14px" }}>
                              <MarkdownMathBlock
  content={clampText(post.recognized_text, 260)}
  isDark={isDark}
/>
                            </div>
                          </div>
                        )}

                        {post.solve_result && (
                          <div>
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 900,
                                color: "var(--primary)",
                                marginBottom: "6px",
                              }}
                            >
                              풀이 일부
                            </div>
                            <div className="suddak-card" style={{ padding: "12px 14px" }}>
                              <MarkdownMathBlock
  content={clampText(post.solve_result, 260)}
  isDark={isDark}
/>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}