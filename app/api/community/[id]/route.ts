import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function getCurrentUserIdFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { userId: null as string | null, token: null as string | null };
  }

  const userClient = createUserClient(token);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return { userId: null as string | null, token: token || null };
  }

  return { userId: user.id, token };
}

export async function GET(
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

    const { userId: currentUserId } = await getCurrentUserIdFromRequest(req);

    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/community/[id]] post fetch error:", error);
      return NextResponse.json(
        { error: "게시글을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const isOwner = !!currentUserId && currentUserId === data.user_id;
    const isPublic = data.is_public !== false;

    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { error: "비공개 게시글입니다." },
        { status: 403 }
      );
    }

    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", data.user_id)
      .maybeSingle();

    return NextResponse.json({
      post: {
        ...data,
        author_name: profileRow?.full_name || "익명",
        author_avatar_url: null,
      },
      viewer_is_admin: false,
      viewer_liked: false,
      current_user_id: currentUserId,
    });
  } catch (error) {
    console.error("[GET /api/community/[id]] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { data: existingPost, error: existingPostError } = await supabase
      .from("community_posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (existingPostError) {
      console.error("[PATCH /api/community/[id]] existing post error:", existingPostError);
      return NextResponse.json(
        { error: "게시글 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    if (!existingPost) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인 글만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const isPublic =
      typeof body.is_public === "boolean" ? body.is_public : true;

    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해 주세요." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      title,
      content,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("community_posts")
      .update(updateData)
      .eq("id", postId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[PATCH /api/community/[id]] update error:", error);
      return NextResponse.json(
        { error: "게시글 수정에 실패했습니다." },
        { status: 500 }
      );
    }

    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      message: "게시글이 수정되었습니다.",
      post: {
        ...data,
        author_name: profileRow?.full_name || "익명",
        author_avatar_url: null,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/community/[id]] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { data: existingPost, error: existingPostError } = await supabase
      .from("community_posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (existingPostError) {
      console.error("[DELETE /api/community/[id]] existing post error:", existingPostError);
      return NextResponse.json(
        { error: "게시글 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    if (!existingPost) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인 글만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const { error: deleteCommentsError } = await supabase
      .from("community_comments")
      .delete()
      .eq("post_id", postId);

    if (deleteCommentsError) {
      console.error("[DELETE /api/community/[id]] comments delete error:", deleteCommentsError);
    }

    const { error: deleteLikesError } = await supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId);

    if (deleteLikesError) {
      console.error("[DELETE /api/community/[id]] likes delete error:", deleteLikesError);
    }

    const { error: deletePostError } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (deletePostError) {
      console.error("[DELETE /api/community/[id]] post delete error:", deletePostError);
      return NextResponse.json(
        { error: "게시글 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "게시글이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("[DELETE /api/community/[id]] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}