import { supabase } from "./supabase.js";

const root = document.getElementById("account-root");
const logoutButton = document.getElementById("account-logout");
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

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

function feature(icon, title, description, href, pending = false) {
  if (pending) return `
    <div class="account-feature is-pending" aria-disabled="true">
      <span class="account-feature-icon">${icon}</span>
      <span class="account-feature-copy"><b>${title}</b><small>${description} · Inajengwa</small></span>
    </div>`;
  return `
    <a class="account-feature" href="${href}">
      <span class="account-feature-icon">${icon}</span>
      <span class="account-feature-copy"><b>${title}</b><small>${description}</small></span>
      <span class="account-feature-arrow" aria-hidden="true">›</span>
    </a>`;
}

function group(icon, title, subtitle, links) {
  return `
    <details class="account-group">
      <summary>
        <span class="account-group-icon">${icon}</span>
        <span><span class="account-group-title">${title}</span><span class="account-group-subtitle">${subtitle}</span></span>
      </summary>
      <div class="account-group-links">${links}</div>
    </details>`;
}

async function init() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!session?.user) {
    root.innerHTML = `
      <div class="account-profile-card">
        <div class="account-profile-copy">
          <span class="account-eyebrow">ZUNE ACCOUNT</span>
          <h1 class="account-name">Karibu ZUNE</h1>
          <p class="account-email">Ingia au jisajili ili kusimamia akaunti yako.</p>
          <div class="account-group-links" style="padding:14px 0 0">
            <a href="./index.html">Ingia / Jisajili <span>›</span></a>
          </div>
        </div>
      </div>`;
    logoutButton.hidden = true;
    return;
  }

  const user = session.user;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,is_verified,zune_id,role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "ZUNE Customer";
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const zuneId = profile?.zune_id ? `ZUNE ID: ${esc(profile.zune_id)}` : "ZUNE Member";
  const isVerified = profile?.is_verified === true;

  root.innerHTML = `
    <section class="account-profile-card" aria-label="Wasifu wa akaunti">
      <div class="account-avatar">${initials}</div>
      <div class="account-profile-copy">
        <span class="account-eyebrow">MY ZUNE ACCOUNT</span>
        <h1 class="account-name">${esc(name)}${isVerified ? verifiedBadge() : ""}</h1>
        <p class="account-email">${esc(user.email || user.phone || "Akaunti ya ZUNE")}</p>
        <p class="account-id">${zuneId}</p>
      </div>
    </section>

    <section class="account-section">
      <div class="account-section-heading"><h2>Unachohitaji</h2><span>Quick access</span></div>
      <div class="account-feature-grid">
        ${feature("♙","My Profile","Taarifa za akaunti","./profile.html")}
        ${feature("✓","Verification",isVerified ? "Akaunti imethibitishwa" : "Omba uthibitishaji","./verification.html")}
        ${feature("▤","My Orders","Oda na ufuatiliaji","./orders.html",true)}
        ${feature("♡","Wishlist","Bidhaa ulizohifadhi","./wishlist.html",true)}
      </div>
    </section>

    <section class="account-section">
      <div class="account-section-heading"><h2>Shopping & Delivery</h2><span>Manunuzi</span></div>
      <div class="account-feature-grid">
        ${feature("▣","Shopping Cart","Endelea na manunuzi","./index.html")}
        ${feature("⌖","My Addresses","Anwani na eneo la delivery","./addresses.html",true)}
        ${feature("◷","Recently Viewed","Bidhaa ulizotazama","./recently-viewed.html",true)}
        ${feature("☆","Reviews & Ratings","Maoni ya bidhaa","./my-reviews.html",true)}
      </div>
    </section>

    ${group("▤","Payments & Wallet","Salio, malipo na miamala",
      '<a href="./wallet.html">Wallet & Payments ›</a><a href="./wallet.html">Payment History ›</a><a href="./wallet.html">Refunds ›</a><a href="./wallet.html">Receipts ›</a>')}
    ${group("⚙","Settings & Security","Mipangilio na ulinzi wa akaunti",
      '<a href="./account-data.html">Privacy & Data Center ›</a><button type="button" data-account-action="language">Language: Kiswahili / English</button><button type="button" data-account-action="theme">Display preferences</button><button type="button" data-account-action="security" disabled>Login & Security · Inajengwa</button>')}
    ${group("☏","Help & Support","Pata msaada kutoka ZUNE",
      '<a href="./support.html">Help Center & Support ›</a><a href="./support.html">Report a Problem ›</a><a href="./support.html">Complaints & Disputes ›</a>')}
    ${group("Ⓩ","About ZUNE","Taarifa na huduma za ZUNE",
      '<a href="https://whatsapp.com/channel/0029Vb98cx12v1J0skZQ5K36" target="_blank" rel="noopener noreferrer">ZUNE WhatsApp Channel ›</a><a href="./index.html">Rudi Marketplace ›</a>')}
    <p class="account-account-note">Akaunti yako na taarifa zako za Supabase zimehifadhiwa. Vipengele vilivyoandikwa “Inajengwa” vitaunganishwa hatua kwa hatua bila kufuta historia yako.</p>
  `;

  root.addEventListener("click", event => {
    const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
    if (!action) return;
    if (action === "language") {
      alert("Chaguo la lugha litajengwa ndani ya Account Settings.");
    } else if (action === "theme") {
      alert("Light, Dark na System theme zitajengwa ndani ya Account Settings.");
    }
  });
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "…";
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("ZUNE logout:", error);
    logoutButton.disabled = false;
    logoutButton.textContent = "↗";
    alert("Imeshindikana kutoka. Tafadhali jaribu tena.");
    return;
  }
  location.replace("./index.html");
});

init().catch(error => {
  console.error("ZUNE Account:", error);
  root.innerHTML = '<p class="account-error">Imeshindikana kupakia akaunti. Tafadhali jaribu tena.</p>';
});