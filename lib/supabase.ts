import { createClient, type Session } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "suddak-auth",
    },
  }
);

export async function getSessionWithRecovery(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session;
  }

  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return null;
  }

  return data.session ?? null;
}
