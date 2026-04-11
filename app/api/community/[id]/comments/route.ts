import { NextRequest, NextResponse } from "next/server";
import { createClient, User } from "@supabase/supabase-js";

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

function getAuthorName(user: User | null | undefined) {
  if (!user) return "익명";

  const meta = user.user_metadata ?? {};
  return (
    meta.name ||
    meta.full_name ||
    meta.username ||
    meta.nickname ||
    user.email?.split("@")[0] ||
    "익명"
  );
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

async function enrichCommentsWithAuthors(
  supabase: ReturnType<typeof createAdminClient>,
  comments: any[]
) {
  const uniqueUserIds = [...new Set(comments.map((comment) => comment.user_id).filter(Boolean))];
  const userMap = new Map<string, string>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(userId);
        userMap.set(userId, getAuthorName(data.user));
      } catch {
        userMap.set(userId, "익명");
      }
    })
  );

  return comments.map((comment) => ({
    ...comment,
    author_name: userMap.get(comment.user_id) ?? "익명",
    author_avatar_url: null,
  }));
}

export async function GET(
  _req: NextRequest,
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

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, is_public")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[GET /api/community/[id]/comments] post error:", postError);
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
        { error: "비공개 게시글의 댓글은 볼 수 없습니다." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/community/[id]/comments] comment error:", error);
      return NextResponse.json(
        { error: "댓글을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const comments = await enrichCommentsWithAuthors(supabase, data ?? []);

    return NextResponse.json({ comments });
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
    const body = await req.json();
    const content = String(body.content ?? "").trim();
    const parentCommentId = body.parent_comment_id ? String(body.parent_comment_id) : null;

    if (!content) {
      return NextResponse.json(
        { error: "댓글 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "댓글은 2000자 이하여야 합니다." },
        { status: 400 }
      );
    }

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id, is_public")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      console.error("[POST /api/community/[id]/comments] post error:", postError);
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
        { error: "비공개 게시글에는 댓글을 작성할 수 없습니다." },
        { status: 403 }
      );
    }

    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from("community_comments")
        .select("id, post_id, parent_comment_id")
        .eq("id", parentCommentId)
        .maybeSingle();

      if (parentError) {
        return NextResponse.json(
          { error: "부모 댓글을 확인하지 못했습니다." },
          { status: 500 }
        );
      }

      if (!parentComment || parentComment.post_id !== postId) {
        return NextResponse.json(
          { error: "올바른 부모 댓글이 아닙니다." },
          { status: 400 }
        );
      }

      if (parentComment.parent_comment_id) {
        return NextResponse.json(
          { error: "대댓글에는 다시 대댓글을 달 수 없습니다." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/community/[id]/comments] insert error:", error);
      return NextResponse.json(
        { error: "댓글 작성에 실패했습니다." },
        { status: 500 }
      );
    }

    const { data: userData } = await supabase.auth.admin.getUserById(user.id);

    return NextResponse.json({
      message: parentCommentId ? "대댓글이 작성되었습니다." : "댓글이 작성되었습니다.",
      comment: {
        ...data,
        author_name: getAuthorName(userData.user),
        author_avatar_url: null,
      },
    });
  } catch (error) {
    console.error("[POST /api/community/[id]/comments] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}