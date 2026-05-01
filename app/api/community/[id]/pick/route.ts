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

async function getUserFromRequest(req: NextRequest) {
  const supabase = createAdminClient();
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "로그인이 필요합니다.", status: 401 };
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const resolvedParams = await Promise.resolve(
      params as { id: string } | Promise<{ id: string }>
    );
    const postId = String(resolvedParams?.id || "").trim();

    if (!postId) {
      return NextResponse.json(
        { error: "게시글 ID가 올바르지 않습니다." },
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

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, is_public")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[POST /api/community/[id]/pick] post error:", postError);
      return NextResponse.json(
        { error: "게시글 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!post.is_public) {
      return NextResponse.json(
        { error: "비공개 게시글에는 딱픽할 수 없습니다." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase.rpc("toggle_community_post_pick", {
      p_post_id: postId,
      p_user_id: authResult.user.id,
    });

    if (error) {
      console.error("[POST /api/community/[id]/pick] toggle error:", error);
      return NextResponse.json(
        { error: "딱픽 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      picked: Boolean(result?.picked),
      pick_count: Math.max(Number(result?.pick_count ?? 0), 0),
      is_pick_post: Boolean(result?.is_pick_post),
    });
  } catch (error) {
    console.error("[POST /api/community/[id]/pick] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
