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

function parseBoolean(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return value === "true";
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

async function enrichPostsWithAuthors(
  supabase: ReturnType<typeof createAdminClient>,
  posts: any[]
) {
  const uniqueUserIds = [...new Set(posts.map((post) => post.user_id).filter(Boolean))];

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

  return posts.map((post) => ({
    ...post,
    author_name: userMap.get(post.user_id) ?? "익명",
    author_avatar_url: null,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "10"), 1), 50);
    const postType = searchParams.get("postType");
    const search = searchParams.get("search")?.trim() || "";
    const onlyPublic = parseBoolean(searchParams.get("public"), true);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("community_posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (onlyPublic) {
      query = query.eq("is_public", true);
    }

    if (postType === "free" || postType === "problem") {
      query = query.eq("post_type", postType);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,recognized_text.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[GET /api/community] query error:", error);
      return NextResponse.json(
        { error: "게시글 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const posts = await enrichPostsWithAuthors(supabase, data ?? []);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/community] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "인증 정보가 없습니다." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "유효하지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const postType: PostType = body.post_type;
    const title = body.title?.trim();
    const content = body.content?.trim();
    const recognizedText = body.recognized_text?.trim() || null;
    const solveResult = body.solve_result?.trim() || null;
    const imageUrl = body.image_url?.trim() || null;
    const isPublic =
      typeof body.is_public === "boolean" ? body.is_public : true;
    const historyId =
      body.history_id === null ||
      body.history_id === undefined ||
      body.history_id === ""
        ? null
        : Number(body.history_id);

    if (postType !== "free" && postType !== "problem") {
      return NextResponse.json(
        { error: "post_type은 free 또는 problem 이어야 합니다." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "내용을 입력해주세요." },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "제목은 200자 이하여야 합니다." },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: "내용은 10000자 이하여야 합니다." },
        { status: 400 }
      );
    }

    if (postType === "problem") {
      if (!recognizedText && !solveResult && !imageUrl && !historyId) {
        return NextResponse.json(
          {
            error:
              "문제 게시글은 recognized_text, solve_result, image_url, history_id 중 하나 이상이 필요합니다.",
          },
          { status: 400 }
        );
      }
    }

    if (historyId !== null && Number.isNaN(historyId)) {
      return NextResponse.json(
        { error: "history_id 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (historyId !== null) {
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
          { error: "본인 히스토리만 공유할 수 있습니다." },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        post_type: postType,
        history_id: historyId,
        title,
        content,
        recognized_text: recognizedText,
        solve_result: solveResult,
        image_url: imageUrl,
        is_public: isPublic,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/community] insert error:", error);
      return NextResponse.json(
        { error: "게시글 작성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "게시글이 작성되었습니다.",
      post: data,
    });
  } catch (error) {
    console.error("[POST /api/community] unexpected error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}