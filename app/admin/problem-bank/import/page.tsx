"use client";

import Link from "next/link";
import { useState } from "react";

import PageContainer from "@/components/common/PageContainer";
import SectionCard from "@/components/common/SectionCard";
import { adminFetch } from "@/lib/problem-bank/admin-client";
import { problemBankImportStandardJson } from "@/lib/problem-bank/import-standard";

type ImportIssue = {
  index: number;
  field: string;
  message: string;
};

type ImportResponse = {
  valid: unknown[];
  issues: ImportIssue[];
  duplicateCodes: string[];
  inserted?: Array<{ id: string; problem_code: string }>;
};

export default function ProblemImportPage() {
  const [jsonText, setJsonText] = useState(problemBankImportStandardJson);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [message, setMessage] = useState("ChatGPT 산출 JSON 배열을 그대로 붙여넣고 검증하세요.");

  const parse = () => JSON.parse(jsonText) as unknown;

  const validate = async () => {
    try {
      const data = await adminFetch<ImportResponse>("/api/admin/problem-bank/import?mode=validate", {
        method: "POST",
        body: JSON.stringify(parse()),
      });
      setResult(data);
      setMessage(data.issues.length ? "오류가 있어 저장할 수 없습니다." : `${data.valid.length}개 문항 저장 가능`);
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "검증에 실패했습니다.");
    }
  };

  const importNow = async () => {
    try {
      const data = await adminFetch<ImportResponse>("/api/admin/problem-bank/import", {
        method: "POST",
        body: JSON.stringify(parse()),
      });
      setResult(data);
      setMessage(data.issues.length ? "오류가 있어 저장하지 않았습니다." : `${data.inserted?.length ?? 0}개 문항을 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  };

  return (
    <PageContainer topPadding={24} bottomPadding={56}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>JSON 일괄 import</h1>
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>{message}</p>
        </div>
        <Link className="suddak-btn suddak-btn-ghost" href="/admin/problem-bank">목록</Link>
      </header>

      <SectionCard title="JSON 배열">
        <textarea className="suddak-input" rows={24} value={jsonText} onChange={(e) => setJsonText(e.target.value)} style={{ fontFamily: "monospace" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => void validate()}>유효성 / 중복 검사</button>
          <button type="button" className="suddak-btn suddak-btn-primary" onClick={() => void importNow()} disabled={Boolean(result?.issues.length)}>정상 문항 저장</button>
        </div>
      </SectionCard>

      <SectionCard title="검증 결과">
        {result ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div className="suddak-badge">정상 {result.valid.length}</div>
            <div className="suddak-badge">중복 {result.duplicateCodes.length}</div>
            {result.issues.map((issue, index) => (
              <div key={`${issue.index}-${issue.field}-${index}`} className="suddak-card-soft" style={{ padding: 10 }}>
                row {issue.index >= 0 ? issue.index + 1 : "-"} / {issue.field}: {issue.message}
              </div>
            ))}
            {result.inserted?.map((item) => (
              <div key={item.id} className="suddak-card-soft" style={{ padding: 10 }}>{item.problem_code} 저장됨</div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)", fontWeight: 700 }}>아직 검증 결과가 없습니다.</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}
