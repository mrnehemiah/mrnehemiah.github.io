import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zune-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem: string): Uint8Array {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getGoogleAccessToken(serviceAccount: Record<string, string>) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const unsigned = header + "." + claims;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  ));
  const assertion = unsigned + "." + base64url(signature);
  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error("Google OAuth token request failed: " + JSON.stringify(result));
  }
  return result.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const suppliedSecret = req.headers.get("x-zune-push-secret");
  if (!suppliedSecret) return json({ error: "Unauthorized" }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      ?? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    if (!serviceKey) return json({ error: "Supabase server key is unavailable" }, 500);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: validSecret, error: secretError } = await admin.rpc(
      "zune_verify_push_webhook_secret",
      { p_secret: suppliedSecret },
    );
    if (secretError) throw secretError;
    if (validSecret !== true) return json({ error: "Unauthorized" }, 401);

    const firebaseRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!firebaseRaw) return json({ error: "FIREBASE_SERVICE_ACCOUNT_JSON is not configured" }, 500);
    const serviceAccount = JSON.parse(firebaseRaw);
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      return json({ error: "Firebase service account JSON is incomplete" }, 500);
    }

    const event = await req.json();
    const notification = event.record ?? event.notification ?? event;
    const userId = notification.user_id;
    if (!userId || !notification.id) return json({ error: "Notification record is missing id or user_id" }, 400);

    const { data: tokens, error: tokenError } = await admin
      .from("zune_push_tokens")
      .select("id,fcm_token,platform")
      .eq("user_id", userId);
    if (tokenError) throw tokenError;
    if (!tokens?.length) return json({ ok: true, sent: 0, reason: "No registered devices" });

    const accessToken = await getGoogleAccessToken(serviceAccount);
    const title = notification.title_sw || notification.title_en || "ZUNE";
    const body = notification.body_sw || notification.body_en || "Una taarifa mpya kutoka ZUNE.";
    const actionUrl = notification.action_url || "/notifications.html";
    const results = await Promise.all(tokens.map(async (device: { id: string; fcm_token: string }) => {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: device.fcm_token,
              data: {
                title: String(title),
                body: String(body),
                notification_id: String(notification.id),
                url: String(actionUrl),
                action_url: String(actionUrl),
                type: String(notification.type || "general"),
              },
              ...(device.platform === "android"
                ? { android: { priority: "HIGH", ttl: "86400s" } }
                : {
                    // Data-only web push: the service worker owns display to avoid
                    // duplicate browser notifications from automatic + manual display.
                    webpush: {
                      headers: { Urgency: "high" },
                      fcm_options: { link: new URL(actionUrl, "https://mrnehemiah.github.io").href },
                    },
                  }),
            },
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
        if (errorCode === "UNREGISTERED" || response.status === 404) {
          await admin.from("zune_push_tokens").delete().eq("id", device.id);
        }
        return { ok: false, status: response.status, error: result?.error?.message || "FCM send failed" };
      }
      return { ok: true };
    }));

    return json({
      ok: results.some((item) => item.ok),
      sent: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
    });
  } catch (error) {
    console.error("zune-send-push:", error);
    return json({ error: error instanceof Error ? error.message : "Push send failed" }, 500);
  }
});
