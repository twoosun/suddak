import Link from "next/link";

import PageContainer from "@/components/common/PageContainer";

const updates = [
  {
    date: "2026.05.04",
    tag: "개선",
    title: "홈 화면 문구와 학습 지표를 다듬었어요",
    items: [
      "홈 화면의 브랜드 문구를 더 짧고 선명하게 정리했어요.",
      "일주일 간 신규 가입자와 누적 AI 학습 기록이 번갈아 보이도록 개선했어요.",
      "로그인/회원가입 화면과 주요 버튼의 포인트 색상을 SUDDAK 보라색으로 맞췄어요.",
    ],
  },
  {
    date: "2026.05.04",
    tag: "기능 추가",
    title: "업데이트 로그 페이지를 만들었어요",
    items: [
      "삼선 메뉴에서 새 소식을 눌러 최근 변경 사항을 확인할 수 있어요.",
      "앞으로 기능 추가, 개선, 버그 수정 내용을 이곳에 차곡차곡 남길 예정이에요.",
    ],
  },
  {
    date: "2026.05.03",
    tag: "기능 추가",
    title: "문제풀이에서 시험지 생성 흐름까지 이어지게 했어요",
    items: [
      "풀이 기록에서 유사문제 생성으로 이동하는 흐름을 정리했어요.",
      "내신과 시험지 생성 기능을 함께 탐색할 수 있도록 주요 메뉴를 정돈했어요.",
    ],
  },
];

const tagColors: Record<string, { bg: string; border: string; color: string }> = {
  "기능 추가": {
    bg: "rgba(139, 92, 246, 0.14)",
    border: "rgba(139, 92, 246, 0.36)",
    color: "#c4b5fd",
  },
  개선: {
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.32)",
    color: "#86efac",
  },
  "버그 수정": {
    bg: "rgba(244, 114, 182, 0.12)",
    border: "rgba(244, 114, 182, 0.32)",
    color: "#f9a8d4",
  },
};

export default function UpdatesPage() {
  return (
    <PageContainer topPadding={18} bottomPadding={56}>
      <header
        className="suddak-card"
        style={{
          padding: "22px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "var(--primary)",
              fontSize: "13px",
              fontWeight: 950,
              marginBottom: "8px",
            }}
          >
            SUDDAK 새 소식
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: 0,
            }}
          >
            업데이트 로그
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              color: "var(--muted)",
              fontSize: "15px",
              lineHeight: 1.7,
            }}
          >
            새 기능, 개선 사항, 고친 부분을 날짜순으로 정리해둘게요.
          </p>
        </div>

        <Link href="/" className="suddak-btn suddak-btn-ghost">
          홈으로
        </Link>
      </header>

      <section style={{ display: "grid", gap: "12px" }} aria-label="업데이트 목록">
        {updates.map((update) => {
          const tag = tagColors[update.tag] ?? tagColors["기능 추가"];

          return (
            <article key={`${update.date}-${update.title}`} className="suddak-card" style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: "28px",
                    padding: "0 10px",
                    borderRadius: "999px",
                    background: tag.bg,
                    border: `1px solid ${tag.border}`,
                    color: tag.color,
                    fontSize: "12px",
                    fontWeight: 950,
                  }}
                >
                  {update.tag}
                </span>
                <time style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 850 }}>
                  {update.date}
                </time>
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  lineHeight: 1.35,
                  fontWeight: 950,
                  letterSpacing: 0,
                }}
              >
                {update.title}
              </h2>

              <ul style={{ margin: "12px 0 0", paddingLeft: "18px", color: "var(--muted)", lineHeight: 1.75 }}>
                {update.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>
    </PageContainer>
  );
}
