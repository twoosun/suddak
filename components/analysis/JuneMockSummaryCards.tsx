import { JUNE_MOCK_SUMMARY_CARDS } from "@/lib/juneMockAnalysis";

export default function JuneMockSummaryCards() {
  return (
    <section className="june-analysis-section">
      <div className="june-analysis-section-head">
        <h2>이번 6평, 무엇이 중요했을까요?</h2>
        <p>단순한 계산보다 조건을 해석하고 풀이 구조를 정리하는 힘이 중요했습니다.</p>
      </div>
      <div className="june-analysis-summary-grid">
        {JUNE_MOCK_SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title} className="suddak-card-soft june-analysis-summary-card">
              <span className="june-analysis-card-icon">
                <Icon size={22} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
