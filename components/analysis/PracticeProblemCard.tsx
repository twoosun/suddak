"use client";

import { useId, useState, type FormEvent } from "react";
import { BookOpen, CheckCircle2, Lightbulb, RotateCcw } from "lucide-react";

import MarkdownMathBlock from "@/components/common/MarkdownMathBlock";
import type { PracticeProblem } from "@/lib/juneMockAnalysis";

type Props = {
  problem: PracticeProblem;
};

type CheckState = "idle" | "empty" | "correct" | "incorrect";

const resultMessages: Record<CheckState, string> = {
  idle: "",
  empty: "답을 입력해 주세요.",
  correct: "정답입니다!",
  incorrect: "다시 한번 생각해 보세요.",
};

export default function PracticeProblemCard({ problem }: Props) {
  const inputId = useId();
  const explanationId = useId();
  const [answerInput, setAnswerInput] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  const checkAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedAnswer = answerInput.trim();
    if (!normalizedAnswer) {
      setCheckState("empty");
      return;
    }

    setCheckState(normalizedAnswer === problem.answer ? "correct" : "incorrect");
  };

  return (
    <article className="suddak-card june-analysis-practice-card">
      <div className="june-analysis-practice-card-head">
        <span className="suddak-badge">{problem.label}</span>
        <span className="june-analysis-practice-difficulty">
          난이도 {problem.difficulty.toFixed(1)} / 5.0
        </span>
      </div>

      <div className="june-analysis-practice-heading">
        <h2>{problem.title}</h2>
        <p>{problem.description}</p>
      </div>

      <div className="june-analysis-tags" aria-label={`${problem.title} 개념 태그`}>
        {problem.tags.map((tag) => (
          <span key={`${problem.id}-${tag}`}>{tag}</span>
        ))}
      </div>

      <section className="june-analysis-problem-body" aria-label={`${problem.title} 문제`}>
        <div className="june-analysis-problem-label">단답형</div>
        <MarkdownMathBlock
          content={problem.content}
          isDark={false}
          variant="plain"
          className="june-analysis-math-content"
        />
      </section>

      <form className="june-analysis-answer-form" onSubmit={checkAnswer}>
        <label htmlFor={inputId}>정답 입력</label>
        <div className="june-analysis-answer-controls">
          <input
            id={inputId}
            className="june-analysis-answer-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            autoComplete="off"
            aria-label={`${problem.title} 정답 입력`}
            value={answerInput}
            onChange={(event) => {
              setAnswerInput(event.target.value.replace(/\D/g, "").slice(0, 3));
              setCheckState("idle");
            }}
            aria-describedby={`${inputId}-hint ${inputId}-result`}
            placeholder="숫자 입력"
          />
          <button type="submit" className="suddak-btn suddak-btn-primary">
            <CheckCircle2 size={17} />
            정답 확인
          </button>
          <button
            type="button"
            className="suddak-btn suddak-btn-ghost"
            aria-expanded={isExplanationOpen}
            aria-controls={explanationId}
            onClick={() => setIsExplanationOpen((current) => !current)}
          >
            <BookOpen size={17} />
            {isExplanationOpen ? "해설 닫기" : "해설 보기"}
          </button>
        </div>
        <p id={`${inputId}-hint`} className="june-analysis-answer-hint">
          최대 세 자리 자연수를 입력하세요.
        </p>
        <p
          id={`${inputId}-result`}
          className={`june-analysis-answer-result june-analysis-answer-result-${checkState}`}
          aria-live="polite"
        >
          {resultMessages[checkState]}
        </p>
      </form>

      <aside className="june-analysis-variation-point">
        <Lightbulb size={18} />
        <div>
          <strong>변형 포인트</strong>
          <p>{problem.variationPoint}</p>
        </div>
      </aside>

      {isExplanationOpen ? (
        <section id={explanationId} className="june-analysis-explanation">
          <div className="june-analysis-explanation-head">
            <div>
              <span>정답</span>
              <strong>{problem.answer}</strong>
            </div>
            <span className="june-analysis-explanation-kicker">
              <RotateCcw size={16} />
              풀이 흐름
            </span>
          </div>
          <MarkdownMathBlock
            content={problem.explanation.join("\n\n")}
            isDark={false}
            variant="plain"
            className="june-analysis-math-content"
          />
        </section>
      ) : null}
    </article>
  );
}
