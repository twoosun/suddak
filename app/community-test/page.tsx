"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TEST_POST_ID = "1a71efaf-91aa-4ad3-a470-003c785209bf";

export default function CommunityTestPage() {
  const [result, setResult] = useState<string>("");

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  };

  const handleCreateFreePost = async () => {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setResult("로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          post_type: "free",
          title: "테스트 자유글",
          content: "커뮤니티 자유글 작성 테스트입니다.",
          is_public: true,
        }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(error);
      setResult("자유글 작성 중 에러 발생");
    }
  };

  const handleCreateComment = async () => {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setResult("로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/community/${TEST_POST_ID}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: "테스트 댓글입니다.",
        }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(error);
      setResult("댓글 작성 중 에러 발생");
    }
  };

  return (
    <main style={{ padding: "24px" }}>
      <h1>Community API Test</h1>

      <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
        <button
          onClick={handleCreateFreePost}
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          자유글 작성 테스트
        </button>

        <button
          onClick={handleCreateComment}
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          댓글 작성 테스트
        </button>
      </div>

      <pre style={{ marginTop: "24px", whiteSpace: "pre-wrap" }}>{result}</pre>
    </main>
  );
}