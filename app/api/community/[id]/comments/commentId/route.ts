import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/* # 1. 요청 유저 */
async function getUserFromRequest(req: NextRequest) {
  const supabase = createAdminClient();
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "인증 정보가 없습니다.", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "유효하지 않은 사용자입니다.", status: 401 };
  }

  return { user, error: null, status: 200 };
}

/* # 2. 관리자 여부 */
async function getIsAdmin(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; commentId: string }>
      | { id: string; commentId: string };
  }
) {
  try {
    const supabase = createAdminClient();

    const resolvedParams =
      typeof (params as Promise<{ id: string; commentId: string }>).then === "function"
        ? await (params as Promise<{ id: string; commentId: string }>)
        : (params as { id: string; commentId: string });

    const postId = resolvedParams.id?.trim();
    const commentId = resolvedParams.commentId?.trim();

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const authResult = await getUserFromRequest(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const isAdmin = await getIsAdmin(supabase, user.id);

    const { data: comment, error: commentError } = await supabase
      .from("community_comments")
      .select("id, post_id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) {
      return NextResponse.json(
        { error: "댓글을 확인하지 못했습니다." },
        { status: 500 }
      );
    }

    if (!comment || String(comment.post_id) !== postId) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!isAdmin && comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인 댓글 또는 관리자만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("community_comments")
      .delete()
      .or(`id.eq.${commentId},parent_comment_id.eq.${commentId}`);

    if (error) {
      return NextResponse.json(
        { error: "댓글 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: isAdmin ? "관리자 권한으로 댓글을 삭제했습니다." : "댓글이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("[DELETE /api/community/[id]/comments/[commentId]] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}