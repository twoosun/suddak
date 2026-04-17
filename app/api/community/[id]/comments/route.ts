import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/server/notifications";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createUserClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function enrichCommentsWithAuthors(
  supabase: ReturnType<typeof createAdminClient>,
  comments: any[]
) {
  const uniqueUserIds = [...new Set(comments.map((comment) => comment.user_id).filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return comments.map((comment) => ({
      ...comment,
      author_name: "익명",
      author_avatar_url: null,
    }));
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueUserIds);

  const profileMap = new Map<
    string,
    { name: string; avatar_url: string | null }
  >();

  for (const profile of profiles || []) {
    profileMap.set(profile.id, {
      name: profile.full_name || "익명",
      avatar_url: profile.avatar_url || null,
    });
  }

  return comments.map((comment) => ({
    ...comment,
    author_name: profileMap.get(comment.user_id)?.name ?? "익명",
    author_avatar_url: profileMap.get(comment.user_id)?.avatar_url ?? null,
  }));
}

export async function GET(
  _req: NextRequest,
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

    const { data: comments, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/community/[id]/comments] fetch error:", error);
      return NextResponse.json(
        { error: "댓글을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const enriched = await enrichCommentsWithAuthors(supabase, comments || []);

    return NextResponse.json({
      comments: enriched,
    });
  } catch (error) {
    console.error("[GET /api/community/[id]/comments] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
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

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const userClient = createUserClient(token);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "사용자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const parentId =
      typeof body.parent_id === "number" || typeof body.parent_id === "string"
        ? String(body.parent_id).trim()
        : null;

    if (!content) {
      return NextResponse.json(
        { error: "댓글 내용을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "댓글은 1000자 이하여야 합니다." },
        { status: 400 }
      );
    }

    const { data: postRow, error: postError } = await supabase
      .from("community_posts")
      .select("id, user_id, title")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[POST /api/community/[id]/comments] post fetch error:", postError);
      return NextResponse.json(
        { error: "게시글을 확인할 수 없습니다." },
        { status: 500 }
      );
    }

    if (!postRow) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (parentId) {
      const { data: parentExists, error: parentCheckError } = await supabase
        .from("community_comments")
        .select("id, post_id")
        .eq("id", parentId)
        .maybeSingle();

      if (parentCheckError) {
        console.error("[POST /api/community/[id]/comments] parent check error:", parentCheckError);
        return NextResponse.json(
          { error: "부모 댓글을 확인할 수 없습니다." },
          { status: 500 }
        );
      }

      if (!parentExists || String(parentExists.post_id) !== postId) {
        return NextResponse.json(
          { error: "올바르지 않은 부모 댓글입니다." },
          { status: 400 }
        );
      }
    }

    const insertPayload: Record<string, unknown> = {
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId,
    };

    const { data, error } = await supabase
      .from("community_comments")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[POST /api/community/[id]/comments] insert error:", error);
      return NextResponse.json(
        { error: "댓글 등록에 실패했습니다." },
        { status: 500 }
      );
    }

    const { data: actorProfile } = await supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const actorName = actorProfile?.full_name || "누군가";

    if (postRow.user_id && postRow.user_id !== user.id) {
      await createNotification({
        userId: postRow.user_id,
        actorUserId: user.id,
        type: "comment_on_post",
        title: "내 게시글에 새 댓글",
        body: `${actorName}님이 댓글을 남겼어.`,
        targetUrl: `/community/${postId}`,
      });
    }

    if (parentId) {
      const { data: parentComment } = await supabase
        .from("community_comments")
        .select("id, user_id")
        .eq("id", parentId)
        .maybeSingle();

      if (
        parentComment?.user_id &&
        parentComment.user_id !== user.id &&
        parentComment.user_id !== postRow.user_id
      ) {
        await createNotification({
          userId: parentComment.user_id,
          actorUserId: user.id,
          type: "reply_to_comment",
          title: "내 댓글에 답글",
          body: `${actorName}님이 답글을 남겼어.`,
          targetUrl: `/community/${postId}`,
        });
      }
    }

    return NextResponse.json(
      {
        message: "댓글이 등록되었습니다.",
        comment: {
          ...data,
          author_name: actorProfile?.full_name || "익명",
          author_avatar_url: actorProfile?.avatar_url || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/community/[id]/comments] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}