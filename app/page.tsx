"use client";

import ApprovalGate from "@/components/ApprovalGate";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import AuthButtons from "@/components/AuthButtons";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [recognizedText, setRecognizedText] = useState("");
  const [solveResult, setSolveResult] = useState("");

  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [usageText, setUsageText] = useState("");
  const [isEditingRecognized, setIsEditingRecognized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRecognizedText("");
    setSolveResult("");
    setIsEditingRecognized(false);
  };

  const handleReadProblem = async () => {
    if (!file) return;

    setReading(true);
    setRecognizedText("");
    setSolveResult("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setRecognizedText("로그인이 필요합니다.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "read");
      formData.append("image", file);

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setRecognizedText(data.error || "오류가 발생했습니다.");
      } else {
        setRecognizedText(data.result || "응답이 비어 있습니다.");
      }
    } catch {
      setRecognizedText("요청 중 오류가 발생했습니다.");
    } finally {
      setReading(false);
      await loadUsage();
    }
  };

  const handleSolveProblem = async () => {
    if (!recognizedText.trim()) return;

    setSolving(true);
    setSolveResult("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setSolveResult("로그인이 필요합니다.");
        return;
      }

      const formData = new FormData();
      formData.append("mode", "solve");
      formData.append("recognizedProblem", recognizedText);

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setSolveResult(data.error || "오류가 발생했습니다.");
      } else {
        setSolveResult(data.result || "응답이 비어 있습니다.");
      }
    } catch {
      setSolveResult("요청 중 오류가 발생했습니다.");
    } finally {
      setSolving(false);
      await loadUsage();
    }
  };

  const loadUsage = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setUsageText("");
      return;
    }

    const res = await fetch("/api/usage", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setUsageText("");
      return;
    }

    if (data.isAdmin) {
      setUsageText("관리자 계정 · 무제한 이용 가능");
    } else {
      setUsageText(
        `문제 인식 ${data.readToday}회 사용 / ${data.readRemaining}회 남음 · 풀이 ${data.solveToday}회 사용 / ${data.solveRemaining}회 남음`
      );
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const theme = {
    bg: isDark
      ? "linear-gradient(180deg, #0b1220 0%, #111827 50%, #0f172a 100%)"
      : "linear-gradient(180deg, #f8faff 0%, #f4f6fb 50%, #f7f8fc 100%)",
    text: isDark ? "#f9fafb" : "#1f2937",
    title: isDark ? "#ffffff" : "#111827",
    subText: isDark ? "#cbd5e1" : "#6b7280",
    card: isDark ? "#111827" : "#ffffff",
    cardBorder: isDark ? "#253041" : "#e5e7eb",
    softCard: isDark ? "#0f172a" : "#fbfcfe",
    softBorder: isDark ? "#334155" : "#edf0f5",
    primary: "#3157c8",
    badgeBg: isDark ? "#1e3a8a" : "#e8eefc",
    usageBg: isDark ? "#0f172a" : "#f8faff",
    inputBg: isDark ? "#0b1220" : "#ffffff",
    inputBorder: isDark ? "#374151" : "#d1d5db",
    shadow: isDark
      ? "0 8px 30px rgba(0, 0, 0, 0.35)"
      : "0 8px 30px rgba(15, 23, 42, 0.05)",
    headerBg: isDark ? "rgba(17,24,39,0.82)" : "rgba(255,255,255,0.8)",
  };

  const sectionCardStyle: React.CSSProperties = {
    backgroundColor: theme.card,
    border: `1px solid ${theme.cardBorder}`,
    borderRadius: isMobile ? "20px" : "24px",
    padding: isMobile ? "18px" : "24px",
    boxShadow: theme.shadow,
  };

  const buttonBaseStyle: React.CSSProperties = {
    width: isMobile ? "100%" : "auto",
    padding: "12px 18px",
    borderRadius: "14px",
    fontWeight: 700,
    fontSize: "15px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily:
          'Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${theme.cardBorder}`,
          backgroundColor: theme.headerBg,
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: isMobile ? "16px 14px" : "18px 20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: theme.primary,
                marginBottom: "6px",
              }}
            >
              AI 수학 문제 도우미
            </div>

            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-end" : "center",
                gap: isMobile ? "10px" : "14px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "40px" : "54px",
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  color: theme.title,
                  lineHeight: 1,
                }}
              >
                수딱
              </div>

              <div
                style={{
                  fontSize: isMobile ? "18px" : "22px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: isDark ? "#93c5fd" : "#3157c8",
                  paddingBottom: isMobile ? "5px" : "7px",
                }}
              >
                Suddak
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "10px",
              width: isMobile ? "100%" : "auto",
              alignItems: isMobile ? "stretch" : "center",
            }}
          >
            <button
              onClick={() => setIsDark((prev) => !prev)}
              style={{
                width: isMobile ? "100%" : "auto",
                padding: "10px 14px",
                borderRadius: "12px",
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                backgroundColor: isDark ? "#111827" : "#ffffff",
                color: isDark ? "#f9fafb" : "#111827",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {isDark ? "주간모드" : "야간모드"}
            </button>

            <div style={{ width: isMobile ? "100%" : "auto" }}>
              <AuthButtons />
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: isMobile ? "20px 14px 40px" : "36px 20px 56px",
        }}
      >
        <section
          style={{
            marginBottom: "28px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
            gap: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: isMobile ? "20px" : "24px",
              padding: isMobile ? "20px" : "28px",
              boxShadow: theme.shadow,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "999px",
                backgroundColor: theme.badgeBg,
                color: "#dbeafe",
                fontSize: "13px",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              두 단계 풀이 방식
            </div>

            <h1
              style={{
                margin: 0,
                marginBottom: "14px",
                fontSize: isMobile ? "30px" : "42px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: theme.title,
                lineHeight: isMobile ? 1.25 : 1.15,
              }}
            >
              문제를 먼저 읽고,
              <br />
              그다음 정확하게 풉니다.
            </h1>

            <p
              style={{
                margin: 0,
                color: theme.subText,
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: 1.7,
                maxWidth: "680px",
              }}
            >
              수딱은 문제 사진을 바로 풀이하지 않고, 먼저 문제를 인식한 뒤
              그 텍스트를 바탕으로 풀이합니다. 그래서 식이 복잡한 고등학교
              수학 문제도 더 안정적으로 다룰 수 있습니다.
            </p>
          </div>

          <div
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: isMobile ? "20px" : "24px",
              padding: isMobile ? "20px" : "24px",
              boxShadow: theme.shadow,
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "14px",
                fontSize: isMobile ? "18px" : "20px",
                fontWeight: 800,
                color: theme.title,
              }}
            >
              사용 흐름
            </h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {[
                "문제 사진 업로드",
                "1단계: 문제 읽기",
                "인식 결과 확인",
                "2단계: 풀이하기",
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "16px",
                    backgroundColor: theme.softCard,
                    border: `1px solid ${theme.softBorder}`,
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "999px",
                      backgroundColor: theme.primary,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: theme.text }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ApprovalGate>
          <section
            style={{
              ...sectionCardStyle,
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "10px",
                fontSize: isMobile ? "20px" : "22px",
                fontWeight: 800,
                color: theme.title,
              }}
            >
              문제 업로드
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "18px",
                color: theme.subText,
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              문제 사진을 고른 뒤, 먼저 문제를 읽게 하고 그 결과를 확인해봐.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: "14px",
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: isMobile ? "14px" : "15px",
              }}
            />

            {preview && (
              <div style={{ marginTop: "22px" }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: theme.text,
                  }}
                >
                  미리보기
                </div>
                <div
                  style={{
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: "18px",
                    overflow: "hidden",
                    backgroundColor: isDark ? "#0b1220" : "#fafafa",
                  }}
                >
                  <img
                    src={preview}
                    alt="업로드한 문제"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                </div>
              </div>
            )}

            {usageText && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  backgroundColor: theme.usageBg,
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.text,
                  fontSize: isMobile ? "13px" : "14px",
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                {usageText}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              <button
                onClick={handleReadProblem}
                disabled={!file || reading}
                style={{
                  ...buttonBaseStyle,
                  border: "1px solid #c7d2fe",
                  backgroundColor: reading ? "#eef2ff" : theme.primary,
                  color: reading ? "#3157c8" : "#ffffff",
                  cursor: !file || reading ? "not-allowed" : "pointer",
                  opacity: !file || reading ? 0.7 : 1,
                }}
              >
                {reading ? "문제 읽는 중..." : "1단계: 문제 읽기"}
              </button>

              <button
                onClick={handleSolveProblem}
                disabled={!recognizedText.trim() || solving}
                style={{
                  ...buttonBaseStyle,
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: solving
                    ? isDark
                      ? "#1f2937"
                      : "#f3f4f6"
                    : theme.inputBg,
                  color: theme.text,
                  cursor:
                    !recognizedText.trim() || solving ? "not-allowed" : "pointer",
                  opacity: !recognizedText.trim() || solving ? 0.7 : 1,
                }}
              >
                {solving ? "풀이 중..." : "2단계: 이 텍스트로 풀이"}
              </button>
            </div>
          </section>
        </ApprovalGate>

        {recognizedText && (
          <section
            style={{
              ...sectionCardStyle,
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "10px",
                fontSize: isMobile ? "20px" : "22px",
                fontWeight: 800,
                color: theme.title,
              }}
            >
              문제 인식 결과
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "18px",
                color: theme.subText,
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              먼저 이 내용이 원문과 맞는지 확인해봐. 이 단계가 정확할수록 풀이도
              더 정확해진다.
            </p>

            <div
              style={{
                border: `1px solid ${theme.softBorder}`,
                borderRadius: "18px",
                backgroundColor: theme.softCard,
                padding: isMobile ? "16px" : "20px",
                lineHeight: 1.9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "14px",
                }}
              >
                <button
                  onClick={() => setIsEditingRecognized((prev) => !prev)}
                  style={{
                    width: isMobile ? "100%" : "auto",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {isEditingRecognized ? "미리보기로 보기" : "직접 수정하기"}
                </button>

                <button
                  onClick={handleReadProblem}
                  disabled={!file || reading}
                  style={{
                    width: isMobile ? "100%" : "auto",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: !file || reading ? "not-allowed" : "pointer",
                    opacity: !file || reading ? 0.7 : 1,
                  }}
                >
                  {reading ? "다시 읽는 중..." : "같은 사진 다시 읽기"}
                </button>
              </div>

              <p
                style={{
                  margin: "0 0 14px",
                  color: theme.subText,
                  lineHeight: 1.7,
                  fontSize: "14px",
                }}
              >
                인식 결과가 원문과 다르면 직접 수정한 뒤 풀이해봐.
              </p>

              {isEditingRecognized ? (
                <textarea
                  value={recognizedText}
                  onChange={(e) => setRecognizedText(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: isMobile ? "220px" : "260px",
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: "16px",
                    padding: "16px",
                    fontSize: "15px",
                    lineHeight: 1.7,
                    resize: "vertical",
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }}
                />
              ) : (
                <div
                  style={{
                    border: `1px solid ${theme.softBorder}`,
                    borderRadius: "18px",
                    backgroundColor: theme.softCard,
                    padding: isMobile ? "16px" : "20px",
                    lineHeight: 1.9,
                    overflowX: "auto",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {recognizedText}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </section>
        )}

        {solveResult && (
          <section style={sectionCardStyle}>
            <h2
              style={{
                margin: 0,
                marginBottom: "10px",
                fontSize: isMobile ? "20px" : "22px",
                fontWeight: 800,
                color: theme.title,
              }}
            >
              풀이 결과
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "18px",
                color: theme.subText,
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              최종 답, 풀이, 검산을 차례대로 확인해봐.
            </p>

            <div
              style={{
                border: `1px solid ${theme.softBorder}`,
                borderRadius: "18px",
                backgroundColor: theme.softCard,
                padding: isMobile ? "16px" : "20px",
                lineHeight: 1.9,
                overflowX: "auto",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {solveResult}
              </ReactMarkdown>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}