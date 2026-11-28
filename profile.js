import { supabase } from "./supabase.js";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const root = document.getElementById("profile-root");
const $ = (selector, scope = document) => scope.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

let user = null;
let profile = {};
let avatarUrl = "";
let selectedPhoto = null;
let editing = false;
let saving = false;

const genderLabels = {
  male: "Mwanaume",
  female: "Mwanamke",
  other: "Nyingine",
  prefer_not_to_say: "Sitaki kusema"
};

function display(value) {
  return value ? esc(value) : '<span class="muted">Haijawekwa</span>';
}

function initials(name) {
  return String(name || "ZUNE").trim().split(/\s+/).slice(0, 2)
    .map(part => part[0] || "").join("").toUpperCase();
}

function avatarMarkup(name, extraClass = "") {
  return avatarUrl
    ? '<img class="personal-avatar ' + extraClass + '" src="' + esc(avatarUrl) + '" alt="Picha ya akaunti">'
    : '<div class="personal-avatar personal-avatar-fallback ' + extraClass + '">' + esc(initials(name)) + '</div>';
}

function verifiedBadge() {
  if (profile.is_verified !== true) return "";
  return `<span class="personal-verified-badge" role="img" aria-label="Akaunti imethibitishwa" title="Verified Account"><svg viewBox="-30 -30 60 60" aria-hidden="true"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
function statusLabel() {
  const status = String(profile.account_status || "active").toLowerCase();
  if (status === "suspended") return "Akaunti imesitishwa";
  if (status === "removed") return "Akaunti imeondolewa";
  return "Akaunti hai";
}

function render() {
  const name = profile.full_name || user.email?.split("@")[0] || "Mtumiaji wa ZUNE";
  root.innerHTML = `
    <section class="personal-card">
      <div class="personal-card-heading">
        <div>
          <span class="eyebrow">AKAUNTI YAKO</span>
          <h2>${editing ? "Hariri Taarifa Binafsi" : "Taarifa Binafsi"}</h2>
          <p>${editing ? "Sasisha taarifa zako kisha hifadhi mabadiliko." : "Hizi ndizo taarifa zilizosajiliwa kwenye akaunti yako ya ZUNE."}</p>
        </div>
        ${editing ? "" : '<button class="edit-button" id="edit-personal" type="button"><span aria-hidden="true">✎</span> Hariri</button>'}
      </div>

      <div class="personal-identity">
        <div class="avatar-wrap">
          ${avatarMarkup(name)}
          ${editing ? '<label class="photo-edit" for="profile-photo" title="Badilisha picha" aria-label="Badilisha picha">✎</label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden>' : ""}
        </div>
        <div class="identity-copy">
          <h3>${esc(name)}${verifiedBadge()}</h3>
          <p>${esc(user.email || "")}</p>
          <div class="identity-badges">
            <span class="status-pill">${esc(profile.role === "vendor" ? "MUUZAJI" : profile.role === "admin" ? "ADMIN" : "MTEJA")}</span>
            <span class="status-pill active-pill">${esc(statusLabel())}</span>
          </div>
          ${editing ? '<small class="photo-hint">JPG, PNG au WebP · hadi 5MB</small>' : ""}
        </div>
      </div>

      ${editing ? editFormMarkup() : readOnlyMarkup()}
      <p class="form-message" id="personal-message" role="status" aria-live="polite"></p>
    </section>
    <p class="page-footnote">ⓏⓊⓃⒺ MARKETPLACE · 2.0</p>
  `;

  if (!editing && profile.zune_id) {
    const canvas = $("#zune-id-qr");
    QRCode.toCanvas(canvas, `ZUNE:${profile.zune_id}`, { width: 148, margin: 1, errorCorrectionLevel: "M", color: { dark: "#123d2c", light: "#ffffff" } }).catch(error => {
      console.warn("ZUNE ID QR generation failed:", error);
      const context = canvas?.getContext("2d");
      if (context) { context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#64756b"; context.font = "11px sans-serif"; context.textAlign = "center"; context.fillText("QR haipatikani", 74, 74); }
    });
    $("#copy-zune-id")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(String(profile.zune_id)); showMessage("ZUNE ID imenakiliwa."); }
      catch { showMessage("Imeshindikana kunakili. Nakili ZUNE ID mwenyewe.", true); }
    });
  }
  if (editing) {
    $("#personal-form").addEventListener("submit", savePersonal);
    $("#cancel-personal").addEventListener("click", () => {
      selectedPhoto = null;
      editing = false;
      render();
    });
    $("#profile-photo").addEventListener("change", previewPhoto);
    $("#profile-photo").addEventListener("change", () => {
      const file = $("#profile-photo").files?.[0];
      if (file) {
        const preview = URL.createObjectURL(file);
        const oldPreview = root.dataset.previewUrl;
        if (oldPreview) URL.revokeObjectURL(oldPreview);
        root.dataset.previewUrl = preview;
        const current = $(".personal-avatar", root);
        const img = document.createElement("img");
        img.className = "personal-avatar";
        img.alt = "Picha mpya ya akaunti";
        img.src = preview;
        current.replaceWith(img);
      }
    });
  } else {
    $("#edit-personal").addEventListener("click", () => {
      editing = true;
      render();
    });
  }
}

function readOnlyMarkup() {
  return `
    <div class="details-heading">TAARIFA ZA MSINGI</div>
    <div class="details-grid">
      <div class="detail-item"><span>Jina kamili</span><strong>${display(profile.full_name)}</strong></div>
      <div class="detail-item"><span>Barua pepe</span><strong>${display(user.email)}</strong></div>
      <div class="detail-item"><span>Namba ya simu</span><strong>${display(profile.phone_number)}</strong></div>
      <div class="detail-item"><span>Tarehe ya kuzaliwa</span><strong>${display(profile.date_of_birth)}</strong></div>
      <div class="detail-item"><span>Jinsia</span><strong>${display(genderLabels[profile.gender] || profile.gender)}</strong></div>
      <div class="detail-item detail-wide"><span>Anwani ya makazi</span><strong>${display(profile.residential_address)}</strong></div>
    </div>
    <div class="details-heading secondary-heading">UTAMBULISHO WA ZUNE</div>
    <section class="zune-id-card" aria-label="ZUNE ID QR Code">
      <div class="zune-id-copy">
        <span class="zune-id-label">ZUNE ID YAKO</span>
        <strong id="zune-id-value">${display(profile.zune_id)}</strong>
        <button type="button" class="copy-zune-id" id="copy-zune-id" ${profile.zune_id ? "" : "disabled"}>Nakili ZUNE ID</button>
      </div>
      <div class="zune-qr-wrap"><canvas id="zune-id-qr" width="148" height="148" aria-label="QR Code ya ZUNE ID"></canvas><small>Scan ZUNE ID</small></div>
    </section>
    <div class="details-grid identity-grid">
      <div class="detail-item"><span>ZUNE ID</span><strong>${display(profile.zune_id)}</strong></div>
      <div class="detail-item"><span>Tarehe ya kufungua akaunti</span><strong>${profile.created_at ? esc(new Date(profile.created_at).toLocaleDateString("sw-TZ", {day:"numeric",month:"long",year:"numeric"})) : '<span class="muted">Haijulikani</span>'}</strong></div>
    </div>
  `;
}

function editFormMarkup() {
  return `
    <form id="personal-form" class="personal-form" novalidate>
      <div class="details-heading">HARIRI TAARIFA ZAKO</div>
      <label class="field field-wide">Jina kamili
        <input name="full_name" type="text" maxlength="100" required value="${esc(profile.full_name || "")}" autocomplete="name">
      </label>
      <label class="field field-wide">Barua pepe
        <input type="email" value="${esc(user.email || "")}" disabled>
        <small>Barua pepe inahitaji utaratibu maalumu wa uthibitishaji ili kubadilishwa.</small>
      </label>
      <label class="field">Namba ya simu
        <input name="phone_number" type="tel" maxlength="25" value="${esc(profile.phone_number || "")}" autocomplete="tel" placeholder="+255...">
      </label>
      <label class="field">Tarehe ya kuzaliwa
        <input name="date_of_birth" type="date" value="${esc(profile.date_of_birth || "")}" max="${new Date().toISOString().slice(0,10)}">
      </label>
      <label class="field">Jinsia
        <select name="gender">
          <option value="">Chagua jinsia</option>
          <option value="male" ${profile.gender === "male" ? "selected" : ""}>Mwanaume</option>
          <option value="female" ${profile.gender === "female" ? "selected" : ""}>Mwanamke</option>
          <option value="other" ${profile.gender === "other" ? "selected" : ""}>Nyingine</option>
          <option value="prefer_not_to_say" ${profile.gender === "prefer_not_to_say" ? "selected" : ""}>Sitaki kusema</option>
        </select>
      </label>
      <label class="field field-wide">Anwani ya makazi
        <textarea name="residential_address" maxlength="500" rows="3" placeholder="Weka anwani yako ya makazi">${esc(profile.residential_address || "")}</textarea>
      </label>
      <div class="form-actions field-wide">
        <button class="save-button" id="save-personal" type="submit">Hifadhi Mabadiliko</button>
        <button class="cancel-button" id="cancel-personal" type="button">Ghairi</button>
      </div>
    </form>
  `;
}

function previewPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    event.target.value = "";
    showMessage("Chagua JPG, PNG au WebP isiyozidi 5MB.", true);
    return;
  }
  selectedPhoto = file;
}

function showMessage(text, isError = false) {
  const target = $("#personal-message");
  if (!target) return;
  target.textContent = text;
  target.className = "form-message " + (isError ? "error-message" : "success-message");
}

async function savePersonal(event) {
  event.preventDefault();
  if (saving) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const fullName = String(values.get("full_name") || "").trim();
  if (!fullName) return showMessage("Tafadhali weka jina lako kamili.", true);

  const birthDate = String(values.get("date_of_birth") || "");
  if (birthDate && birthDate > new Date().toISOString().slice(0, 10)) {
    return showMessage("Tarehe ya kuzaliwa haiwezi kuwa ya baadaye.", true);
  }

  const updates = {
    full_name: fullName,
    phone_number: String(values.get("phone_number") || "").trim() || null,
    date_of_birth: birthDate || null,
    gender: String(values.get("gender") || "") || null,
    residential_address: String(values.get("residential_address") || "").trim() || null
  };

  saving = true;
  const saveButton = $("#save-personal");
  saveButton.disabled = true;
  saveButton.textContent = "Inahifadhi...";

  let uploadedPath = null;
  const oldAvatarPath = profile.avatar_path;
  try {
    if (selectedPhoto) {
      const extension = selectedPhoto.type === "image/png" ? "png" : selectedPhoto.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = user.id + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("zune-avatars")
        .upload(uploadedPath, selectedPhoto, {
          contentType: selectedPhoto.type,
          upsert: false,
          cacheControl: "3600"
        });
      if (uploadError) throw uploadError;
      updates.avatar_path = uploadedPath;
    }

    const { data, error } = await supabase.from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id,full_name,phone_number,date_of_birth,gender,residential_address,avatar_path")
      .single();

    if (error) throw error;
    if (!data) throw new Error("Taarifa hazikuhifadhiwa. Tafadhali jaribu tena.");

    profile = { ...profile, ...data };
    if (uploadedPath) {
      const { data: blob, error: downloadError } = await supabase.storage.from("zune-avatars").download(uploadedPath);
      if (!downloadError && blob) {
        if (avatarUrl.startsWith("blob:")) URL.revokeObjectURL(avatarUrl);
        avatarUrl = URL.createObjectURL(blob);
      } else {
        console.warn("Avatar saved but preview could not be refreshed:", downloadError?.message);
      }
      if (oldAvatarPath && oldAvatarPath !== uploadedPath) {
        const { error: removeError } = await supabase.storage.from("zune-avatars").remove([oldAvatarPath]);
        if (removeError) console.warn("Old avatar cleanup failed:", removeError.message);
      }
    }

    selectedPhoto = null;
    editing = false;
    const preview = root.dataset.previewUrl;
    if (preview) URL.revokeObjectURL(preview);
    delete root.dataset.previewUrl;
    render();
    showMessage("Mabadiliko yako yamehifadhiwa kikamilifu.");
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("zune-avatars").remove([uploadedPath]);
    console.error("ZUNE personal information save:", error);
    showMessage(error.message || "Imeshindikana kuhifadhi taarifa. Jaribu tena.", true);
    saveButton.disabled = false;
    saveButton.textContent = "Hifadhi Mabadiliko";
  } finally {
    saving = false;
  }
}

async function init() {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!currentUser) {
      location.replace("./index.html");
      return;
    }
    user = currentUser;

    const { data, error } = await supabase.from("profiles")
      .select("id,zune_id,full_name,phone_number,avatar_path,role,is_verified,account_status,created_at,date_of_birth,gender,residential_address")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    profile = data || {};

    if (profile.avatar_path) {
      const { data: blob, error: avatarError } = await supabase.storage.from("zune-avatars").download(profile.avatar_path);
      if (!avatarError && blob) avatarUrl = URL.createObjectURL(blob);
    }

    document.documentElement.setAttribute("data-theme", localStorage.getItem("zune_theme") || "emerald");
    render();
  } catch (error) {
    console.error("ZUNE personal information load:", error);
    root.innerHTML = '<div class="load-error">Imeshindikana kupakia taarifa zako. ' + esc(error.message || "") + '</div>';
  }
}

init();
