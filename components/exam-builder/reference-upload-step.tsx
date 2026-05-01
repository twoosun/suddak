import { FileUp, Plus, SearchCheck } from "lucide-react";

import { referenceFileKinds } from "@/lib/exam-builder/mock-data";
import type { ReferenceFile, ReferenceFileKind } from "@/lib/exam-builder/types";

type Props = {
  files: ReferenceFile[];
  selectedKind: ReferenceFileKind;
  onKindChange: (kind: ReferenceFileKind) => void;
  onMockAddFile: () => void;
  onAnalyze: () => void;
};

export default function ReferenceUploadStep({
  files,
  selectedKind,
  onKindChange,
  onMockAddFile,
  onAnalyze,
}: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-upload-box">
        <FileUp size={24} />
        <div>
          <strong>참고 파일 업로드</strong>
          <p>PDF, DOCX, PNG, JPG 파일을 지원할 예정입니다. 현재는 mock 분석 버튼으로 흐름을 확인합니다.</p>
        </div>
      </div>

      <div className="exam-builder-upload-controls">
        <label>
          자료 유형
          <select
            className="suddak-select"
            value={selectedKind}
            onChange={(event) => onKindChange(event.target.value as ReferenceFileKind)}
          >
            {referenceFileKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label>
          참고 파일
          <input className="suddak-input" type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" />
        </label>
      </div>

      <div className="exam-builder-file-list">
        {files.map((file) => (
          <div key={file.id} className="suddak-card-soft exam-builder-file-row">
            <div>
              <strong>{file.name}</strong>
              <span>
                {file.kind} · {file.sizeLabel}
              </span>
            </div>
            <span className="suddak-badge">{file.status}</span>
          </div>
        ))}
      </div>

      <div className="exam-builder-action-row">
        <button type="button" className="suddak-btn suddak-btn-ghost" onClick={onMockAddFile}>
          <Plus size={16} />
          mock 파일 추가
        </button>
        <button type="button" className="suddak-btn suddak-btn-primary" onClick={onAnalyze}>
          <SearchCheck size={16} />
          mock 분석 시작
        </button>
      </div>
    </div>
  );
}
