"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import SuddakCommunityHeader from "@/components/suddak-community-header";
import { getStoredTheme } from "@/lib/theme";

type CommunityPost = {
  id: string;
  user_id: string;
  post_type: "free" | "problem";
  history_id: number | null;
  title: string;
  content: string;
  recognized_text: string | null;
  solve_result: string | null;
  image_url: string | null;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
};

type CommunityResponse = {
  posts: CommunityPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getPreviewText(post: CommunityPost) {
  if (post.post_type === "problem") {
    return post.recognized_text || post.content || "";
  }
  return post.content || "";
}

function PreviewMarkdown({
  children,
  isDark,
}: {
  children: string;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        maxHeight: "88px",
        overflow: "hidden",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {children}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"all" | "free" | "problem">("all");
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  const theme = useMemo(
    () => ({
      bg: isDark
        ? "linear-gradient(180deg, #0b1220 0%, #111827 50%, #0f172a 100%)"
        : "linear-gradient(180deg, #f8faff 0%, #f4f6fb 50%, #f7f8fc 100%)",
      card: isDark ? "#111827" : "#ffffff",
      cardBorder: isDark ? "#253041" : "#e5e7eb",
      text: isDark ? "#f9fafb" : "#111827",
      subText: isDark ? "#cbd5e1" : "#6b7280",
      softCard: isDark ? "#0f172a" : "#ffffff",
      inputBg: isDark ? "#0b1220" : "#ffffff",
      inputBorder: isDark ? "#374151" : "#d1d5db",
      shadow: isDark
        ? "0 8px 30px rgba(0, 0, 0, 0.35)"
        : "0 8px 30px rgba(15, 23, 42, 0.05)",
      primary: "#3157c8",
    }),
    [isDark]
  );

  const fetchPosts = async (type: "all" | "free" | "problem", keyword: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "20");

      if (type !== "all") params.set("postType", type);
      if (keyword.trim()) params.set("search", keyword.trim());

      const res = await fetch(`/api/community?${params.toString()}`, {
        cache: "no-store",
      });

      const data: CommunityResponse = await res.json();
      setPosts(data.posts ?? []);
    } catch (error) {
      console.error(error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(selectedType, search);
  }, [selectedType, search]);

  const emptyText = useMemo(() => {
    if (search.trim()) return "검색 결과가 없습니다.";
    if (selectedType === "free") return "자유 게시글이 아직 없습니다.";
    if (selectedType === "problem") return "문제 게시글이 아직 없습니다.";
    return "아직 게시글이 없습니다.";
  }, [search, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputValue);
  };

  if (!mounted) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <SuddakCommunityHeader current="community" />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "18px 12px 40px",
        }}
      >
        <section
          className="community-hero-grid"
          style={{
            marginBottom: "18px",
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)",
          }}
        >
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "22px",
              padding: "20px",
              boxShadow: theme.shadow,
            }}
          >
            <div
              style={{
                display: "inline-block",
                marginBottom: "10px",
                padding: "6px 12px",
                borderRadius: "999px",
                backgroundColor: isDark ? "#1e3a8a" : "#e8eefc",
                color: isDark ? "#dbeafe" : "#3157c8",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              Suddak Community
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(24px, 5.5vw, 46px)",
                fontWeight: 900,
                letterSpacing: "-0.05em",
                lineHeight: 1.14,
              }}
            >
              문제도 공유하고,
              <br />
              풀이 생각도 나눠보자.
            </h1>

            <p
              style={{
                marginTop: "14px",
                marginBottom: 0,
                fontSize: "14px",
                lineHeight: 1.7,
                color: theme.subText,
              }}
            >
              자유글과 문제글을 한곳에서 보고, 댓글과 대댓글로 풀이 관점을 나눌 수 있어.
            </p>
          </div>

          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: "22px",
              padding: "16px",
              boxShadow: theme.shadow,
            }}
          >
            <Link
              href="/community/write"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                height: "100%",
                minHeight: "128px",
                borderRadius: "18px",
                padding: "20px",
                background: "linear-gradient(135deg, #3157c8 0%, #60a5fa 100%)",
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                +
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>새 글 작성</div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  자유글, 문제글, 풀이 공유 시작하기
                </div>
              </div>
            </Link>
          </div>
        </section>

        <div
          style={{
            marginBottom: "14px",
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: "22px",
            padding: "14px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["all", "free", "problem"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 800,
                  backgroundColor: selectedType === type ? theme.primary : isDark ? "#0f172a" : "#f3f4f6",
                  color: selectedType === type ? "#ffffff" : theme.text,
                }}
              >
                {type === "all" ? "전체" : type === "free" ? "자유글" : "문제글"}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="community-search-form"
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="제목, 내용, 인식된 문제 검색"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "13px 15px",
                borderRadius: "14px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "13px 16px",
                borderRadius: "14px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.softCard,
                color: theme.text,
                fontSize: "14px",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              검색
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {loading ? (
            <div
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: "22px",
                padding: "20px",
                color: theme.subText,
                boxShadow: theme.shadow,
              }}
            >
              불러오는 중...
            </div>
          ) : posts.length === 0 ? (
            <div
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: "22px",
                padding: "20px",
                color: theme.subText,
                boxShadow: theme.shadow,
              }}
            >
              {emptyText}
            </div>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                style={{
                  textDecoration: "none",
                  display: "block",
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: "22px",
                  padding: "16px",
                  boxShadow: theme.shadow,
                  color: theme.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 800,
                      backgroundColor:
                        post.post_type === "problem"
                          ? isDark
                            ? "#052e16"
                            : "#dcfce7"
                          : isDark
                          ? "#082f49"
                          : "#e0f2fe",
                      color:
                        post.post_type === "problem"
                          ? isDark
                            ? "#86efac"
                            : "#15803d"
                          : isDark
                          ? "#7dd3fc"
                          : "#0369a1",
                    }}
                  >
                    {post.post_type === "problem" ? "문제글" : "자유글"}
                  </span>
                  <span style={{ fontSize: "12px", color: theme.subText }}>
                    {formatDate(post.created_at)}
                  </span>
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(19px, 4.6vw, 24px)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.28,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {post.title}
                </h2>

                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "12px",
                    color: theme.subText,
                  }}
                >
                  작성자 {post.author_name ?? "익명"}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    color: theme.subText,
                    fontSize: "14px",
                  }}
                >
                  <PreviewMarkdown isDark={isDark}>{getPreviewText(post)}</PreviewMarkdown>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    display: "flex",
                    gap: "14px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: theme.subText,
                  }}
                >
                  <span>좋아요 {post.like_count}</span>
                  <span>댓글 {post.comment_count}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .community-hero-grid {
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        }

        .community-search-form {
          flex-direction: row;
        }

        @media (max-width: 820px) {
          .community-hero-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .community-search-form {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}