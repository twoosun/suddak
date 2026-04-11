import Link from "next/link";

type TopLinksProps = {
  variant?: "home" | "community";
};

export default function TopLinks({
  variant = "home",
}: TopLinksProps) {
  const isHome = variant === "home";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/"
        className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          isHome
            ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white/80 text-zinc-700 backdrop-blur hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
        }`}
      >
        <span className="transition group-hover:-translate-x-0.5">⌂</span>
        홈
      </Link>

      <Link
        href="/community"
        className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          !isHome
            ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white/80 text-zinc-700 backdrop-blur hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
        }`}
      >
        <span className="transition group-hover:translate-x-0.5">◌</span>
        커뮤니티
      </Link>
    </div>
  );
}