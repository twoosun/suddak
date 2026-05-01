import type { NaesinExamSet, NaesinSubject, NaesinUnitPractice } from "./types";

export const naesinSubjects: Array<{ value: NaesinSubject; label: string }> = [
  { value: "all", label: "전체" },
  { value: "common-math", label: "공통수학" },
  { value: "math-1", label: "수학Ⅰ" },
  { value: "math-2", label: "수학Ⅱ" },
  { value: "calculus", label: "미적분" },
  { value: "probability", label: "확률과 통계" },
  { value: "geometry", label: "기하" },
];

export const naesinExamSets: NaesinExamSet[] = [];

export const naesinUnitPractices: NaesinUnitPractice[] = [];

export function getNaesinExamSet(id: string) {
  return naesinExamSets.find((set) => set.id === id) ?? null;
}

export function filterNaesinExamSets(subject: NaesinSubject) {
  if (subject === "all") return naesinExamSets;
  return naesinExamSets.filter((set) => set.subject === subject);
}
