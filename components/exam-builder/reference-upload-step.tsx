import { FileUp, SearchCheck, Upload } from "lucide-react";

import { referenceFileKinds } from "@/lib/exam-builder/mock-data";
import type { ReferenceFile, ReferenceFileKind } from "@/lib/exam-builder/types";

type Props = {
  files: ReferenceFile[];
  selectedKind: ReferenceFileKind;
  canAnalyze: boolean;
  onKindChange: (kind: ReferenceFileKind) => void;
  onFilesSelected: (files: FileList | null) => void;
  onAnalyze: () => void;
};

export default function ReferenceUploadStep({
  files,
  selectedKind,
  canAnalyze,
  onKindChange,
  onFilesSelected,
  onAnalyze,
}: Props) {
  return (
    <div className="exam-builder-step">
      <div className="exam-builder-upload-box">
        <FileUp size={24} />
        <div>
          <strong>참고 파일 업로드</strong>
          <p>PDF, DOCX, PNG, JPG 파일을 선택하면 현재 제작 세션의 참고 자료 목록에 추가됩니다.</p>
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
          <input
            className="suddak-input"
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            multiple
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="exam-builder-file-list">
        {files.length === 0 ? (
          <div className="suddak-card-soft exam-builder-empty-state">
            아직 업로드한 참고 파일이 없습니다.
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="suddak-card-soft exam-builder-file-row">
              <div>
                <strong>{file.name}</strong>
                <span>
                  {file.kind} · {file.sizeLabel}
                </span>
                {file.errorMessage && <span>{file.errorMessage}</span>}
              </div>
              <span className="suddak-badge">{file.status}</span>
            </div>
          ))
        )}
      </div>

      <div className="exam-builder-action-row">
        <div className="suddak-card-soft exam-builder-upload-hint">
          <Upload size={16} />
          <span>서버 저장이 실패해도 현재 브라우저 세션의 파일로 mock 분석을 진행할 수 있습니다.</span>
        </div>
        <button
          type="button"
          className="suddak-btn suddak-btn-primary"
          onClick={onAnalyze}
          disabled={!canAnalyze}
        >
          <SearchCheck size={16} />
          분석 시작
        </button>
      </div>
    </div>
  );
}
