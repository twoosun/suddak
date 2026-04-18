export type SimilarProblemMeta = {
  subjectLabel: string;
  subtopic: string;
  difficulty: "easy" | "medium" | "hard";
  difficultyLabel: string;
};

export type SimilarResult = {
  title: string;
  problem: string;
  answer: string;
  solution: string;
  variationNote: string;
  warning: string;
  meta: SimilarProblemMeta | null;
};
