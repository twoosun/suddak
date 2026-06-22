import { NextResponse } from "next/server";

import {
  getNaesinddakStoragePath,
  isNaesinddakFileKey,
  NAESINDDAK_STORAGE_BUCKET,
} from "@/lib/naesin/data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromAuthHeader, isAdminUser } from "@/lib/training/auth";

export async function GET(req: Request, ctx: RouteContext<"/api/naesinddak/materials/[materialId]/download">) {
  try {
    const user = await getUserFromAuthHeader(req);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { materialId } = await ctx.params;
    const url = new URL(req.url);
    const fileKey = url.searchParams.get("file");

    if (!isNaesinddakFileKey(fileKey)) {
      return NextResponse.json({ error: "요청한 파일을 찾을 수 없습니다." }, { status: 400 });
    }

    const isAdmin = await isAdminUser(user.id);

    if (!isAdmin) {
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from("naesinddak_material_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("material_id", materialId)
        .maybeSingle();

      if (purchaseError) throw purchaseError;

      if (!purchase) {
        return NextResponse.json({ error: "구매한 자료만 다운로드할 수 있습니다." }, { status: 403 });
      }
    }

    const storagePath = await getNaesinddakStoragePath(materialId, fileKey);

    if (!storagePath) {
      return NextResponse.json({ error: "요청한 파일을 찾을 수 없습니다." }, { status: 400 });
    }

    if (url.searchParams.get("attachment") === "1") {
      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from(NAESINDDAK_STORAGE_BUCKET)
        .download(storagePath);

      if (downloadError || !blob) {
        console.error("[api/naesinddak/download] file download error:", downloadError);
        return NextResponse.json(
          { error: "자료 파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요." },
          { status: 500 }
        );
      }

      const filename = encodeURIComponent(storagePath.split("/").pop() ?? `${fileKey}.pdf`);

      return new NextResponse(blob, {
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(NAESINDDAK_STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60);

    if (error || !data?.signedUrl) {
      console.error("[api/naesinddak/download] signed url error:", error);
      return NextResponse.json(
        { error: "자료 파일이 준비 중입니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    if (url.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(data.signedUrl);
    }

    return NextResponse.json({ url: data.signedUrl, expiresIn: 60 });
  } catch (error) {
    console.error("[api/naesinddak/download] error:", error);
    return NextResponse.json({ error: "다운로드를 준비하지 못했습니다." }, { status: 500 });
  }
}
