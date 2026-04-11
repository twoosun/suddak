import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PROFILE_TABLE = "user_profiles";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nickname =
      typeof body.nickname === "string" ? body.nickname.trim() : "";
    const grade = typeof body.grade === "string" ? body.grade.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken =
      typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    const missingFields: string[] = [];
    if (!nickname) missingFields.push("닉네임");
    if (!grade) missingFields.push("학년 정보");
    if (!email) missingFields.push("이메일");
    if (!password) missingFields.push("비밀번호");
    if (!captchaToken) missingFields.push("CAPTCHA 인증");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `다음 정보가 필요합니다: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    const { data: listed, error: listError } =
      await admin.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: "기존 사용자 확인 중 오류가 발생했어." },
        { status: 500 }
      );
    }

    const existingUser =
      listed.users.find(
        (user) => (user.email || "").toLowerCase() === normalizedEmail
      ) ?? null;

    const { data: duplicatedProfile, error: nicknameCheckError } = await admin
      .from(PROFILE_TABLE)
      .select("id, full_name")
      .ilike("full_name", nickname)
      .limit(1)
      .maybeSingle();

    if (nicknameCheckError) {
      return NextResponse.json(
        { error: "닉네임 중복 확인 중 오류가 발생했어." },
        { status: 500 }
      );
    }

    if (duplicatedProfile) {
      if (!existingUser || duplicatedProfile.id !== existingUser.id) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임이야." },
          { status: 409 }
        );
      }
    }

    let userId: string;

    if (!existingUser) {
      const { data: createdUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: nickname,
            grade,
          },
        });

      if (createError || !createdUser.user) {
        return NextResponse.json(
          { error: createError?.message || "회원가입 생성에 실패했어." },
          { status: 500 }
        );
      }

      userId = createdUser.user.id;
    } else {
      userId = existingUser.id;

      const { error: updateUserError } = await admin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            full_name: nickname,
            grade,
          },
        }
      );

      if (updateUserError) {
        return NextResponse.json(
          { error: "기존 계정 정보 갱신에 실패했어." },
          { status: 500 }
        );
      }
    }

    const { error: profileError } = await admin.from(PROFILE_TABLE).upsert(
      {
        id: userId,
        email,
        full_name: nickname,
        grade,
        is_approved: true,
        is_admin: false,
      },
      { onConflict: "id" }
    );

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

      console.error("profile upsert error:", profileError);

      return NextResponse.json(
        {
          error: "프로필 저장에 실패했어.",
          detail: profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: existingUser
        ? "기존 계정의 프로필을 복구했어. 이제 로그인하면 돼."
        : "회원가입이 완료되었어.",
    });
  } catch (error) {
    console.error("signup route error:", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}