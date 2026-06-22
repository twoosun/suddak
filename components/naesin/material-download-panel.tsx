"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Lock, WalletCards } from "lucide-react";

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

const defaultAccess: AccessState = {
  authenticated: false,
  isOwned: false,
  canDownload: false,
  isAdmin: false,
  credits: null,
  priceDdak: 1000,
};

function assetLabel(asset: NaesinDownloadAsset) {
  return `${asset.label} ${asset.format}`;
}

export default function MaterialDownloadPanel({ examSet }: Props) {
  const [access, setAccess] = useState<AccessState>({
    ...defaultAccess,
    priceDdak: examSet.priceDdak ?? 1000,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const downloads = useMemo(
    () => examSet.downloads.filter((asset) => asset.key && asset.available),
    [examSet.downloads]
  );

  const refreshAccess = useCallback(async () => {
    const session = await getSessionWithRecovery();
    const headers: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};

    const res = await fetch(`/api/naesinddak/materials/${examSet.id}/access`, { headers });
    const data = (await res.json()) as Partial<AccessState>;

    setAccess({
      authenticated: Boolean(data.authenticated),
      isOwned: Boolean(data.isOwned),
      canDownload: Boolean(data.canDownload),
      isAdmin: Boolean(data.isAdmin),
      credits: typeof data.credits === "number" ? data.credits : null,
      priceDdak: typeof data.priceDdak === "number" ? data.priceDdak : examSet.priceDdak ?? 1000,
    });
  }, [examSet.id, examSet.priceDdak]);

  useEffect(() => {
    void refreshAccess().catch(() => {
      setMessage("자료 상태를 불러오지 못했습니다.");
    });
  }, [refreshAccess]);

  async function purchase() {
    setBusy(true);
    setMessage(null);

    try {
      const session = await getSessionWithRecovery();
      if (!session?.access_token) {
        setMessage("로그인이 필요합니다.");
        return;
      }

      const res = await fetch(`/api/naesinddak/materials/${examSet.id}/purchase`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await res.json()) as { error?: string; message?: string; credits?: number; success?: boolean };

      if (!res.ok || !data.success) {
        setMessage(data.error || "구매를 처리하지 못했습니다.");
        if (typeof data.credits === "number") {
          setAccess((prev) => ({ ...prev, credits: data.credits ?? prev.credits }));
        }
        return;
      }

      setMessage(data.message || "자료가 잠금 해제되었습니다.");
      await refreshAccess();
    } finally {
      setBusy(false);
    }
  }

  async function download(asset: NaesinDownloadAsset) {
    if (!asset.key) return;

    setBusy(true);
    setMessage(null);

    try {
      await downloadNaesinddakAsset(examSet.id, asset);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "다운로드를 준비하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="naesin-material-panel">
      <div className="naesin-price-row">
        <span>
          {access.isAdmin
            ? "관리자 열람 가능"
            : access.canDownload
              ? "구매 완료"
              : `${access.priceDdak.toLocaleString("ko-KR")}딱`}
        </span>
        {typeof access.credits === "number" && !access.isAdmin && (
          <span>보유 {access.credits.toLocaleString("ko-KR")}딱</span>
        )}
      </div>

      {message && <div className="naesin-notice naesin-notice-info">{message}</div>}

      {!access.authenticated ? (
        <Link href="/login" className="suddak-btn suddak-btn-primary">
          로그인하고 구매하기
        </Link>
      ) : !access.canDownload ? (
        <button type="button" className="suddak-btn suddak-btn-primary" onClick={purchase} disabled={busy}>
          <WalletCards size={16} />
          {busy ? "처리 중..." : `${access.priceDdak.toLocaleString("ko-KR")}딱으로 잠금`}
        </button>
      ) : null}

      <div className="naesin-download-list">
        {downloads.map((asset) => (
          <button
            key={asset.key}
            type="button"
            className={`suddak-card-soft naesin-download-card ${
              !access.canDownload ? "naesin-download-card-disabled" : ""
            }`}
            onClick={() => void download(asset)}
            disabled={!access.canDownload || busy}
            aria-label={`${examSet.units[0] ?? examSet.title} ${assetLabel(asset)} 다운로드`}
          >
            {access.canDownload ? <Download size={18} /> : <Lock size={18} />}
            <div>
              <strong>{assetLabel(asset)}</strong>
              <span>{access.canDownload ? "클릭하면 바로 다운로드됩니다" : "구매 후 다운로드 가능"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
