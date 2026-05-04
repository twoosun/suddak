import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type CreateNotificationInput = {
  userId: string;
  actorUserId?: string | null;
  type: "comment_on_post" | "reply_to_comment" | "guestbook_on_profile" | "training_reward";
  title: string;
  body: string;
  targetUrl?: string | null;
  dedupeByTargetUrl?: boolean;
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    if (!input.userId) return;
    if (input.actorUserId && input.userId === input.actorUserId) return;

    const supabase = createAdminClient();

    if (input.dedupeByTargetUrl && input.targetUrl) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("type", input.type)
        .eq("target_url", input.targetUrl)
        .maybeSingle();

      if (existing) return;
    }

    await supabase.from("notifications").insert({
      user_id: input.userId,
      actor_user_id: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      target_url: input.targetUrl ?? null,
      is_read: false,
    });
  } catch (error) {
    console.error("createNotification error:", error);
  }
}
