"use client";

import { getSessionWithRecovery } from "@/lib/supabase";

export async function getAdminToken() {
  const session = await getSessionWithRecovery();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  return session.access_token;
}

export async function readAdminJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!res.ok) throw new Error(data.error || `요청에 실패했습니다. (${res.status})`);
  return data;
}

export async function adminFetch<T>(url: string, init: RequestInit = {}) {
  const token = await getAdminToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  return readAdminJson<T>(res);
}

export async function openAdminStorageFile(bucket: string, path: string | null | undefined, expiresIn = 60 * 10) {
  if (!path) throw new Error("업로드된 파일이 없습니다.");
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  const data = await adminFetch<{ url: string }>("/api/admin/storage/signed-url", {
    method: "POST",
    body: JSON.stringify({ bucket, path, expiresIn }),
  });
  if (popup) {
    popup.location.href = data.url;
  } else {
    window.location.href = data.url;
  }
}

export function toJsonOrString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}
