import { supabase } from "./supabase.js";

const root = document.getElementById("account-root");

// Keep the existing verification artwork unchanged while rebuilding the
// Account interface. This page reads profile data only; it never deletes or
// modifies users, profiles, orders, wallets, or any other Supabase records.
const verifiedBadge = () => `
  <span class="account-name-verified" role="img" aria-label="Verified Account" title="Verified Account">
    <svg viewBox="-30 -30 60 60" aria-hidden="true">
      <g fill="#F28C28">
        <rect x="-22" y="-22" width="44" height="44" rx="6"/>
        <rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/>
        <rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/>
      </g>
      <path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>`;

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

async function init() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!session?.user) {
    root.innerHTML = '<p class="account-error">Ingia kwanza ili kuona akaunti yako. <a href="./index.html">Ingia</a></p>';
    return;
  }

  const user = session.user;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  const name = profile?.full_name
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "ZUNE Customer";

  root.innerHTML = `
    <div class="account-identity">
      <h1 class="account-name">
        ${profile?.is_verified ? verifiedBadge() : ""}
        <span>${escapeHTML(name)}</span>
      </h1>
    </div>`;
}

init().catch(error => {
  console.error("ZUNE Account:", error);
  root.innerHTML = '<p class="account-error">Imeshindikana kupakia akaunti. Tafadhali jaribu tena.</p>';
});
