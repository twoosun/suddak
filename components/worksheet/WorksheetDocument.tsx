import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import {
  chunkWorksheetProblems,
  parseWorksheetProblem,
  type WorksheetLayoutStyle,
  type WorksheetProblemItem,
} from "@/lib/worksheet";

type WorksheetMeta = {
  school?: string;
  grade?: string;
  studentName?: string;
  examTitle?: string;
  examDate?: string;
  round?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  problems: WorksheetProblemItem[];
  layoutStyle: WorksheetLayoutStyle;
  includeSolutions?: boolean;
  meta?: WorksheetMeta;
};

function resolveHistoryCode(item: WorksheetProblemItem) {
  if (item.historyCode) return item.historyCode;
  if (item.id.startsWith("history-")) return `H-${item.id.replace("history-", "")}`;
  if (item.id.startsWith("similar-")) return item.id.slice(-6).toUpperCase();
  return "";
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="worksheet-meta-item">
      <span>{label}</span>
      <span className="worksheet-meta-line">{value || ""}</span>
    </div>
  );
}

function ChoiceRow({ choices }: { choices: string[] }) {
  if (choices.length === 0) return null;

  return (
    <div className="worksheet-choice-row">
      {choices.map((choice, index) => (
        <div key={`${index}-${choice}`} className="worksheet-choice-item">
          <span className="worksheet-choice-marker">{index + 1}.</span>
          <MarkdownMathBlock content={choice} isDark={false} variant="plain" className="worksheet-choice-content" />
        </div>
      ))}
    </div>
  );
}

function WorksheetHeader({
  title,
  subtitle,
  layoutStyle,
  meta,
}: {
  title: string;
  subtitle?: string;
  layoutStyle: WorksheetLayoutStyle;
  meta?: WorksheetMeta;
}) {
  return (
    <header className={`worksheet-header worksheet-header-${layoutStyle}`}>
      <div className="worksheet-header-band">
        <div className="worksheet-header-band-label">
          {layoutStyle === "suneung" ? "LECTURE 01" : "MOCK TEST"}
        </div>
      </div>
      <div className="worksheet-header-main">
        <div className="worksheet-header-title-row">
          <h1 className="worksheet-header-title">{title}</h1>
          <span className="worksheet-header-badge">{layoutStyle === "suneung" ? "수능형" : "내신형"}</span>
        </div>
        {subtitle ? <p className="worksheet-header-subtitle">{subtitle}</p> : null}
        <div className="worksheet-meta-grid">
          <MetaRow label="학교" value={meta?.school} />
          <MetaRow label="학년" value={meta?.grade} />
          <MetaRow label="이름" value={meta?.studentName} />
          <MetaRow label="시험명" value={meta?.examTitle} />
          <MetaRow label="날짜" value={meta?.examDate} />
          <MetaRow label="회차" value={meta?.round} />
        </div>
      </div>
    </header>
  );
}

function SuneungProblemPage({ item, index }: { item: WorksheetProblemItem; index: number }) {
  const parsed = parseWorksheetProblem(item.problem);
  const historyCode = resolveHistoryCode(item);

  return (
    <article className="worksheet-sheet" data-export-sheet="true">
      <div className="worksheet-paper worksheet-paper-suneung">
        <div className="worksheet-suneung-frame" />
        <div className="worksheet-suneung-topline" />
        <div className="worksheet-suneung-sidebar">
          <span>SUDAK AI WORKSHEET</span>
        </div>
        <div className="worksheet-history-code">{historyCode}</div>
        <div className="worksheet-problem-head worksheet-problem-head-suneung">
          <div className="worksheet-problem-number">{String(index + 1).padStart(2, "0")}</div>
        </div>
        <div className="worksheet-problem-body-shell worksheet-problem-body-shell-suneung">
          <MarkdownMathBlock
            content={parsed.body}
            isDark={false}
            variant="plain"
            className="worksheet-problem-markdown worksheet-problem-markdown-suneung"
          />
          <ChoiceRow choices={parsed.choices} />
        </div>
      </div>
    </article>
  );
}

