import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams =
      typeof (params as Promise<{ id: string }>).then === "function"
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });

    const profileId = String(resolvedParams?.id || "").trim();

    if (!profileId) {
      return NextResponse.json({ error: "프로필 ID가 올바르지 않아." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("id, full_name, grade, profile_name, avatar_url, bio, guestbook_open")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "프로필을 불러오지 못했어." }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없어." }, { status: 404 });
    }

    const { data: posts, error: postsError } = await admin
      .from("community_posts")
      .select("id, title, content, post_type, recognized_text, solve_result, created_at, user_id")
      .eq("user_id", profileId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsError) {
      return NextResponse.json({ error: "작성글을 불러오지 못했어." }, { status: 500 });
    }

    const items = posts ?? [];

    return NextResponse.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        grade: profile.grade,
        profile_name: profile.profile_name || profile.full_name || "작성자",
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || "",
        guestbook_open: profile.guestbook_open ?? true,
        stats: {
          total: items.length,
          free: items.filter((post) => post.post_type === "free").length,
          problem: items.filter((post) => post.post_type === "problem").length,
        },
      },
      posts: items.map((post) => ({
        ...post,
        author_name: profile.profile_name || profile.full_name || "작성자",
        author_avatar_url: profile.avatar_url || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/profile/[id] error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했어." }, { status: 500 });
  }
}