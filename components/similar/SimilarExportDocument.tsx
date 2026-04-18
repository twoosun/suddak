import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import { type SimilarExportPayload } from "@/lib/similar-export";

type Props = {
  payload: SimilarExportPayload;
};

function ExportMetaField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="similar-export-meta-field">
      <div className="similar-export-meta-label">{label}</div>
      <div className="similar-export-meta-line">{value}</div>
    </div>
  );
}

function ExportSection({
  label,
  title,
  content,
  compact = false,
}: {
  label: string;
  title: string;
  content: string;
  compact?: boolean;
}) {
  return (
    <section className={`similar-export-section ${compact ? "similar-export-section-compact" : ""}`}>
      <div className="similar-export-section-label">{label}</div>
      <h2 className="similar-export-section-title">{title}</h2>
      <MarkdownMathBlock
        content={content}
        isDark={false}
        variant="plain"
        className="similar-export-markdown"
      />
    </section>
  );
}

export default function SimilarExportDocument({ payload }: Props) {
  const includeSolution = payload.mode === "problem-with-solution";
  const sourceProblem = payload.includeOriginalProblem ? payload.sourceProblem?.trim() ?? "" : "";
  const sheetTitle = payload.meta.examTitle.trim() || payload.title;

  return (
    <div className="similar-export-shell">
      <article className="similar-export-sheet" data-export-sheet="true">
        <div className="similar-export-paper">
          <header className="similar-export-header">
            <div className="similar-export-kicker">SIMILAR TEST SHEET</div>
            <div className="similar-export-heading-row">
              <div>
                <h1 className="similar-export-title">{sheetTitle}</h1>
                <p className="similar-export-subtitle">
                  {includeSolution ? "문제와 풀이가 함께 포함된 해설형 출력본" : "시험지 스타일의 문제 출력본"}
                </p>
              </div>
              <div className="similar-export-badge">{includeSolution ? "해설 포함" : "문제지"}</div>
            </div>
            <div className="similar-export-meta-grid">
              <ExportMetaField label="학교" value={payload.meta.school} />
              <ExportMetaField label="학년" value={payload.meta.grade} />
              <ExportMetaField label="이름" value={payload.meta.studentName} />
              <ExportMetaField label="날짜" value={payload.meta.examDate} />
              <ExportMetaField label="회차" value={payload.meta.round} />
              <ExportMetaField label="형식" value={includeSolution ? "문제 + 풀이" : "문제만"} />
            </div>
          </header>

          <div className="similar-export-note">
            export는 웹 화면과 분리된 전용 시험지 템플릿으로 렌더링됩니다.
          </div>

          {sourceProblem ? (
            <ExportSection label="Original Problem" title="원본 문제" content={sourceProblem} />
          ) : null}
        </div>
      </article>

      <article className="similar-export-sheet" data-export-sheet="true">
        <div className="similar-export-paper">
          <section className="similar-export-problem-card">
            <div className="similar-export-problem-topline">
              <div className="similar-export-section-label">Imitation Problem</div>
              <div className="similar-export-score">배점 4점</div>
            </div>

            <div className="similar-export-question-heading">
              <span className="similar-export-question-number">1</span>
              <div>
                <div className="similar-export-question-label">유사문제</div>
                <h2 className="similar-export-question-title">{payload.title}</h2>
              </div>
            </div>

            <MarkdownMathBlock
              content={payload.problem}
              isDark={false}
              variant="plain"
              className="similar-export-markdown similar-export-problem-body"
            />

            {!includeSolution ? (
              <div className="similar-export-answer-lines" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="similar-export-answer-line" />
                ))}
              </div>
            ) : null}
          </section>

          <div className="similar-export-warning">{payload.warning}</div>
        </div>
      </article>

      {includeSolution ? (
        <article className="similar-export-sheet" data-export-sheet="true">
          <div className="similar-export-paper">
            <ExportSection label="Answer" title="정답" content={payload.answer || "정답 정보가 없습니다."} compact />
            <ExportSection label="Solution" title="풀이" content={payload.solution || "풀이 정보가 없습니다."} />
            <ExportSection
              label={payload.solutionStyle === "handwritten-future" ? "Handwriting Ready" : "Variation Note"}
              title={payload.solutionStyle === "handwritten-future" ? "손풀이 확장 메모" : "변형 포인트"}
              content={payload.variationNote || "변형 포인트 정보가 없습니다."}
              compact
            />
          </div>
        </article>
      ) : null}
    </div>
  );
}
