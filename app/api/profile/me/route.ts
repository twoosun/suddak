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
      .select("id, email, full_name, grade, profile_name, avatar_url, bio, guestbook_open")
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
        profile_name:
          data?.profile_name ??
          data?.full_name ??
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "사용자",
        avatar_url: data?.avatar_url ?? null,
        bio: data?.bio ?? "",
        guestbook_open: data?.guestbook_open ?? true,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/me error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했어." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = await req.json();

    const profileName =
      typeof body.profile_name === "string" ? body.profile_name.trim() : "";
    const avatarUrl =
      typeof body.avatar_url === "string" ? body.avatar_url.trim() : null;
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const guestbookOpen =
      typeof body.guestbook_open === "boolean" ? body.guestbook_open : true;

    if (!profileName) {
      return NextResponse.json({ error: "프로필네임을 입력해줘." }, { status: 400 });
    }

    if (profileName.length < 2 || profileName.length > 20) {
      return NextResponse.json(
        { error: "프로필네임은 2자 이상 20자 이하로 해줘." },
        { status: 400 }
      );
    }

    if (bio.length > 300) {
      return NextResponse.json({ error: "소개글은 300자 이하여야 해." }, { status: 400 });
    }

    const { data: duplicatedRows, error: duplicateError } = await admin
      .from("user_profiles")
      .select("id, profile_name")
      .ilike("profile_name", profileName);

    if (duplicateError) {
      return NextResponse.json({ error: "프로필네임 중복 확인에 실패했어." }, { status: 500 });
    }

    const duplicated = (duplicatedRows || []).some((row) => row.id !== user.id);

    if (duplicated) {
      return NextResponse.json({ error: "이미 사용 중인 프로필네임이야." }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from("user_profiles")
      .update({
        profile_name: profileName,
        avatar_url: avatarUrl,
        bio,
        guestbook_open: guestbookOpen,
      })
      .eq("id", user.id);

    if (updateError) {
      const message = updateError.message?.toLowerCase() || "";

      if (message.includes("duplicate key") || message.includes("unique")) {
        return NextResponse.json({ error: "이미 사용 중인 프로필네임이야." }, { status: 409 });
      }

      return NextResponse.json({ error: "프로필 저장에 실패했어." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "프로필을 저장했어.",
    });
  } catch (error) {
    console.error("PATCH /api/profile/me error:", error);
    return NextResponse.json({ error: "프로필 저장 중 오류가 발생했어." }, { status: 500 });
  }
}