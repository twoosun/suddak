import type { ChatGptProblemJson } from "@/lib/problem-bank/types";

export const problemBankImportStandardExample: ChatGptProblemJson[] = [
  {
    problem_code: "26xxx-xxxxA",
    base_problem_code: "26xxx-xxxx",
    variant_code: "A",
    code_system: "ebs",
    source: "2027 수능특강 미적분",
    source_type: "ebs_special",
    exam_year: 2027,
    exam_month: null,
    problem_number: 6,
    subject: "미적분",
    unit: "07. 정적분의 활용",
    level: "Level 2",
    original_ref: "07단원 Level 2 6번",
    ebs_original_code: "26xxx-xxxx",
    internal_code: null,
    question_type: "multiple_choice",
    question_latex: "문제 본문 LaTeX",
    choices_json: [
      "① 선택지 LaTeX",
      "② 선택지 LaTeX",
      "③ 선택지 LaTeX",
      "④ 선택지 LaTeX",
      "⑤ 선택지 LaTeX",
    ],
    answer_json: {
      type: "choice",
      answer: 3,
    },
    solution_latex: "해설 LaTeX",
    difficulty: 7,
    variant_strength: 3,
    tags: ["정적분", "넓이", "그래프 해석"],
    has_graph: true,
    graph_json: {
      type: "function_graph",
      description: "원문과 유사한 흑백 그래프. 교점, 넓이 영역, 보조선을 표시한다.",
      objects: [
        {
          kind: "curve",
          equation: "y=f(x)",
          style: "solid",
        },
        {
          kind: "point",
          label: "A",
          coordinate: "(a, f(a))",
        },
      ],
      render_required: true,
    },
    layout_json: {
      estimated_height: "medium",
      needs_wide_space: false,
      recommended_columns: 1,
      keep_choices_together: true,
      graph_position: "below_question",
      avoid_page_break_inside: true,
    },
    visibility: "private",
    price_dak: 0,
  },
];

export const problemBankImportStandardJson = JSON.stringify(problemBankImportStandardExample, null, 2);
