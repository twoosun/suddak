"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainCircuit, History, UploadCloud } from "lucide-react";
import { useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { supabase } from "@/lib/supabase";
import { TRAINING_MAX_ITEMS, TRAINING_SUBJECTS } from "@/lib/training/constants";

export default function TrainingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    if (!title.trim()) return setMessage("제목을 입력해 주세요.");
    if (!subject) return setMessage("과목을 선택해 주세요.");
    if (!problemFile) return setMessage("문제지 파일을 업로드해 주세요.");
    if (!solutionFile) return setMessage("해설지 파일을 업로드해 주세요.");
    if (!agreed) return setMessage("업로드 자료 활용 안내에 동의해 주세요.");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessage("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      setMessage("파일을 업로드하고 AI가 문항을 분석하는 중입니다. 잠시만 기다려 주세요.");

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("subject", subject);
      formData.append("agreed", String(agreed));
      formData.append("problemFile", problemFile);
      formData.append("solutionFile", solutionFile);

      const res = await fetch("/api/training/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "분석 요청에 실패했습니다.");
      }

      router.push(data?.setId ? `/training/${data.setId}` : "/training/history");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer topPadding={28} bottomPadding={56}>
      <header style={{ display: "grid", gap: "14px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "space-between" }}>
          <Link href="/" className="suddak-btn suddak-btn-ghost">
            홈
          </Link>
          <Link href="/training/history" className="suddak-btn suddak-btn-ghost">
            <History size={18} />내 분석 기록
          </Link>
        </div>
        <div>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)", lineHeight: 1, margin: 0, fontWeight: 950 }}>
            딱씨앗 학습소
          </h1>
          <p style={{ color: "var(--muted)", lineHeight: 1.8, maxWidth: "760px", fontWeight: 700 }}>
            문제지와 해설지를 함께 업로드하면 수딱이 문항의 핵심 개념과 풀이 발상을 분석합니다. 분석된 정보는
            유사문제 생성과 문풀 정확도 향상에 활용될 수 있습니다.
          </p>
        </div>
      </header>

      <SectionCard title="AI 분석 시작" description={`첫 버전은 한 번에 최대 ${TRAINING_MAX_ITEMS}문항까지 분석합니다.`}>
        <div style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "8px", fontWeight: 900 }}>
            제목
            <input className="suddak-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수학Ⅰ 지수로그 단원 학습지" />
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: 900 }}>
            과목
            <select className="suddak-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">과목 선택</option>
              {TRAINING_SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            <label className="suddak-card-soft" style={{ padding: "14px", display: "grid", gap: "10px", fontWeight: 900 }}>
              문제지 파일
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setProblemFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="suddak-card-soft" style={{ padding: "14px", display: "grid", gap: "10px", fontWeight: 900 }}>
              해설지 파일
              <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setSolutionFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div className="suddak-card-soft" style={{ padding: "14px", lineHeight: 1.75, color: "var(--muted)", fontWeight: 700 }}>
            저작권 보호를 위해 업로드한 원본 문제지와 해설지는 유사문제 생성에 직접적으로 활용되지 않습니다. 수딱은 업로드
            자료에서 과목, 단원, 난이도, 핵심 개념, 풀이 발상, 오답 유발 요소, 변형 포인트 등 추상화된 학습 정보만
            분석하며, 이를 서비스 품질 개선, 문제풀이 정확도 향상, 유사문제 생성 품질 개선에 활용할 수 있습니다. 원본
            자료의 문장, 보기, 수치, 도표, 해설 문구는 그대로 복제·재배포하지 않으며, 제3자에게 공개하지 않습니다.
          </div>

          <label className="suddak-card-soft" style={{ padding: "14px", display: "flex", gap: "10px", alignItems: "flex-start", lineHeight: 1.6, fontWeight: 800 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: "5px" }} />
            업로드 자료 활용 안내를 확인했으며, 원본 자료가 유사문제 생성에 직접 활용되지 않는다는 점에 동의합니다.
          </label>

          {message ? (
            <div className="suddak-card-soft" style={{ padding: "14px", color: loading ? "var(--primary)" : "var(--foreground)", lineHeight: 1.7, fontWeight: 800 }}>
              {message}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px" }}>
            <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void handleSubmit()} disabled={loading}>
              <BrainCircuit size={18} />{loading ? "분석 중" : "AI 분석 시작"}
            </button>
            <Link href="/training/history" className="suddak-btn suddak-btn-ghost">
              <UploadCloud size={18} />내 분석 기록
            </Link>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
