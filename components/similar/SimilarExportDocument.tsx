import WorksheetDocument from "@/components/worksheet/WorksheetDocument";
import { type SimilarExportPayload } from "@/lib/similar-export";

type Props = {
  payload: SimilarExportPayload;
};

export default function SimilarExportDocument({ payload }: Props) {
  const includeSolutions = payload.mode === "problem-with-solution";
  const problems = [
    {
      id: "similar-problem",
      title: payload.title,
      problem: payload.problem,
      sourceLabel: payload.includeOriginalProblem ? "유사문제 / 원본 포함" : "유사문제",
      answer: payload.answer,
      solution: payload.solution,
      variationNote: payload.variationNote,
      warning: payload.warning,
    },
  ];

  const subtitle =
    payload.layoutStyle === "suneung"
      ? "한 페이지에 한 문제로 풀이 공간을 넉넉하게 확보한 수능형 문제지"
      : "한 페이지당 네 문제를 배치한 내신형 문제지";

  return (
    <WorksheetDocument
      title={payload.meta.examTitle.trim() || payload.title}
      subtitle={subtitle}
      problems={problems}
      layoutStyle={payload.layoutStyle}
      includeSolutions={includeSolutions}
      meta={payload.meta}
    />
  );
}
