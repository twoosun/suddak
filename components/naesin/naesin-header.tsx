import Link from "next/link";
import { BookOpenCheck, Home, ShieldCheck, Wrench } from "lucide-react";

type Props = {
  compact?: boolean;
};

export default function NaesinHeader({ compact = false }: Props) {
  return (
    <header className="suddak-card naesin-header">
      <Link href="/naesin" className="naesin-brand">
        <div className="naesin-brand-icon">
          <BookOpenCheck size={24} />
        </div>
        <div>
          <div className="naesin-brand-title">내신딱딱</div>
          <div className="naesin-brand-subtitle">
            시험 범위에 맞춰 딱 필요한 문제만 모았습니다.
          </div>
        </div>
      </Link>

      {!compact && (
        <div className="naesin-header-actions">
          <Link href="/" className="suddak-btn suddak-btn-ghost">
            <Home size={16} />
            수딱
          </Link>
          <Link href="/admin/exam-builder" className="suddak-btn suddak-btn-primary">
            <Wrench size={16} />
            제작기
          </Link>
        </div>
      )}

      {compact && (
        <div className="naesin-header-actions">
          <span className="suddak-badge">
            <ShieldCheck size={14} />
            자체 변형 문항
          </span>
        </div>
      )}
    </header>
  );
}
