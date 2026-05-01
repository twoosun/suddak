import Link from "next/link";

import { naesinSubjects } from "@/lib/naesin/mock-data";
import type { NaesinSubject } from "@/lib/naesin/types";

type Props = {
  selected: NaesinSubject;
};

export default function SubjectFilter({ selected }: Props) {
  return (
    <nav className="naesin-filter" aria-label="과목 필터">
      {naesinSubjects.map((subject) => {
        const active = subject.value === selected;
        const href = subject.value === "all" ? "/naesin" : `/naesin?subject=${subject.value}`;

        return (
          <Link
            key={subject.value}
            href={href}
            className={`naesin-filter-chip ${active ? "naesin-filter-chip-active" : ""}`}
          >
            {subject.label}
          </Link>
        );
      })}
    </nav>
  );
}
