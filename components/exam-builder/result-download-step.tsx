import { Download, Send } from "lucide-react";

import type { BuilderResultAsset } from "@/lib/exam-builder/types";

type Props = {
  assets: BuilderResultAsset[];
};

export default function ResultDownloadStep({ assets }: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-result-grid">
        {assets.map((asset) => (
          <a
            key={`${asset.label}-${asset.format}`}
            href="#"
            className="suddak-card-soft exam-builder-result-card"
          >
            <Download size={18} />
            <div>
              <strong>
                {asset.label} {asset.format}
              </strong>
              <span>{asset.status}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="exam-builder-publish-box">
        <div>
          <strong>내신딱딱에 공개 게시</strong>
          <p>검수 완료 후 예상기출 목록에 공개하거나 비공개 저장할 수 있습니다.</p>
        </div>
        <button type="button" className="suddak-btn suddak-btn-primary">
          <Send size={16} />
          게시 준비
        </button>
      </div>
    </div>
  );
}
