"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import { supabase } from "@/lib/supabase";

type UserProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  grade: string | null;
  is_approved: boolean | null;
  is_admin: boolean | null;
  credits: number | null;
};

const planFeatures = [
  "더 뛰어난 추론 사용 가능",
  "1일 횟수 제한 없이 사용",
  "유사·변형 문제 생성 가능",
  "그래프 시각화와 깔끔한 도형 작도",
];

const planFlow = [
  "현재는 공개 신청을 받고 있지 않습니다.",
  "운영팀 안내가 있을 때 커뮤니티 공지를 먼저 확인해 주세요.",
  "계정 문의가 필요하면 커뮤니티를 통해 문의할 수 있습니다.",
];

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncSessionState = async (userId?: string, userEmail?: string | null) => {
      if (!mounted) return;

      if (!userId) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setEmail("");
        setCredits(null);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setEmail(userEmail ?? "");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, grade, is_approved, is_admin, credits")
        .eq("id", userId)
        .maybeSingle<UserProfileRow>();

      if (!mounted) return;

      if (error) {
        console.error("plan profile load error:", error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(Boolean(data?.is_admin));
      setCredits(Number(data?.credits ?? 0));
      setLoading(false);
    };

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        await syncSessionState(session?.user?.id, session?.user?.email);
      } catch (error) {
        console.error("plan page load error:", error);
        if (!mounted) return;
        setIsLoggedIn(false);
        setIsAdmin(false);
        setEmail("");
        setCredits(null);
        setLoading(false);
      }
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncSessionState(session?.user?.id, session?.user?.email);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const statusLabel = loading
    ? "불러오는 중..."
    : isAdmin
    ? "관리자"
    : isLoggedIn
    ? "일반 사용자"
    : "비로그인";

  const statusTone = loading ? "neutral" : isAdmin ? "success" : "default";

  const statusDescription = loading
    ? "계정 정보를 확인하는 중입니다."
    : isLoggedIn
    ? `로그인 계정: ${email}`
    : "로그인하지 않은 상태입니다.";

  const creditsLabel = credits === null ? "-" : `${credits.toLocaleString("ko-KR")}딱`;

  const heroEyebrow = useMemo(
    () => (isAdmin ? "관리자 플랜 활성화" : "플랜 안내"),
    [isAdmin]
  );

  return (
    <PageContainer topPadding={18} bottomPadding={56}>
      <div className="plan-page">
        <header className="suddak-card plan-topbar">
          <Link href="/" className="plan-backlink">
            ← 홈으로
          </Link>
          <ThemeToggleButton mobileFull={false} />
        </header>

        <section className="suddak-card plan-hero">
          <div className="plan-hero-copy">
            <span className="plan-eyebrow">{heroEyebrow}</span>
            <h1 className="plan-title">수딱 PlanCheck</h1>
            <p className="plan-description">
              현재 내 계정 상태를 빠르게 확인해보세요.
            </p>

            <div
              className={`plan-status-badge ${
                statusTone === "success"
                  ? "plan-status-badge-success"
                  : statusTone === "neutral"
                  ? "plan-status-badge-neutral"
                  : ""
              }`}
            >
              현재 상태: {statusLabel}
            </div>
            <div className="plan-status-badge plan-status-badge-neutral">
              보유 딱: {isLoggedIn ? creditsLabel : "로그인 필요"}
            </div>

            <p className="plan-status-text">{statusDescription}</p>

            <div className="plan-action-row">
              <button type="button" className="suddak-btn suddak-btn-primary">
                관리자 신청하기
              </button>
              <Link href="/" className="suddak-btn suddak-btn-ghost">
                홈으로 돌아가기
              </Link>
            </div>
          </div>

          <aside className="plan-highlight-card">
            <div className="plan-highlight-label">빠른 안내</div>
            <div className="plan-highlight-value">
              {isLoggedIn ? creditsLabel : "딱 확인 가능"}
            </div>
            <p className="plan-highlight-text">
              딱은 유사문제 생성에 사용됩니다. 유사문제 1회 생성 비용은 200딱입니다.
            </p>

            <div className="plan-metric-grid">
              <div className="plan-metric-item">
                <span className="plan-metric-kicker">추론</span>
                <strong>상향</strong>
              </div>
              <div className="plan-metric-item">
                <span className="plan-metric-kicker">유사문제</span>
                <strong>200딱</strong>
              </div>
              <div className="plan-metric-item">
                <span className="plan-metric-kicker">제한</span>
                <strong>완화</strong>
              </div>
              <div className="plan-metric-item">
                <span className="plan-metric-kicker">그래프</span>
                <strong>지원</strong>
              </div>
            </div>
          </aside>
        </section>

        <div className="plan-grid">
          <SectionCard
            title="관리자 혜택"
            description="큰 화면에서는 한눈에 비교되고, 작은 화면에서는 읽기 쉽게 세로로 흐르도록 배치했습니다."
          >
            <ul className="plan-feature-list">
              {planFeatures.map((feature) => (
                <li key={feature} className="plan-feature-item">
                  <span className="plan-feature-dot" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="이용 안내"
            description="아래 내용 참고해주세요."
          >
            <ol className="plan-flow-list">
              {planFlow.map((item) => (
                <li key={item} className="plan-flow-item">
                  {item}
                </li>
              ))}
            </ol>

            <div className="suddak-card-soft plan-note">
              현재 신청을 받고 있지 않습니다. 자세한 안내는 커뮤니티 공지를 확인해
              주세요.
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
