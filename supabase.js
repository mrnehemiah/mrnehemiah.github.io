import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";

// ZUNE SUPABASE CONNECTION
// Use jsDelivr's ESM endpoint (documented by Supabase) instead of esm.sh,
// which was a single external point of failure during application startup.

const SUPABASE_URL =
  "https://rpkogiieegqgxqbzwxwo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);


// Native Android FCM bridge. The database RPC derives user_id from auth.uid(),
// refreshes last_seen_at, and reassigns this installation to the active account.
export async function unregisterZunePushToken() {
  if (typeof window === "undefined" || !window.AndroidZunePush) return false;
  const token = window.AndroidZunePush.getFcmToken();
  if (!token) return false;
  const { error } = await supabase.rpc("zune_unregister_push_token", {
    p_fcm_token: token
  });
  if (error) throw error;
  return true;
}

if (typeof window !== "undefined" && window.AndroidZunePush) {
  window.zuneSyncNativePush = async function () {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const token = window.AndroidZunePush.getFcmToken();
      if (!token) return;
      const { error } = await supabase.rpc("zune_register_push_token", {
        p_fcm_token: token,
        p_platform: "android",
        p_user_agent: navigator.userAgent || "ZUNE Android"
      });
      if (error) throw error;
    } catch (error) {
      console.warn("ZUNE native push sync:", error);
    }
  };
  supabase.auth.onAuthStateChange(() => {
    setTimeout(() => window.zuneSyncNativePush?.(), 0);
  });
  setTimeout(() => window.zuneSyncNativePush?.(), 800);
}
