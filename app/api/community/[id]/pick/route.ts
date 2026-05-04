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
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = createAdminClient();
    const resolvedParams = await Promise.resolve(params);
    const postId = String(resolvedParams?.id || "").trim();

    if (!postId) {
      return NextResponse.json({ error: "게시글 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const authResult = await getUserFromRequest(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, is_public")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[POST /api/community/[id]/pick] post error:", postError);
      return NextResponse.json({ error: "게시글 정보를 불러오지 못했습니다." }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!post.is_public) {
      return NextResponse.json({ error: "비공개 게시글에는 딱픽할 수 없습니다." }, { status: 403 });
    }

    const { data: existingPick, error: pickLookupError } = await supabase
      .from("community_post_picks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (pickLookupError) {
      console.error("[POST /api/community/[id]/pick] pick lookup error:", pickLookupError);
      return NextResponse.json({ error: "딱픽 상태를 확인하지 못했습니다." }, { status: 500 });
    }

    const wasPicked = Boolean(existingPick);

    if (wasPicked) {
      const { error: deleteError } = await supabase
        .from("community_post_picks")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", authResult.user.id);

      if (deleteError) {
        console.error("[POST /api/community/[id]/pick] delete error:", deleteError);
        return NextResponse.json({ error: "딱픽 해제에 실패했습니다." }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("community_post_picks")
        .insert({ post_id: postId, user_id: authResult.user.id });

      if (insertError) {
        console.error("[POST /api/community/[id]/pick] insert error:", insertError);
        return NextResponse.json({ error: "딱픽 등록에 실패했습니다." }, { status: 500 });
      }
    }

    const { count, error: countError } = await supabase
      .from("community_post_picks")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      console.error("[POST /api/community/[id]/pick] count error:", countError);
      return NextResponse.json({ error: "딱픽 수를 갱신하지 못했습니다." }, { status: 500 });
    }

    const nextPickCount = Math.max(count ?? 0, 0);
    const nextIsPickPost = nextPickCount >= 5;

    const { error: updatePostError } = await supabase
      .from("community_posts")
      .update({ pick_count: nextPickCount, is_pick_post: nextIsPickPost })
      .eq("id", postId);

    if (updatePostError) {
      console.error("[POST /api/community/[id]/pick] post update error:", updatePostError);
      return NextResponse.json({ error: "딱픽 상태 반영에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      picked: !wasPicked,
      pick_count: nextPickCount,
      is_pick_post: nextIsPickPost,
    });
  } catch (error) {
    console.error("[POST /api/community/[id]/pick] unexpected error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
