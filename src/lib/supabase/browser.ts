"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) {
    return client;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
