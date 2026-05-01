import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";
import { getSupabaseCookieOptions } from "./cookie-options";

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createRouteClient(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const withCookies = (response: NextResponse) => {
    const defaults = getSupabaseCookieOptions();
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...defaults,
        ...options,
      });
    });
    return response;
  };

  return { supabase, withCookies };
}
