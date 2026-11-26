import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env");
}

const browser = typeof window !== "undefined";

export const supabase = createClient(url, key, {
  auth: { persistSession: browser, autoRefreshToken: browser, detectSessionInUrl: false },
});

export const WEBHOOK_URL = `${url}/functions/v1/macrodroid-webhook`;
