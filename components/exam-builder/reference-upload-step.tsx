import { FileUp, SearchCheck } from "lucide-react";

import type { ReferenceFile } from "@/lib/exam-builder/types";

type Props = {
  files: ReferenceFile[];
  onAnalyze: () => void;
};

export default function ReferenceUploadStep({ files, onAnalyze }: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-upload-box">
        <FileUp size={24} />
        <div>
          <strong>참고 자료 업로드</strong>
          <p>수특, 수완, 기출, 학교 프린트, 기존 시험지를 분석용 자료로 올립니다.</p>
        </div>
      </div>

      <div className="exam-builder-file-list">
        {files.map((file) => (
          <div key={file.id} className="suddak-card-soft exam-builder-file-row">
            <div>
              <strong>{file.name}</strong>
              <span>
                {file.kind} · {file.pageCount}쪽
              </span>
            </div>
            <span className="suddak-badge">{file.status}</span>
          </div>
        ))}
      </div>

      <button type="button" className="suddak-btn suddak-btn-primary" onClick={onAnalyze}>
        <SearchCheck size={16} />
        파일 분석 결과 보기
      </button>
    </div>
  );
}
