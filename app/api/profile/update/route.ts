import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "인증이 필요해." }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
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

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "유저 정보를 확인할 수 없어." }, { status: 401 });
    }

    const body = await req.json();

    const nickname =
      typeof body.nickname === "string" ? body.nickname.trim() : "";
    const grade =
      typeof body.grade === "string" ? body.grade.trim() : "";
    const avatarUrl =
      typeof body.avatar_url === "string" ? body.avatar_url.trim() : "";
    const bio =
      typeof body.bio === "string" ? body.bio.trim() : "";
    const guestbookOpen =
      typeof body.guestbook_open === "boolean" ? body.guestbook_open : true;

    if (!nickname || !grade) {
      return NextResponse.json(
        { error: "닉네임과 학년 정보가 필요해." },
        { status: 400 }
      );
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return NextResponse.json(
        { error: "닉네임은 2자 이상 20자 이하로 입력해줘." },
        { status: 400 }
      );
    }

    if (bio.length > 300) {
      return NextResponse.json(
        { error: "소개글은 300자 이하여야 해." },
        { status: 400 }
      );
    }

    const { data: duplicatedRows, error: duplicateError } = await admin
      .from("user_profiles")
      .select("id, full_name")
      .ilike("full_name", nickname);

    if (duplicateError) {
      return NextResponse.json(
        { error: "닉네임 중복 확인에 실패했어." },
        { status: 500 }
      );
    }

    const duplicated = (duplicatedRows || []).some((row) => row.id !== user.id);

    if (duplicated) {
      return NextResponse.json(
        { error: "이미 사용 중인 닉네임이야." },
        { status: 409 }
      );
    }

    const { error: profileError } = await admin
      .from("user_profiles")
      .update({
        full_name: nickname,
        grade,
        avatar_url: avatarUrl || null,
        bio,
        guestbook_open: guestbookOpen,
      })
      .eq("id", user.id);

    if (profileError) {
      const message = profileError.message?.toLowerCase() || "";

      if (
        message.includes("duplicate key") ||
        message.includes("unique") ||
        message.includes("user_profiles_full_name_unique_idx")
      ) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임이야." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "프로필 수정에 실패했어." },
        { status: 500 }
      );
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        full_name: nickname,
        grade,
      },
    });

    if (metaError) {
      return NextResponse.json(
        { error: "인증 정보 갱신에 실패했어." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "프로필을 수정했어.",
    });
  } catch (error) {
    console.error("profile update route error:", error);
    return NextResponse.json(
      { error: "회원정보 수정 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}