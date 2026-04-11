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
    `오늘 사용 ${data.usedToday}회 / 남은 횟수 ${data.remaining}회 / 총 ${data.dailyLimit}회`
  );
}
};
useEffect(() => {
  loadUsage();
}, []);
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8faff 0%, #f4f6fb 50%, #f7f8fc 100%)",
        color: "#1f2937",
        fontFamily:
          'Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "rgba(255,255,255,0.8)",
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
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#3157c8",
                marginBottom: "4px",
              }}
            >
              AI 수학 문제 도우미
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#111827",
              }}
            >
              수딱
            </div>
          </div>

          <AuthButtons />
        </div>
      </header>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "36px 20px 56px",
        }}
      >
        <section
          style={{
            marginBottom: "28px",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "999px",
                backgroundColor: "#e8eefc",
                color: "#3157c8",
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
                fontSize: "42px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#111827",
                lineHeight: 1.15,
              }}
            >
              문제를 먼저 읽고,
              <br />
              그다음 정확하게 풉니다.
            </h1>

            <p
              style={{
                margin: 0,
                color: "#4b5563",
                fontSize: "17px",
                lineHeight: 1.8,
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
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "14px",
                fontSize: "20px",
                fontWeight: 800,
                color: "#111827",
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
                    backgroundColor: "#f8faff",
                    border: "1px solid #edf2ff",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "999px",
                      backgroundColor: "#3157c8",
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
                  <div style={{ fontSize: "15px", fontWeight: 600 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      <ApprovalGate>
        <section
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "10px",
              fontSize: "22px",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            문제 업로드
          </h2>

          <p
            style={{
              margin: 0,
              marginBottom: "18px",
              color: "#6b7280",
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
              border: "1px solid #d1d5db",
              borderRadius: "14px",
              backgroundColor: "#fff",
            }}
          />

          {preview && (
            <div style={{ marginTop: "22px" }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  marginBottom: "10px",
                  color: "#374151",
                }}
              >
                미리보기
              </div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  overflow: "hidden",
                  backgroundColor: "#fafafa",
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
      backgroundColor: "#f8faff",
      border: "1px solid #e5e7eb",
      color: "#374151",
      fontSize: "14px",
      fontWeight: 600,
    }}
  >
    {usageText}
  </div>
)}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <button
              onClick={handleReadProblem}
              disabled={!file || reading}
              style={{
                padding: "12px 18px",
                borderRadius: "14px",
                border: "1px solid #c7d2fe",
                backgroundColor: reading ? "#eef2ff" : "#3157c8",
                color: reading ? "#3157c8" : "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
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
                padding: "12px 18px",
                borderRadius: "14px",
                border: "1px solid #d1d5db",
                backgroundColor: solving ? "#f3f4f6" : "#ffffff",
                color: "#111827",
                fontWeight: 700,
                fontSize: "15px",
                cursor: !recognizedText.trim() || solving ? "not-allowed" : "pointer",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "10px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              문제 인식 결과
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "18px",
                color: "#6b7280",
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              먼저 이 내용이 원문과 맞는지 확인해봐. 이 단계가 정확할수록 풀이도
              더 정확해진다.
            </p>

            <div
              style={{
                border: "1px solid #edf0f5",
                borderRadius: "18px",
                backgroundColor: "#fbfcfe",
                padding: "20px",
                lineHeight: 1.9,
              }}
            >
             <div
  style={{
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  }}
>
  <button
    onClick={() => setIsEditingRecognized((prev) => !prev)}
    style={{
      padding: "10px 14px",
      borderRadius: "12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#111827",
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
      padding: "10px 14px",
      borderRadius: "12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#111827",
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
    color: "#6b7280",
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
      minHeight: "260px",
      border: "1px solid #d1d5db",
      borderRadius: "16px",
      padding: "16px",
      fontSize: "15px",
      lineHeight: 1.7,
      resize: "vertical",
      backgroundColor: "#ffffff",
      color: "#111827",
    }}
  />
) : (
  <div
    style={{
      border: "1px solid #edf0f5",
      borderRadius: "18px",
      backgroundColor: "#fbfcfe",
      padding: "20px",
      lineHeight: 1.9,
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
          <section
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "10px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              풀이 결과
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "18px",
                color: "#6b7280",
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              최종 답, 풀이, 검산을 차례대로 확인해봐.
            </p>

            <div
              style={{
                border: "1px solid #edf0f5",
                borderRadius: "18px",
                backgroundColor: "#fbfcfe",
                padding: "20px",
                lineHeight: 1.9,
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