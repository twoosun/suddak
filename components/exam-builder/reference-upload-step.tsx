import { FileUp, SearchCheck, Upload } from "lucide-react";

import { referenceFileKinds } from "@/lib/exam-builder/mock-data";
import type { ReferenceFile, ReferenceFileKind } from "@/lib/exam-builder/types";

type Props = {
  files: ReferenceFile[];
  selectedKind: ReferenceFileKind;
  onKindChange: (kind: ReferenceFileKind) => void;
  onFilesSelected: (files: FileList | null) => void;
  onAnalyze: () => void;
};

export default function ReferenceUploadStep({
  files,
  selectedKind,
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
              </div>
              <span className="suddak-badge">{file.status}</span>
            </div>
          ))
        )}
      </div>

      <div className="exam-builder-action-row">
        <div className="suddak-card-soft exam-builder-upload-hint">
          <Upload size={16} />
          <span>파일은 아직 서버에 저장하지 않고 브라우저 세션에서만 mock 분석에 사용합니다.</span>
        </div>
        <button
          type="button"
          className="suddak-btn suddak-btn-primary"
          onClick={onAnalyze}
          disabled={files.length === 0}
        >
          <SearchCheck size={16} />
          mock 분석 시작
        </button>
      </div>
    </div>
  );
}
