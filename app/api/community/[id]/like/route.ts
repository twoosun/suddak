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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createAdminClient();

    const resolvedParams =
      typeof (params as Promise<{ id: string }>).then === "function"
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });

    const postId = resolvedParams.id?.trim();

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

    const user = authResult.user;

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, is_public, like_count")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[POST /api/community/[id]/like] post error:", postError);
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
        { error: "비공개 게시글에는 좋아요를 누를 수 없습니다." },
        { status: 403 }
      );
    }

    const { data: existingLike, error: likeFindError } = await supabase
      .from("community_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (likeFindError) {
      console.error("[POST /api/community/[id]/like] find like error:", likeFindError);
      return NextResponse.json(
        { error: "좋아요 상태를 확인하지 못했습니다." },
        { status: 500 }
      );
    }

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("community_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        console.error("[POST /api/community/[id]/like] delete like error:", deleteError);
        return NextResponse.json(
          { error: "좋아요 취소에 실패했습니다." },
          { status: 500 }
        );
      }

      const { data: refreshedPost } = await supabase
        .from("community_posts")
        .select("like_count")
        .eq("id", postId)
        .maybeSingle();

      return NextResponse.json({
        message: "좋아요를 취소했습니다.",
        liked: false,
        like_count: refreshedPost?.like_count ?? Math.max((post.like_count ?? 1) - 1, 0),
      });
    }

    const { error: insertError } = await supabase
      .from("community_likes")
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    if (insertError) {
      console.error("[POST /api/community/[id]/like] insert like error:", insertError);
      return NextResponse.json(
        { error: "좋아요에 실패했습니다." },
        { status: 500 }
      );
    }

    const { data: refreshedPost } = await supabase
      .from("community_posts")
      .select("like_count")
      .eq("id", postId)
      .maybeSingle();

    return NextResponse.json({
      message: "좋아요를 눌렀습니다.",
      liked: true,
      like_count: refreshedPost?.like_count ?? (post.like_count ?? 0) + 1,
    });
  } catch (error) {
    console.error("[POST /api/community/[id]/like] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}