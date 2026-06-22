"use client";

import { getSessionWithRecovery } from "@/lib/supabase";
import type { NaesinDownloadAsset } from "@/lib/naesin/types";

export async function downloadNaesinddakAsset(materialId: string, asset: NaesinDownloadAsset) {
  if (!asset.key) {
    throw new Error("다운로드할 파일 정보가 없습니다.");
  }

  const session = await getSessionWithRecovery();

  if (!session?.access_token) {
    throw new Error("로그인이 필요합니다.");
  }

  const res = await fetch(
    `/api/naesinddak/materials/${materialId}/download?file=${asset.key}&download=1`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "다운로드를 준비하지 못했습니다.");
  }

  const data = (await res.json()) as { url?: string };

  if (!data.url) {
    throw new Error("다운로드 링크를 생성하지 못했습니다.");
  }

  window.location.assign(data.url);
}
