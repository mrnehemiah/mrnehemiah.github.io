import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: "Invalid session" }, 401);

  let body: { prompt?: string; language?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const prompt = String(body.prompt || "").trim().slice(0, 500);
  const language = body.language === "en" ? "en" : "sw";
  if (prompt.length < 2) return json({ error: "Please enter a shopping request." }, 400);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id,title,description,price,category,stock_quantity")
    .eq("moderation_status", "approved")
    .is("removed_at", null)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(80);
  if (productsError) return json({ error: "Unable to read the product catalog." }, 503);

  const catalog = products || [];
  const tokens = prompt.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2);
  const matched = catalog.map((p) => {
    const haystack = [p.title, p.description, p.category].join(" ").toLowerCase();
    const score = tokens.reduce((n, token) => n + (haystack.includes(token) ? 1 : 0), 0);
    return { p, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.p);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (apiKey && catalog.length) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("ZUNE_AI_MODEL") || "gpt-6.2-astra",
          store: false,
          max_completion_tokens: 500,
          messages: [
            { role: "system", content: language === "sw"
              ? "Wewe ni ZUNE Shopping Assistant. Tumia katalogi uliyopewa pekee. Usibuni bidhaa, bei, stock au sifa. Jibu kwa Kiswahili kifupi na kirafiki. Rudisha JSON tu: {answer:string, product_ids:string[]}. product_ids lazima zitokane na katalogi."
              : "You are ZUNE Shopping Assistant. Use only the supplied catalog. Never invent products, prices, stock or features. Be concise and helpful. Return JSON only: {answer:string, product_ids:string[]}. product_ids must be from the catalog." },
            { role: "user", content: JSON.stringify({ request: prompt, catalog: catalog.map((p) => ({ id: p.id, title: p.title, price: p.price, category: p.category, description: p.description, stock: p.stock_quantity })) }) },
          ],
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const raw = result.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));
        const allowed = new Set(catalog.map((p) => p.id));
        const product_ids = Array.isArray(parsed.product_ids) ? parsed.product_ids.filter((id: string) => allowed.has(id)).slice(0, 6) : [];
        return json({ answer: String(parsed.answer || ""), product_ids, mode: "ai" });
      }
    } catch (error) {
      console.error("ZUNE AI provider fallback:", error);
    }
  }

  return json({
    answer: language === "sw"
      ? (matched.length ? "Nimepata bidhaa zinazofanana na maelezo yako. Linganisha bei na sifa kabla ya kuchagua." : "Sijapata bidhaa inayolingana moja kwa moja. Jaribu kutaja aina ya bidhaa, chapa au bajeti.")
      : (matched.length ? "I found products matching your request. Compare prices and details before choosing." : "I couldn't find an exact match. Try including a product type, brand or budget."),
    product_ids: matched.map((p) => p.id),
    mode: "catalog_match",
  });
});
