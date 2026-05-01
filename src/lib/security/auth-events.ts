import type { SupabaseClient } from "@supabase/supabase-js";

type SessionLike = {
  access_token?: string;
  user?: {
    id: string;
  };
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function getSessionIdFromAccessToken(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { session_id?: string };
    return payload.session_id ?? null;
  } catch {
    return null;
  }
}

export async function logAuthSessionEvent(
  supabase: SupabaseClient,
  session: SessionLike | null,
  event: "sign_in" | "sign_up" | "sign_out" | "password_update",
  ipAddress: string | null,
  userAgent: string | null,
) {
  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  const sessionId = session?.access_token
    ? getSessionIdFromAccessToken(session.access_token)
    : null;

  try {
    await supabase.from("auth_session_events").insert({
      user_id: userId,
      session_id: sessionId,
      event,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("[auth-events] failed to log session event", { event, userId, err });
  }
}
