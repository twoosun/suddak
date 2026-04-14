"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = {
  content: string;
  isDark: boolean;
  className?: string;
};

/* # 1. 공통 마크다운 수식 렌더 */
export default function MarkdownMathBlock({
  content,
  isDark,
  className = "",
}: Props) {
  return (
    <div
      className={[
        "suddak-markdown",
        "prose prose-sm max-w-none",
        isDark ? "prose-invert" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}