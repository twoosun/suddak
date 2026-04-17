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

type PostType = "free" | "problem";

/* # 1. 작성자명 */
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

/* # 2. 요청 유저 */
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

/* # 3. 관리자 여부 */
async function getIsAdmin(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

export async function GET(
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

    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/community/[id]] select error:", error);
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

    if (!data.is_public) {
      return NextResponse.json(
        { error: "비공개 게시글입니다." },
        { status: 403 }
      );
    }

    const { data: profileRow } = await supabase
  .from("user_profiles")
  .select("full_name, profile_name, avatar_url")
  .eq("id", data.user_id)
  .maybeSingle();

    let viewerIsAdmin = false;
    let viewerLiked = false;
    let currentUserId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: authData } = await supabase.auth.getUser(token);

      if (authData.user) {
        currentUserId = authData.user.id;
        viewerIsAdmin = await getIsAdmin(supabase, authData.user.id);

        const { data: likeRow } = await supabase
          .from("community_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", authData.user.id)
          .maybeSingle();

        viewerLiked = Boolean(likeRow);
      }
    }

    return NextResponse.json({
      post: {
        ...data,
        author_name: getAuthorName(userData.user),
        author_avatar_url: null,
      },
      viewer_is_admin: viewerIsAdmin,
      viewer_liked: viewerLiked,
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

    const resolvedParams =
      typeof (params as Promise<{ id: string }>).then === "function"
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });

    const postId = resolvedParams.id?.trim();

    const authResult = await getUserFromRequest(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const isAdmin = await getIsAdmin(supabase, user.id);
    const body = await req.json();

    const { data: existingPost, error: existingError } = await supabase
      .from("community_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (existingError || !existingPost) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const onlyNoticeToggle =
      Object.keys(body).length > 0 &&
      Object.keys(body).every((key) => ["is_notice"].includes(key));

    if (onlyNoticeToggle) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "관리자만 공지사항을 지정할 수 있습니다." },
          { status: 403 }
        );
      }

      const { data, error } = await supabase
        .from("community_posts")
        .update({ is_notice: Boolean(body.is_notice) })
        .eq("id", postId)
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "공지 상태 변경에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: data.is_notice ? "공지사항으로 지정되었습니다." : "공지사항이 해제되었습니다.",
        post: {
  ...data,
  author_name:
    profileRow?.profile_name || profileRow?.full_name || "익명",
  author_avatar_url: profileRow?.avatar_url || null,
},);
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인 글만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.post_type !== undefined) {
      if (body.post_type !== "free" && body.post_type !== "problem") {
        return NextResponse.json(
          { error: "post_type은 free 또는 problem 이어야 합니다." },
          { status: 400 }
        );
      }
      updateData.post_type = body.post_type as PostType;
    }

    if (body.title !== undefined) {
      const title = String(body.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "제목은 200자 이하여야 합니다." },
          { status: 400 }
        );
      }
      updateData.title = title;
    }

    if (body.content !== undefined) {
      const content = String(body.content ?? "").trim();
      if (!content) {
        return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
      }
      if (content.length > 10000) {
        return NextResponse.json(
          { error: "내용은 10000자 이하여야 합니다." },
          { status: 400 }
        );
      }
      updateData.content = content;
    }

    if (body.recognized_text !== undefined) {
      updateData.recognized_text = body.recognized_text?.trim() || null;
    }

    if (body.solve_result !== undefined) {
      updateData.solve_result = body.solve_result?.trim() || null;
    }

    if (body.image_url !== undefined) {
      updateData.image_url = body.image_url?.trim() || null;
    }

    if (body.is_public !== undefined) {
      updateData.is_public = Boolean(body.is_public);
    }

    if (body.history_id !== undefined) {
      const rawHistoryId = body.history_id;
      if (rawHistoryId === null || rawHistoryId === "") {
        updateData.history_id = null;
      } else {
        const historyId = Number(rawHistoryId);
        if (Number.isNaN(historyId)) {
          return NextResponse.json(
            { error: "history_id 형식이 올바르지 않습니다." },
            { status: 400 }
          );
        }

        const { data: historyRow, error: historyError } = await supabase
          .from("problem_history")
          .select("id, user_id")
          .eq("id", historyId)
          .single();

        if (historyError || !historyRow) {
          return NextResponse.json(
            { error: "연결하려는 히스토리 기록을 찾을 수 없습니다." },
            { status: 404 }
          );
        }

        if (historyRow.user_id !== user.id) {
          return NextResponse.json(
            { error: "본인 히스토리만 연결할 수 있습니다." },
            { status: 403 }
          );
        }

        updateData.history_id = historyId;
      }
    }

    const nextPostType = (updateData.post_type ?? existingPost.post_type) as PostType;
    const nextRecognizedText =
      updateData.recognized_text !== undefined
        ? updateData.recognized_text
        : existingPost.recognized_text;
    const nextSolveResult =
      updateData.solve_result !== undefined
        ? updateData.solve_result
        : existingPost.solve_result;
    const nextImageUrl =
      updateData.image_url !== undefined
        ? updateData.image_url
        : existingPost.image_url;
    const nextHistoryId =
      updateData.history_id !== undefined
        ? updateData.history_id
        : existingPost.history_id;

    if (nextPostType === "problem") {
      if (!nextRecognizedText && !nextSolveResult && !nextImageUrl && !nextHistoryId) {
        return NextResponse.json(
          {
            error:
              "문제 게시글은 recognized_text, solve_result, image_url, history_id 중 하나 이상이 필요합니다.",
          },
          { status: 400 }
        );
      }
    }

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

    return NextResponse.json({
      message: "게시글이 수정되었습니다.",
      post: data,
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

    const resolvedParams =
      typeof (params as Promise<{ id: string }>).then === "function"
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });

    const postId = resolvedParams.id?.trim();

    const authResult = await getUserFromRequest(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const isAdmin = await getIsAdmin(supabase, user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "관리자만 게시글을 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const { data: existingPost, error: existingError } = await supabase
      .from("community_posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (existingError || !existingPost) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("[DELETE /api/community/[id]] delete error:", error);
      return NextResponse.json(
        { error: "게시글 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "관리자 권한으로 게시글을 삭제했습니다.",
    });
  } catch (error) {
    console.error("[DELETE /api/community/[id]] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}