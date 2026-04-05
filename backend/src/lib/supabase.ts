import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export function createUserClient(accessToken: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export const supabaseAuthClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
