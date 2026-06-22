"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Lock, PlayCircle, WalletCards, X } from "lucide-react";

import { getSessionWithRecovery } from "@/lib/supabase";
import { downloadNaesinddakAsset } from "@/lib/naesin/download-client";
import type { NaesinDownloadAsset, NaesinExamSet } from "@/lib/naesin/types";

type Props = {
  examSet: NaesinExamSet;
};

type AccessState = {
  authenticated: boolean;
  isOwned: boolean;
  canDownload: boolean;
  isAdmin: boolean;
  credits: number | null;
  priceDdak: number;
};

type Notice = {
  tone: "info" | "success" | "error";
  text: string;
};

const DEFAULT_ACCESS: AccessState = {
  authenticated: false,
  isOwned: false,
  canDownload: false,
  isAdmin: false,
  credits: null,
  priceDdak: 1000,
};

function downloadLabel(asset: NaesinDownloadAsset) {
  return `${asset.label} ${asset.format}`;
}

export default function ExamSetCard({ examSet }: Props) {
  const priceDdak = examSet.priceDdak ?? 1000;
  const [access, setAccess] = useState<AccessState>({ ...DEFAULT_ACCESS, priceDdak });
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const visibleDownloads = useMemo(
    () => examSet.downloads.filter((asset) => asset.key && asset.available),
    [examSet.downloads]
  );

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      setLoadingAccess(true);
      const session = await getSessionWithRecovery();
      const headers: HeadersInit = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      try {
        const res = await fetch(`/api/naesinddak/materials/${examSet.id}/access`, { headers });
        const data = (await res.json()) as Partial<AccessState>;

        if (!active) return;

        setAccess({
          authenticated: Boolean(data.authenticated),
          isOwned: Boolean(data.isOwned),
          canDownload: Boolean(data.canDownload),
          isAdmin: Boolean(data.isAdmin),
          credits: typeof data.credits === "number" ? data.credits : null,
          priceDdak: typeof data.priceDdak === "number" ? data.priceDdak : priceDdak,
        });
      } catch {
        if (active) {
          setAccess({ ...DEFAULT_ACCESS, priceDdak });
        }
      } finally {
        if (active) setLoadingAccess(false);
      }
    }

    void loadAccess();

    return () => {
      active = false;
    };
  }, [examSet.id, priceDdak]);

  const statusLabel = access.isAdmin
    ? "관리자 열람 가능"
    : access.canDownload
      ? "구매 완료"
      : `${access.priceDdak.toLocaleString("ko-KR")}딱`;

  function handlePrimaryAction() {
    setNotice(null);

    if (access.canDownload) {
      setDownloadOpen(true);
      return;
    }

    if (!access.authenticated) {
      setNotice({ tone: "error", text: "로그인이 필요합니다." });
      setPurchaseOpen(true);
      return;
    }

    setPurchaseOpen(true);
  }

  async function purchaseMaterial() {
    setBusy(true);
    setNotice(null);

    try {
      const session = await getSessionWithRecovery();
      if (!session?.access_token) {
        setNotice({ tone: "error", text: "로그인이 필요합니다." });
        return;
      }

      const res = await fetch(`/api/naesinddak/materials/${examSet.id}/purchase`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        alreadyOwned?: boolean;
        isAdmin?: boolean;
        credits?: number;
        priceDdak?: number;
        message?: string;
      };

      if (!res.ok || !data.success) {
        const currentCredits = typeof data.credits === "number" ? data.credits : access.credits;
        setAccess((prev) => ({
          ...prev,
          credits: currentCredits,
          priceDdak: typeof data.priceDdak === "number" ? data.priceDdak : prev.priceDdak,
        }));
        setNotice({
          tone: "error",
          text:
            data.error === "딱이 부족합니다." && typeof currentCredits === "number"
              ? `딱이 부족합니다. 현재 ${currentCredits.toLocaleString("ko-KR")}딱을 보유하고 있으며, 이 자료를 잠금 해제하려면 ${access.priceDdak.toLocaleString("ko-KR")}딱이 필요합니다.`
              : data.error || "구매를 처리하지 못했습니다.",
        });
        return;
      }

      setAccess((prev) => ({
        ...prev,
        authenticated: true,
        isOwned: !data.isAdmin,
        canDownload: true,
        isAdmin: Boolean(data.isAdmin),
        credits: typeof data.credits === "number" ? data.credits : prev.credits,
      }));
      setNotice({
        tone: "success",
        text: data.alreadyOwned
          ? "이미 잠금 해제된 자료입니다."
          : "자료가 잠금 해제되었습니다. 이제 문제지와 정답·해설을 다운로드할 수 있습니다.",
      });
      setPurchaseOpen(false);
      setDownloadOpen(true);
    } catch {
      setNotice({ tone: "error", text: "네트워크 오류로 구매를 처리하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }

  async function downloadAsset(asset: NaesinDownloadAsset) {
    if (!asset.key) return;

    setBusy(true);
    setNotice(null);

    try {
      await downloadNaesinddakAsset(examSet.id, asset);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "다운로드 요청 중 오류가 발생했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="suddak-card-soft naesin-exam-card">
      <Link href={`/naesin/${examSet.id}`} className="naesin-exam-card-main">
        <div className="naesin-card-badges">
          {(examSet.tags?.length ? examSet.tags : [examSet.subjectLabel, examSet.materialType]).map((tag) => (
            <span key={tag} className="suddak-badge">
              {tag}
            </span>
          ))}
          {examSet.featured && <span className="suddak-badge naesin-badge-accent">추천</span>}
        </div>

        <h3 className="naesin-card-title">{examSet.title}</h3>
        <p className="naesin-card-description">{examSet.description}</p>

        <div className="naesin-meta-grid">
          <span>{examSet.problemCountLabel ?? `${examSet.problemCount}문항`}</span>
          <span>{examSet.setCountLabel ?? examSet.difficulty}</span>
          <span>{examSet.estimatedMinutesLabel ?? `${examSet.estimatedMinutes}분`}</span>
          <span>{examSet.publishStatus}</span>
        </div>

        <div className="naesin-price-row">
          <span>{loadingAccess ? "상태 확인 중" : statusLabel}</span>
          {typeof access.credits === "number" && !access.isAdmin && (
            <span>보유 {access.credits.toLocaleString("ko-KR")}딱</span>
          )}
        </div>
      </Link>

      {notice && <div className={`naesin-notice naesin-notice-${notice.tone}`}>{notice.text}</div>}

      <div className="naesin-card-actions naesin-card-actions-purchase">
        <button
          type="button"
          className="suddak-btn suddak-btn-primary"
          onClick={handlePrimaryAction}
          disabled={loadingAccess || busy}
        >
          {access.canDownload ? <Download size={16} /> : <WalletCards size={16} />}
          {access.canDownload ? "자료 다운로드" : `${access.priceDdak.toLocaleString("ko-KR")}딱으로 잠금`}
        </button>
        <Link
          href={`/naesin/${examSet.id}`}
          className="suddak-btn suddak-btn-ghost"
          aria-label={`${examSet.units[0] ?? examSet.title} 상세 정보 보기`}
        >
          <FileText size={16} />
          상세
        </Link>
      </div>

      <button type="button" className="suddak-btn suddak-btn-ghost naesin-online-disabled" disabled aria-disabled="true">
        <PlayCircle size={16} />
        온라인 풀이 기능은 준비 중입니다.
      </button>

      {purchaseOpen && (
        <div className="naesin-modal-backdrop" role="presentation">
          <div className="suddak-card naesin-modal" role="dialog" aria-modal="true" aria-labelledby={`${examSet.id}-purchase-title`}>
            <div className="naesin-modal-head">
              <h2 id={`${examSet.id}-purchase-title`}>자료를 잠금 해제할까요?</h2>
              <button type="button" className="naesin-icon-button" onClick={() => setPurchaseOpen(false)} aria-label="구매 확인 닫기">
                <X size={18} />
              </button>
            </div>
            <p>
              {access.priceDdak.toLocaleString("ko-KR")}딱을 사용하여 {examSet.title}을 잠금 해제합니다.
              한 번 잠금 해제하면 문제지와 정답·해설을 계속 다운로드할 수 있습니다.
            </p>
            {notice && <div className={`naesin-notice naesin-notice-${notice.tone}`}>{notice.text}</div>}
            <div className="naesin-modal-actions">
              <button type="button" className="suddak-btn suddak-btn-ghost" onClick={() => setPurchaseOpen(false)} disabled={busy}>
                취소
              </button>
              {!access.authenticated ? (
                <Link href="/login" className="suddak-btn suddak-btn-primary">
                  로그인하러 가기
                </Link>
              ) : (
                <button type="button" className="suddak-btn suddak-btn-primary" onClick={purchaseMaterial} disabled={busy}>
                  <WalletCards size={16} />
                  {busy ? "처리 중..." : `${access.priceDdak.toLocaleString("ko-KR")}딱으로 잠금`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {downloadOpen && (
        <div className="naesin-modal-backdrop" role="presentation">
          <div className="suddak-card naesin-modal" role="dialog" aria-modal="true" aria-labelledby={`${examSet.id}-download-title`}>
            <div className="naesin-modal-head">
              <h2 id={`${examSet.id}-download-title`}>자료 다운로드</h2>
              <button type="button" className="naesin-icon-button" onClick={() => setDownloadOpen(false)} aria-label="다운로드 닫기">
                <X size={18} />
              </button>
            </div>
            <p>잠금 해제한 자료는 추가 결제 없이 다시 다운로드할 수 있습니다.</p>
            {notice && <div className={`naesin-notice naesin-notice-${notice.tone}`}>{notice.text}</div>}
            <div className="naesin-download-list">
              {visibleDownloads.map((asset) => (
                <button
                  key={asset.key}
                  type="button"
                  className="suddak-card-soft naesin-download-card"
                  onClick={() => void downloadAsset(asset)}
                  disabled={busy}
                  aria-label={`${examSet.units[0] ?? examSet.title} ${downloadLabel(asset)} 다운로드`}
                >
                  {busy ? <Lock size={18} /> : <Download size={18} />}
                  <div>
                    <strong>{downloadLabel(asset)}</strong>
                    <span>클릭하면 바로 다운로드됩니다</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
