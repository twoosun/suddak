"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import SuddakCommunityHeader from "@/components/suddak-community-header";
import { getStoredTheme } from "@/lib/theme";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PostType = "free" | "problem";

function safeDecode(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function PreviewBox({
  title,
  value,
  isDark,
  theme,
}: {
  title: string;
  value: string;
  isDark: boolean;
  theme: {
    softCard: string;
    softBorder: string;
    subText: string;
    text: string;
  };
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1px solid ${theme.softBorder}`,
        backgroundColor: theme.softCard,
        padding: "16px",
      }}
    >
      <div
        style={{
          marginBottom: "10px",
          fontSize: "14px",
          fontWeight: 800,
          color: theme.text,
        }}
      >
        {title}
      </div>
      {value.trim() ? (
        <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <div style={{ fontSize: "14px", color: theme.subText }}>
          미리보기가 여기에 표시됩니다.
        </div>
      )}
    </div>
  );
}

export default function CommunityWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [postType, setPostType] = useState<PostType>("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [solveResult, setSolveResult] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [historyId, setHistoryId] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
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
      inputBg: isDark ? "#0b1220" : "#ffffff",
      inputBorder: isDark ? "#374151" : "#d1d5db",
      softCard: isDark ? "#0f172a" : "#f8fafc",
      softBorder: isDark ? "#334155" : "#e5e7eb",
      shadow: isDark
        ? "0 8px 30px rgba(0, 0, 0, 0.35)"
        : "0 8px 30px rgba(15, 23, 42, 0.05)",
      primary: "#3157c8",
      problemBox: isDark ? "rgba(16, 185, 129, 0.08)" : "#ecfdf5",
      problemBorder: isDark ? "#14532d" : "#bbf7d0",
    }),
    [isDark]
  );

  useEffect(() => {
    const queryType = searchParams.get("post_type");
    const queryTitle = safeDecode(searchParams.get("title"));
    const queryContent = safeDecode(searchParams.get("content"));
    const queryRecognizedText = safeDecode(searchParams.get("recognized_text"));
    const querySolveResult = safeDecode(searchParams.get("solve_result"));
    const queryImageUrl = safeDecode(searchParams.get("image_url"));
    const queryHistoryId = searchParams.get("history_id");
    const queryIsPublic = searchParams.get("is_public");

    if (queryType === "free" || queryType === "problem") setPostType(queryType);
    if (queryTitle) setTitle(queryTitle);
    if (queryContent) setContent(queryContent);
    if (queryRecognizedText) setRecognizedText(queryRecognizedText);
    if (querySolveResult) setSolveResult(querySolveResult);
    if (queryImageUrl) setImageUrl(queryImageUrl);
    if (queryHistoryId) setHistoryId(queryHistoryId);
    if (queryIsPublic === "true") setIsPublic(true);
    if (queryIsPublic === "false") setIsPublic(false);
  }, [searchParams]);

  const problemInfoValid = useMemo(() => {
    return Boolean(
      recognizedText.trim() ||
        solveResult.trim() ||
        imageUrl.trim() ||
        historyId.trim()
    );
  }, [recognizedText, solveResult, imageUrl, historyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorText("");
    setSuccessText("");

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setErrorText("제목을 입력해주세요.");
      return;
    }

    if (!trimmedContent) {
      setErrorText("내용을 입력해주세요.");
      return;
    }

    if (postType === "problem" && !problemInfoValid) {
      setErrorText(
        "문제글은 인식된 문제, 풀이 결과, 이미지 URL, history ID 중 하나 이상이 필요합니다."
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErrorText("로그인이 필요합니다.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          post_type: postType,
          title: trimmedTitle,
          content: trimmedContent,
          recognized_text: recognizedText.trim() || null,
          solve_result: solveResult.trim() || null,
          image_url: imageUrl.trim() || null,
          history_id: historyId.trim() ? Number(historyId.trim()) : null,
          is_public: isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorText(data?.error || "게시글 작성에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      setSuccessText("게시글이 작성되었습니다.");

      const createdId = data?.post?.id;
      if (createdId) {
        router.push(`/community/${createdId}`);
        return;
      }

      router.push("/community");
    } catch (error) {
      console.error(error);
      setErrorText("서버 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            글쓰기
          </h1>
          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: theme.subText,
              lineHeight: 1.7,
            }}
          >
            자유글과 문제글을 작성할 수 있어요.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: "24px",
            padding: "24px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
              글 종류
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setPostType("free")}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  fontWeight: 800,
                  fontSize: "14px",
                  backgroundColor: postType === "free" ? theme.primary : isDark ? "#0f172a" : "#f3f4f6",
                  color: postType === "free" ? "#fff" : theme.text,
                }}
              >
                자유글
              </button>
              <button
                type="button"
                onClick={() => setPostType("problem")}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  fontWeight: 800,
                  fontSize: "14px",
                  backgroundColor: postType === "problem" ? theme.primary : isDark ? "#0f172a" : "#f3f4f6",
                  color: postType === "problem" ? "#fff" : theme.text,
                }}
              >
                문제글
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={200}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요. 수식은 $...$ 또는 $$...$$ 사용"
              rows={8}
              maxLength={10000}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <PreviewBox title="내용 미리보기" value={content} isDark={isDark} theme={theme} />
          </div>

          {postType === "problem" && (
            <div
              style={{
                marginBottom: "20px",
                padding: "18px",
                borderRadius: "20px",
                border: `1px solid ${theme.problemBorder}`,
                backgroundColor: theme.problemBox,
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
                  인식된 문제
                </label>
                <textarea
                  value={recognizedText}
                  onChange={(e) => setRecognizedText(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <PreviewBox title="인식된 문제 미리보기" value={recognizedText} isDark={isDark} theme={theme} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
                  풀이 결과
                </label>
                <textarea
                  value={solveResult}
                  onChange={(e) => setSolveResult(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <PreviewBox title="풀이 결과 미리보기" value={solveResult} isDark={isDark} theme={theme} />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
                  문제 이미지 URL
                </label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
                  history ID
                </label>
                <input
                  value={historyId}
                  onChange={(e) => setHistoryId(e.target.value)}
                  placeholder="예: 12"
                  inputMode="numeric"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "16px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "12px", color: theme.subText }}>
                  history에서 공유 버튼을 누르면 자동으로 채워질 수 있어요.
                </p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              id="is_public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="is_public" style={{ fontSize: "14px", fontWeight: 700 }}>
              공개 게시글로 올리기
            </label>
          </div>

          {errorText ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "14px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(239,68,68,0.3)",
                backgroundColor: isDark ? "rgba(127,29,29,0.2)" : "#fef2f2",
                color: isDark ? "#fca5a5" : "#dc2626",
                fontSize: "14px",
              }}
            >
              {errorText}
            </div>
          ) : null}

          {successText ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "14px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(34,197,94,0.3)",
                backgroundColor: isDark ? "rgba(20,83,45,0.2)" : "#f0fdf4",
                color: isDark ? "#86efac" : "#15803d",
                fontSize: "14px",
              }}
            >
              {successText}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "14px 20px",
                borderRadius: "16px",
                backgroundColor: theme.primary,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 800,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "작성 중..." : "작성하기"}
            </button>

            <Link
              href="/community"
              style={{
                textDecoration: "none",
                padding: "14px 20px",
                borderRadius: "16px",
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.softCard,
                color: theme.text,
                fontSize: "14px",
                fontWeight: 800,
              }}
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}