function NaesinQuadrant({ item, index }: { item?: WorksheetProblemItem; index: number }) {
  if (!item) {
    return (
      <section className="worksheet-naesin-cell worksheet-naesin-cell-empty">
        <div className="worksheet-naesin-empty" />
      </section>
    );
  }

  const parsed = parseWorksheetProblem(item.problem);
  const historyCode = resolveHistoryCode(item);

  return (
      <section className="worksheet-naesin-cell">
      <div className="worksheet-naesin-cell-head">
        <span className="worksheet-naesin-chip">{index + 1}번</span>
        <span className="worksheet-history-code worksheet-history-code-naesin">{historyCode}</span>
      </div>
      <MarkdownMathBlock
        content={parsed.body}
        isDark={false}
        variant="plain"
        className="worksheet-problem-markdown worksheet-problem-markdown-naesin"
      />
      <ChoiceRow choices={parsed.choices} />
    </section>
  );
}

function NaesinProblemPage({ items, pageIndex }: { items: WorksheetProblemItem[]; pageIndex: number }) {
  const paddedItems = Array.from({ length: 4 }, (_, index) => items[index]);

  return (
    <article className="worksheet-sheet" data-export-sheet="true">
      <div className="worksheet-paper worksheet-paper-naesin">
        <div className="worksheet-naesin-grid">
          {paddedItems.map((item, index) => (
            <NaesinQuadrant
              key={item?.id ?? `empty-${pageIndex}-${index}`}
              item={item}
              index={pageIndex * 4 + index}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function SolutionPage({ item, index }: { item: WorksheetProblemItem; index: number }) {
  return (
    <article className="worksheet-sheet" data-export-sheet="true">
      <div className="worksheet-paper worksheet-paper-solution">
        <div className="worksheet-solution-top">
          <span className="worksheet-solution-label">Solution</span>
          <span className="worksheet-solution-index">문항 {index + 1}</span>
        </div>
        <h2 className="worksheet-solution-title">{item.title}</h2>
        <div className="worksheet-solution-block">
          <div className="worksheet-solution-block-label">정답</div>
          <MarkdownMathBlock
            content={item.answer || "정답 정보가 없습니다."}
            isDark={false}
            variant="plain"
            className="worksheet-problem-markdown"
          />
        </div>
        <div className="worksheet-solution-block">
          <div className="worksheet-solution-block-label">풀이</div>
          <MarkdownMathBlock
            content={item.solution || "풀이 정보가 없습니다."}
            isDark={false}
            variant="plain"
            className="worksheet-problem-markdown"
          />
        </div>
        <div className="worksheet-solution-block">
          <div className="worksheet-solution-block-label">변형 포인트</div>
          <div className="worksheet-solution-note">{item.variationNote || "변형 메모가 없습니다."}</div>
        </div>
        {item.warning ? <div className="worksheet-solution-warning">{item.warning}</div> : null}
      </div>
    </article>
  );
}

export default function WorksheetDocument({
  title,
  subtitle,
  problems,
  layoutStyle,
  includeSolutions = false,
  meta,
}: Props) {
  const problemPages =
    layoutStyle === "suneung"
      ? problems.map((item, index) => <SuneungProblemPage key={item.id} item={item} index={index} />)
      : chunkWorksheetProblems(problems, 4).map((items, pageIndex) => (
          <NaesinProblemPage key={`page-${pageIndex}`} items={items} pageIndex={pageIndex} />
        ));

  return (
    <div className="worksheet-shell">
      <article className="worksheet-sheet" data-export-sheet="true">
        <div className="worksheet-paper worksheet-paper-cover">
          <WorksheetHeader title={title} subtitle={subtitle} layoutStyle={layoutStyle} meta={meta} />
        </div>
      </article>

      {problemPages}

      {includeSolutions
        ? problems.map((item, index) => <SolutionPage key={`solution-${item.id}`} item={item} index={index} />)
        : null}
    </div>
  );
}
