import type { CookieOptions } from "@supabase/ssr";

export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60,
  };
}
