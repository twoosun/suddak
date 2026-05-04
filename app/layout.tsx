import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수딱 | SUDDAK | AI 수학 문제 풀이",
  description:
    "문제 사진을 읽고, 풀이와 유사문제, 시험지 생성, 내신 학습까지 이어주는 AI 학습 도구 수딱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var saved = localStorage.getItem("theme");
                  var isDark = saved !== "light";
                  document.documentElement.classList.toggle("dark", isDark);
                  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
