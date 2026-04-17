import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function createUserClient(token: string) {
  return createClient(supabaseUrl, anonKey, {
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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "인증이 필요해." }, { status: 401 });
    }

    const userClient = createUserClient(token);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "유저 정보를 확인할 수 없어." }, { status: 401 });
    }

    const { data, error } = await admin
      .from("user_profiles")
      .select("id, email, full_name, grade, avatar_url, bio, guestbook_open")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "프로필을 불러오지 못했어." }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: data?.email ?? user.email ?? "",
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? "",
        grade: data?.grade ?? user.user_metadata?.grade ?? "",
        avatar_url: data?.avatar_url ?? null,
        bio: data?.bio ?? "",
        guestbook_open: data?.guestbook_open ?? true,
        created_at: user.created_at ?? null,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/me error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했어." }, { status: 500 });
  }
}