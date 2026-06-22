"use client";

import { getSessionWithRecovery } from "@/lib/supabase";
import type { NaesinDownloadAsset } from "@/lib/naesin/types";

function fallbackDownloadName(asset: NaesinDownloadAsset) {
  if (asset.downloadName) return asset.downloadName;
  if (asset.path) return asset.path.split("/").pop() || `${asset.key ?? "naesinddak-file"}.${asset.format.toLowerCase()}`;
  return `${asset.key ?? "naesinddak-file"}.${asset.format.toLowerCase()}`;
}

export async function downloadNaesinddakAsset(materialId: string, asset: NaesinDownloadAsset) {
  if (!asset.key) {
    throw new Error("다운로드할 파일 정보가 없습니다.");
  }

  const session = await getSessionWithRecovery();

  if (!session?.access_token) {
    throw new Error("로그인이 필요합니다.");
  }

  const res = await fetch(
    `/api/naesinddak/materials/${materialId}/download?file=${asset.key}&attachment=1`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "다운로드를 준비하지 못했습니다.");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fallbackDownloadName(asset);
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}
