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

async function getUserMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { name: string; avatar_url: string | null }>();

  const { data } = await admin
    .from("user_profiles")
    .select("id, full_name, profile_name, avatar_url")
    .in("id", userIds);

  const map = new Map<string, { name: string; avatar_url: string | null }>();

  for (const row of data || []) {
    map.set(row.id, {
      name: row.profile_name || row.full_name || "작성자",
      avatar_url: row.avatar_url || null,
    });
  }

  return map;
}

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

    const { data: owner, error: ownerError } = await admin
      .from("user_profiles")
      .select("id, guestbook_open")
      .eq("id", profileId)
      .maybeSingle();

    if (ownerError || !owner) {
      return NextResponse.json({ error: "프로필을 찾을 수 없어." }, { status: 404 });
    }

    const { data: rows, error } = await admin
      .from("profile_guestbooks")
      .select("id, profile_user_id, user_id, content, created_at")
      .eq("profile_user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: "방명록을 불러오지 못했어." }, { status: 500 });
    }

    const userIds = [...new Set((rows || []).map((row) => row.user_id))];
    const userMap = await getUserMap(userIds);

    return NextResponse.json({
      guestbook_open: owner.guestbook_open ?? true,
      entries: (rows || []).map((row) => ({
        ...row,
        author_name: userMap.get(row.user_id)?.name || "작성자",
        author_avatar_url: userMap.get(row.user_id)?.avatar_url || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/profile/[id]/guestbook error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했어." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
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

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "로그인 후 방명록을 남길 수 있어." }, { status: 401 });
    }

    const userClient = createUserClient(token);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "유저 정보를 확인할 수 없어." }, { status: 401 });
    }

    if (user.id === profileId) {
      return NextResponse.json({ error: "자기 프로필에는 방명록을 남길 수 없어." }, { status: 400 });
    }

    const body = await req.json();
    const content = String(body.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "방명록 내용을 입력해줘." }, { status: 400 });
    }

    if (content.length > 300) {
      return NextResponse.json({ error: "방명록은 300자 이하여야 해." }, { status: 400 });
    }

    const { data: owner, error: ownerError } = await admin
      .from("user_profiles")
      .select("id, guestbook_open")
      .eq("id", profileId)
      .maybeSingle();

    if (ownerError || !owner) {
      return NextResponse.json({ error: "프로필을 찾을 수 없어." }, { status: 404 });
    }

    if (!owner.guestbook_open) {
      return NextResponse.json({ error: "이 사용자는 방명록을 닫아두었어." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("profile_guestbooks")
      .insert({
        profile_user_id: profileId,
        user_id: user.id,
        content,
      })
      .select("id, profile_user_id, user_id, content, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "방명록 저장에 실패했어." }, { status: 500 });
    }

    const userMap = await getUserMap([user.id]);

    return NextResponse.json({
      ok: true,
      entry: {
        ...data,
        author_name: userMap.get(user.id)?.name || "작성자",
        author_avatar_url: userMap.get(user.id)?.avatar_url || null,
      },
    });
  } catch (error) {
    console.error("POST /api/profile/[id]/guestbook error:", error);
    return NextResponse.json({ error: "방명록 작성 중 오류가 발생했어." }, { status: 500 });
  }
}