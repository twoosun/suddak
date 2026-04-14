"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { getStoredTheme, initTheme } from "@/lib/theme";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import MoreMenu from "@/components/MoreMenu";

type PostType = "free" | "problem";

export default function CommunityWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* # 1. 상태값 */
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [postType, setPostType] = useState<PostType>("free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [solveResult, setSolveResult] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  /* # 2. 초기 마운트 */
  useEffect(() => {
    initTheme();
    setIsDark(getStoredTheme() === "dark");
    setMounted(true);
  }, []);

  /* # 3. 쿼리 기반 자동 채우기 */
  useEffect(() => {
    if (!mounted) return;

    const qpType = searchParams.get("post_type");
    const qpTitle = searchParams.get("title");
    const qpContent = searchParams.get("content");
    const qpRecognized = searchParams.get("recognized_text");
    const qpSolve = searchParams.get("solve_result");

    if (qpType === "free" || qpType === "problem") {
      setPostType(qpType);
    }

    if (qpTitle) setTitle(qpTitle);
    if (qpContent) setContent(qpContent);
    if (qpRecognized) setRecognizedText(qpRecognized);
    if (qpSolve) setSolveResult(qpSolve);
  }, [mounted, searchParams]);

  /* # 4. 유효성 검사 */
  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (postType === "free") return !!content.trim();
    return !!(content.trim() || recognizedText.trim() || solveResult.trim());
  }, [postType, title, content, recognizedText, solveResult]);

  /* # 5. 제출 */
  const handleSubmit = async () => {
    if (!canSubmit) {
      setMessage("제목과 필요한 내용을 먼저 입력해줘.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("로그인 후 글을 작성할 수 있어.");
        return;
      }

      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          post_type: postType,
          recognized_text: postType === "problem" ? recognizedText.trim() : null,
          solve_result: postType === "problem" ? solveResult.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "게시글 작성에 실패했습니다.");
        return;
      }

      router.push("/community");
      router.refresh();
    } catch {
      setMessage("게시글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <PageContainer topPadding={18} bottomPadding={48}>
      {/* # 6. 상단 헤더 */}
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
                글쓰기
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginTop: "4px",
                }}
              >
                Community Write · 자유글 / 문제글 작성
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
            <Link href="/history" className="suddak-btn suddak-btn-ghost">
              기록
            </Link>
            <Link href="/community" className="suddak-btn suddak-btn-ghost">
              커뮤니티
            </Link>
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

      {/* # 7. 안내 문구 */}
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

      {/* # 8. 작성 폼 */}
      <SectionCard
        title="게시글 작성"
        description="자유글은 의견이나 질문을, 문제글은 인식된 문제와 풀이를 함께 올릴 수 있어."
      >
        <div style={{ display: "grid", gap: "14px" }}>
          {/* # 8-1. 글 유형 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            <button
              type="button"
              className={`suddak-btn ${postType === "free" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
              onClick={() => setPostType("free")}
            >
              자유글
            </button>

            <button
              type="button"
              className={`suddak-btn ${postType === "problem" ? "suddak-btn-primary" : "suddak-btn-ghost"}`}
              onClick={() => setPostType("problem")}
            >
              문제글
            </button>
          </div>

          {/* # 8-2. 제목 */}
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              제목
            </div>
            <input
              className="suddak-input"
              placeholder="제목을 입력해줘"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* # 8-3. 본문 */}
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              본문
            </div>
            <textarea
              className="suddak-textarea"
              placeholder={
                postType === "free"
                  ? "의견, 질문, 토론할 내용을 적어줘"
                  : "문제에 대한 질문이나 공유하고 싶은 말을 적어줘"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* # 8-4. 문제글 전용 필드 */}
          {postType === "problem" && (
            <>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 900,
                    marginBottom: "8px",
                  }}
                >
                  인식된 문제
                </div>
                <textarea
                  className="suddak-textarea"
                  placeholder="문제 텍스트를 붙여넣거나 수정해줘"
                  value={recognizedText}
                  onChange={(e) => setRecognizedText(e.target.value)}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 900,
                    marginBottom: "8px",
                  }}
                >
                  풀이 결과
                </div>
                <textarea
                  className="suddak-textarea"
                  placeholder="풀이 내용을 붙여넣어줘"
                  value={solveResult}
                  onChange={(e) => setSolveResult(e.target.value)}
                />
              </div>
            </>
          )}

          {/* # 8-5. 미리보기 */}
          <div className="suddak-card-soft" style={{ padding: "14px" }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 900,
                marginBottom: "10px",
              }}
            >
              미리보기
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div className="suddak-card" style={{ padding: "14px" }}>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 950,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                  }}
                >
                  {title.trim() || "제목 미리보기"}
                </div>

                {content.trim() && (
                  <div
                    style={{
                      marginTop: "10px",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.75,
                    }}
                  >
                    {content}
                  </div>
                )}
              </div>

              {postType === "problem" && recognizedText.trim() && (
                <div className="suddak-card" style={{ padding: "14px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 900,
                      color: "var(--muted)",
                      marginBottom: "8px",
                    }}
                  >
                    인식된 문제 미리보기
                  </div>
                  <MarkdownMathBlock content={recognizedText} isDark={isDark} />
                </div>
              )}

              {postType === "problem" && solveResult.trim() && (
                <div className="suddak-card" style={{ padding: "14px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 900,
                      color: "var(--muted)",
                      marginBottom: "8px",
                    }}
                  >
                    풀이 결과 미리보기
                  </div>
                  <MarkdownMathBlock content={solveResult} isDark={isDark} />
                </div>
              )}
            </div>
          </div>

          {/* # 8-6. 제출 버튼 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            <button
              type="button"
              className="suddak-btn suddak-btn-primary"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "작성 중..." : "게시글 올리기"}
            </button>

            <Link href="/community" className="suddak-btn suddak-btn-ghost">
              취소하고 돌아가기
            </Link>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}