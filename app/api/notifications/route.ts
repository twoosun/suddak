import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "30");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;

    let query = userClient
      .from("notifications")
      .select("id, user_id, actor_user_id, type, title, body, target_url, is_read, created_at", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "알림을 불러오지 못했어." }, { status: 500 });
    }

    const { count: unreadCount, error: unreadError } = await userClient
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (unreadError) {
      return NextResponse.json({ error: "알림 수를 불러오지 못했어." }, { status: 500 });
    }

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했어." }, { status: 500 });
  }
}