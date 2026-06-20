import { NextRequest } from "next/server";

import {
  createStorageAccessUrl,
  GENERATED_EXAMS_BUCKET,
  PROBLEM_SET_FILES_BUCKET,
  requireAdmin,
  type StorageBucketName,
  THUMBNAILS_BUCKET,
} from "@/lib/problem-bank/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedBuckets = new Set<StorageBucketName>([PROBLEM_SET_FILES_BUCKET, GENERATED_EXAMS_BUCKET, THUMBNAILS_BUCKET]);

function isAllowedBucket(value: string): value is StorageBucketName {
  return allowedBuckets.has(value as StorageBucketName);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  try {
    const body = (await req.json()) as { bucket?: unknown; path?: unknown; expiresIn?: unknown };
    const bucket = String(body.bucket || "");
    const path = String(body.path || "");
    const expiresIn = typeof body.expiresIn === "number" ? body.expiresIn : undefined;

    if (!isAllowedBucket(bucket)) {
      return Response.json({ error: "허용되지 않은 Storage 버킷입니다." }, { status: 400 });
    }

    if (!path.trim()) {
      return Response.json({ error: "업로드된 파일이 없습니다." }, { status: 404 });
    }

    const result = await createStorageAccessUrl(bucket, path, expiresIn);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "파일 접근 URL을 만들지 못했습니다." },
      { status: 400 }
    );
  }
}
