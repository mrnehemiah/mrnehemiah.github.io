
/* =========================================
   ZUNE MARKETPLACE 2.0
   MAIN APPLICATION
   LOGIN + SIGNUP + MARKETPLACE
   SUPABASE + VANILLA JAVASCRIPT
========================================= */

import { supabase, unregisterZunePushToken } from "./supabase.js?v=phase6-push-token-ownership-20261128";

import {
  registerCustomer,
  loginCustomer,
  recoverPassword,
  getCustomerSession,
  getCurrentCustomer,
  logoutCustomer
} from "./auth.js";



const app = document.getElementById("app");
let marketplaceHomeModule = null;

// Keep recovery mode explicit so startup and PASSWORD_RECOVERY events cannot race.
let passwordRecoveryActive = window.location.hash.includes("type=recovery");

const state = {
  language: localStorage.getItem("zune_language") || "",
  screen: "language",
  signupStep: 1,

  firstName: "",
  middleName: "",
  lastName: "",
  phone: "+255",
  email: "",
  password: "",
  confirmPassword: "",

  loginIdentity: "",
  loginPassword: "",
  forgotEmail: "",
  forgotLoading: false,
  forgotNotice: "",
  showPassword: false,

  loading: false,
  signupSubmitted: false
};

/* =========================================
   TRANSLATIONS
========================================= */

const translations = {
  sw: {
    chooseLanguage: "Chagua lugha yako",
    languageDescription: "Karibu ZUNE. Chagua lugha unayopendelea.",
    swahili: "Kiswahili",
    english: "English",

    welcome: "Karibu ZUNE!",
    subtitle: "Soko lako la kisasa. Nunua na uza kwa urahisi.",

    login: "Ingia",
    signup: "Jisajili",
    emailOrPhone: "Barua pepe",
    password: "Nenosiri",
    forgot: "Umesahau nenosiri?",
    noAccount: "Huna akaunti?",
    haveAccount: "Tayari una akaunti?",

    firstName: "Jina la kwanza",
    middleName: "Jina la kati",
    lastName: "Jina la mwisho",
    phone: "Namba ya simu",
    email: "Barua pepe",
    createPassword: "Tengeneza nenosiri",
    confirmPassword: "Thibitisha nenosiri",

    continue: "Endelea",
    back: "Rudi nyuma",
    step: "Hatua",
    of: "kati ya 5",

    verifyTitle: "Thibitisha akaunti yako",
    verifyText: "Tutakutumia barua pepe yenye kiungo cha kuthibitisha akaunti yako.",
    finish: "Maliza usajili",

    required: "Tafadhali jaza sehemu zote zinazohitajika.",
    invalidPhone: "Weka namba sahihi ya simu.",
    invalidEmail: "Weka barua pepe sahihi.",
    passwordShort: "Nenosiri lazima liwe na angalau herufi 8.",
    passwordWeak: "Tumia angalau herufi 8, herufi kubwa na ndogo, namba na alama; usiweke nafasi.",
    passwordMismatch: "Nenosiri hazifanani.",

    loginMessage: "Muonekano wa kuingia umekamilika.",
    signupMessage: "Muundo wa usajili umekamilika.",
    forgotMessage: "Huduma ya kurejesha nenosiri.",

    forgotPrompt: "Ingiza barua pepe yako:",
    forgotSuccess: "Kiungo cha kurejesha nenosiri kimetumwa kwenye barua pepe yako ikiwa akaunti inapatikana.",

    signupSuccess: "Usajili umepokelewa! Angalia barua pepe yako ili kuthibitisha akaunti.",
    signupSessionSuccess: "Akaunti yako imetengenezwa na umeingia kikamilifu.",
    loginSuccess: "Umeingia kikamilifu.",

    logout: "Toka kwenye akaunti",
    accountTitle: "Akaunti yako ya ZUNE",
    accountWelcome: "Karibu kwenye akaunti yako.",

    emailVerification: "Tafadhali fungua barua pepe yako na ubofye kiungo cha uthibitisho.",
    loginAgain: "Rudi kuingia",
    processing: "Inachakata...",

    passwordRequired: "Tafadhali jaza barua pepe na nenosiri.",
    emailOnly: "Kwa sasa tumia barua pepe kuingia. Kuingia kwa namba ya simu bado hakujawashwa.",
    loginTitle: "Ingia kwenye akaunti yako",
    continueWithGoogle: "Endelea na Google",
    orContinueWith: "AU ENDELEA KWA BARUA PEPE",

    show: "Onyesha",
    hide: "Ficha",

    loginError: "Imeshindikana kuingia. Hakikisha taarifa zako ni sahihi.",
    signupError: "Usajili umeshindikana. Jaribu tena.",
    forgotError: "Imeshindikana kutuma kiungo cha kurejesha nenosiri.",

    stepOneTitle: "Tujuane kwanza",
    stepTwoTitle: "Namba yako ya simu",
    stepThreeTitle: "Barua pepe yako",
    stepFourTitle: "Linda akaunti yako"
  },

  en: {
    chooseLanguage: "Choose your language",
    languageDescription: "Welcome to ZUNE. Select your preferred language.",
    swahili: "Kiswahili",
    english: "English",

    welcome: "Welcome to ZUNE!",
    subtitle: "Your modern marketplace. Buy and sell with ease.",

    login: "Log In",
    signup: "Sign Up",
    emailOrPhone: "Email Address",
    password: "Password",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",

    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    phone: "Phone Number",
    email: "Email Address",
    createPassword: "Create Password",
    confirmPassword: "Confirm Password",

    continue: "Continue",
    back: "Go Back",
    step: "Step",
    of: "of 5",

    verifyTitle: "Verify your account",
    verifyText: "We will send you an email with a link to verify your account.",
    finish: "Complete Sign Up",

    required: "Please complete all required fields.",
    invalidPhone: "Enter a valid phone number.",
    invalidEmail: "Enter a valid email address.",
    passwordShort: "Password must contain at least 8 characters.",
    passwordWeak: "Use at least 8 characters with uppercase and lowercase letters, a number and a symbol; no spaces.",
    passwordMismatch: "Passwords do not match.",

    loginMessage: "The login interface is ready.",
    signupMessage: "The signup interface is ready.",
    forgotMessage: "Password recovery.",

    forgotPrompt: "Enter your email address:",
    forgotSuccess: "If an account exists, a password recovery link has been sent to your email.",

    signupSuccess: "Registration received! Check your email to verify your account.",
    signupSessionSuccess: "Your account has been created and you are now signed in.",
    loginSuccess: "You have successfully logged in.",

    logout: "Log Out",
    accountTitle: "Your ZUNE Account",
    accountWelcome: "Welcome to your account.",

    emailVerification: "Please open your email and click the verification link.",
    loginAgain: "Return to login",
    processing: "Processing...",

    passwordRequired: "Please enter your email and password.",
    emailOnly: "For now, use your email address to log in. Phone login is not enabled yet.",
    loginTitle: "Log in to your account",
    continueWithGoogle: "Continue with Google",
    orContinueWith: "OR CONTINUE WITH EMAIL",

    show: "Show",
    hide: "Hide",

    loginError: "Login failed. Please check your details.",
    signupError: "Registration failed. Please try again.",
    forgotError: "Unable to send the password recovery link.",

    stepOneTitle: "Let's get to know you",
    stepTwoTitle: "Your phone number",
    stepThreeTitle: "Your email address",
    stepFourTitle: "Secure your account"
  }
};

const t = key =>
  translations[state.language || "sw"][key] || key;

/* =========================================
   SAFE HTML
========================================= */

function isStrongPassword(value) {
  const password = String(value || "");
  return password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    !/\s/.test(password);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

/* =========================================
   ADDITIONAL PAGE STYLES
========================================= */

const extraStyles = document.createElement("style");

extraStyles.textContent = `
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
}

.panel {
  width: 100%;
  max-width: 430px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 22px;
  box-shadow: var(--shadow);
}

.brand-area {
  text-align: center;
  margin-bottom: 28px;
}

.brand-area .zune-logo {
  margin-bottom: 12px;
}

.page-title {
  font-size: 25px;
  margin-bottom: 10px;
  text-align: center;
}

.page-description {
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 24px;
}

.language-option {
  width: 100%;
  padding: 17px;
  margin: 8px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  text-align: left;
  font-weight: 700;
  cursor: pointer;
}

.language-option:hover {
  border-color: var(--primary);
  background: var(--background);
}

.full-button {
  width: 100%;
  margin-top: 12px;
}

.text-button {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 700;
  padding: 10px 0;
  cursor: pointer;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-muted);
}

.form-footer button {
  color: var(--primary);
  background: none;
  border: none;
  font-weight: 700;
  cursor: pointer;
}

.progress-track {
  height: 6px;
  width: 100%;
  background: var(--border);
  border-radius: 20px;
  margin: 18px 0;
  overflow: hidden;
}

.progress-value {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.step-label {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  margin-bottom: 14px;
}

.form-error {
  color: #D93636;
  font-size: 13px;
  margin: 12px 0;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.form-actions button {
  flex: 1;
}

.welcome-logo {
  margin-bottom: 25px;
  transform: scale(1.2);
}

.welcome-description {
  text-align: center;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 12px 0 30px;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-row {
  display: flex;
  gap: 8px;
}

.password-row .form-control {
  flex: 1;
  min-width: 0;
}

.google-auth-button {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0 0 18px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;
  color: #202124;
  font-weight: 700;
  cursor: pointer;
}
.google-auth-button:hover { background: #f8faf9; border-color: #aab8b0; }
.google-auth-button:disabled { opacity: .65; cursor: wait; }
.google-g-mark {
  font-family: Arial, sans-serif;
  font-size: 22px;
  font-weight: 900;
  background: conic-gradient(from -45deg, #4285F4 0 25%, #34A853 25% 50%, #FBBC05 50% 75%, #EA4335 75% 100%);
  color: transparent;
  background-clip: text;
  -webkit-background-clip: text;
}
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 18px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
}
.auth-divider::before, .auth-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--border);
}

.password-toggle {
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--primary);
  border-radius: var(--radius-md);
  padding: 0 12px;
  cursor: pointer;
}

@media (max-width: 380px) {
  .panel {
    padding: 22px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zune-logo.wave span {
    animation: none !important;
  }
}
`;

document.head.appendChild(extraStyles);

/* =========================================
   ZUNE LOGO
========================================= */

function logo() {
  return `
    <div class="zune-logo" id="zuneLogo">
      <span class="z-letter">Ⓩ</span>
      <span class="u-letter">Ⓤ</span>
      <span class="n-letter">Ⓝ</span>
      <span class="e-letter">Ⓔ</span>
    </div>
  `;
}

/* =========================================
   WAVE TRANSITION
========================================= */

function waveTo(callback) {
  const logoElement = document.getElementById("zuneLogo");

  if (!logoElement) {
    callback();
    return;
  }

  logoElement.classList.remove("wave");

  void logoElement.offsetWidth;

  logoElement.classList.add("wave");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  setTimeout(callback, reducedMotion ? 50 : 850);
}

/* =========================================
   LANGUAGE SCREEN
========================================= */

function renderLanguage() {
  state.screen = "language";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}

          <h1 class="page-title">
            ${t("chooseLanguage")}
          </h1>

          <p class="page-description">
            ${t("languageDescription")}
          </p>
        </div>

        <button class="language-option" id="swahiliBtn">
          🇹🇿 &nbsp; Kiswahili
        </button>

        <button class="language-option" id="englishBtn">
          🇬🇧 &nbsp; English
        </button>
      </div>
    </section>
  `;

  document.getElementById("swahiliBtn").onclick = () => {
    chooseLanguage("sw");
  };

  document.getElementById("englishBtn").onclick = () => {
    chooseLanguage("en");
  };
}

function chooseLanguage(language) {
  state.language = language;

  localStorage.setItem("zune_language", language);

  // Re-run the normal auth router after language selection.
  // Signed-in customers go straight to Marketplace Home; signed-out
  // visitors continue to the Welcome/Login flow.
  waveTo(() => startApp());
}

/* =========================================
   WELCOME SCREEN
========================================= */

function renderWelcome() {
  state.screen = "welcome";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          <div class="welcome-logo">
            ${logo()}
          </div>

          <h1 class="page-title">
            ${t("welcome")}
          </h1>

          <p class="welcome-description">
            ${t("subtitle")}
          </p>
        </div>

        <div class="welcome-actions">
          <button
            class="btn btn-primary full-button"
            id="loginBtn"
          >
            ${t("login")}
          </button>

          <button
            class="btn btn-secondary full-button"
            id="signupBtn"
          >
            ${t("signup")}
          </button>
        </div>

        <p class="form-footer">
          <button id="changeLanguageBtn">
            ${
              state.language === "sw"
                ? "Badilisha lugha"
                : "Change language"
            }
          </button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("loginBtn").onclick = () => {
    waveTo(renderLogin);
  };

  document.getElementById("signupBtn").onclick = () => {
    resetSignup();
    waveTo(renderSignup);
  };

  document.getElementById("changeLanguageBtn").onclick = () => {
    waveTo(renderLanguage);
  };
}

/* =========================================
   LOGIN SCREEN
========================================= */

function googleButtonMarkup() {
  return `<button class="google-auth-button" id="googleAuthBtn" type="button">
    <span class="google-g-mark" aria-hidden="true">G</span>
    <span>${t("continueWithGoogle")}</span>
  </button><div class="auth-divider">${t("orContinueWith")}</div>`;
}

async function handleGoogleAuth(button) {
  if (state.loading) return;
  state.loading = true;
  if (button) { button.disabled = true; const label = button.querySelector("span:last-child"); if (label) label.textContent = t("processing"); }
  try {
    const redirectTo = new URL("./", window.location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } }
    });
    if (error) throw error;
  } catch (error) {
    console.error("ZUNE Google authentication error:", error);
    state.loading = false;
    const message = error?.message || (state.language === "sw" ? "Imeshindikana kuendelea na Google. Hakikisha Google provider imewezeshwa." : "Unable to continue with Google. Check that Google sign-in is enabled.");
    if (state.screen === "login") renderLogin(message);
    else if (state.screen === "signup") renderSignup(message);
  }
}

function renderLogin(error = "") {
  state.screen = "login";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}

          <h1 class="page-title">
            ${t("loginTitle")}
          </h1>
        </div>

        ${googleButtonMarkup()}

        <form id="loginForm">
          <div class="form-group">
            <label>${t("emailOrPhone")}</label>

            <input
              class="form-control"
              type="email"
              id="loginIdentity"
              autocomplete="username"
              value="${escapeHTML(state.loginIdentity)}"
              required
            >
          </div>

          <div class="form-group">
            <label>${t("password")}</label>

            <div class="password-row">
              <input
                class="form-control"
                type="${state.showPassword ? "text" : "password"}"
                id="loginPassword"
                autocomplete="current-password"
                value="${escapeHTML(state.loginPassword)}"
                required
              >

              <button
                type="button"
                class="password-toggle"
                id="toggleLoginPassword"
              >
                ${state.showPassword ? t("hide") : t("show")}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="text-button"
            id="forgotBtn"
          >
            ${t("forgot")}
          </button>

          <p class="form-error">
            ${escapeHTML(error)}
          </p>

          <button
            class="btn btn-primary full-button"
            id="loginSubmit"
            type="submit"
            ${state.loading ? "disabled" : ""}
          >
            ${state.loading ? t("processing") : t("login")}
          </button>
        </form>

        <p class="form-footer">
          ${t("noAccount")}
          <button id="goSignup">${t("signup")}</button>
        </p>

        <p class="form-footer">
          <button id="backWelcome">${t("back")}</button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("googleAuthBtn").onclick = event => handleGoogleAuth(event.currentTarget);

  document.getElementById("toggleLoginPassword").onclick = () => {
    const passwordInput = document.getElementById("loginPassword");

    state.showPassword = !state.showPassword;

    passwordInput.type = state.showPassword ? "text" : "password";

    document.getElementById("toggleLoginPassword").textContent =
      state.showPassword ? t("hide") : t("show");
  };

  document.getElementById("forgotBtn").onclick = () => renderForgotPassword();

  document.getElementById("goSignup").onclick = () => {
    resetSignup();
    waveTo(renderSignup);
  };

  document.getElementById("backWelcome").onclick = () => {
    waveTo(renderWelcome);
  };

  document.getElementById("loginForm").onsubmit = handleLogin;
}

/* =========================================
   LOGIN WITH SUPABASE
========================================= */

async function handleLogin(event) {
  event.preventDefault();

  state.loginIdentity = document
    .getElementById("loginIdentity")
    .value.trim();

  state.loginPassword = document
    .getElementById("loginPassword")
    .value;

  if (!state.loginIdentity || !state.loginPassword) {
    renderLogin(t("passwordRequired"));
    return;
  }

  state.loading = true;
  renderLogin();

  try {
    await loginCustomer(state.loginIdentity, state.loginPassword);
    const { data: aal, error: aalError } = await withStartupTimeout(
        () => supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        5000,
        state.language === "sw"
          ? "Ukaguzi wa usalama umechelewa. Jaribu tena."
          : "Security verification timed out. Please retry."
      );
    if (aalError) throw aalError;
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      state.loading = false; state.loginPassword = ""; await renderMfaLoginChallenge(); return;
    }
    state.loading = false; state.loginPassword = ""; await renderAccount();

  } catch (error) {
    state.loading = false;

    renderLogin(error.message || t("loginError"));
  }
}

/* =========================================
   FORGOT PASSWORD
========================================= */

async function renderMfaLoginChallenge(errorText = "") {
 const sw=state.language==="sw";
 app.innerHTML='<section class="page"><div class="panel"><div class="brand-area">'+logo()+'<h1 class="page-title">'+(sw?"Thibitisha kuingia":"Verify your sign-in")+'</h1><p class="page-description">'+(sw?"Ingiza msimbo wa tarakimu 6 kutoka kwenye Authenticator.":"Enter the 6-digit code from your authenticator app.")+'</p></div><form id="mfa-login"><div class="form-group"><label>'+(sw?"Msimbo wa uthibitisho":"Authentication code")+'</label><input class="form-control" name="code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" required></div><p class="form-error" role="alert">'+escapeHTML(errorText)+'</p><button class="btn btn-primary full-button" id="mfa-submit" type="submit">'+(sw?"Thibitisha":"Verify")+'</button></form><p class="form-footer"><button id="mfa-exit" type="button">'+(sw?"Toka na urudi kuingia":"Sign out and return to login")+'</button></p></div></section>';
 document.getElementById("mfa-exit").onclick=async()=>{try{await unregisterZunePushToken();}catch(error){console.warn("ZUNE push token cleanup:",error);}const {error}=await supabase.auth.signOut({scope:"local"});if(error){renderMfaLoginChallenge(error.message);return;}state.loginPassword="";renderLogin();};
 document.getElementById("mfa-login").onsubmit=async e=>{e.preventDefault();const code=String(new FormData(e.currentTarget).get("code")||"").trim();if(!/^\d{6}$/.test(code)){renderMfaLoginChallenge(sw?"Weka msimbo sahihi wa tarakimu 6.":"Enter a valid 6-digit code.");return;}const submit=document.getElementById("mfa-submit");if(submit){submit.disabled=true;submit.textContent=sw?"Inathibitisha...":"Verifying...";}try{const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;const fs=(data?.totp||[]).filter(f=>f.status==="verified");if(!fs.length)throw new Error(sw?"Hakuna Authenticator iliyosajiliwa.":"No verified authenticator found.");let ok=false,last=null;for(const f of fs){const challenge=await supabase.auth.mfa.challenge({factorId:f.id});if(challenge.error){last=challenge.error;continue;}const verified=await supabase.auth.mfa.verify({factorId:f.id,challengeId:challenge.data.id,code});if(!verified.error){ok=true;break;}last=verified.error;}if(!ok)throw last||new Error(sw?"Msimbo si sahihi.":"Incorrect code.");await renderAccount();}catch(err){renderMfaLoginChallenge(err.message||"Verification failed.");}};
}

async function renderPasswordReset(errorText = "") {
 const sw=state.language==="sw";
 app.innerHTML='<section class="page"><div class="panel"><div class="brand-area">'+logo()+'<h1 class="page-title">'+(sw?"Tengeneza nenosiri jipya":"Set a new password")+'</h1><p class="page-description">'+(sw?"Weka nenosiri jipya la akaunti yako ya ZUNE.":"Choose a new password for your ZUNE account.")+'</p></div><form id="reset-password-form"><div class="form-group"><label>'+(sw?"Nenosiri jipya":"New password")+'</label><input class="form-control" type="password" name="password" minlength="8" autocomplete="new-password" required></div><div class="form-group"><label>'+(sw?"Rudia nenosiri":"Confirm password")+'</label><input class="form-control" type="password" name="confirm" minlength="8" autocomplete="new-password" required></div><p class="form-error">'+escapeHTML(errorText)+'</p><button class="btn btn-primary full-button" type="submit">'+(sw?"Hifadhi nenosiri":"Save password")+'</button></form></div></section>';
 document.getElementById("reset-password-form").onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const password=String(fd.get("password")||"");
  const confirmPassword=String(fd.get("confirm")||"");
  if(password!==confirmPassword){
   renderPasswordReset(sw?"Nenosiri hazifanani.":"Passwords do not match.");
   return;
  }
  if(!isStrongPassword(password)){
   renderPasswordReset(sw
    ?"Tumia angalau herufi 8 zenye herufi kubwa na ndogo, namba na alama; usiweke nafasi."
    :"Use at least 8 characters with uppercase and lowercase letters, a number and a symbol; no spaces.");
   return;
  }
  const btn=e.currentTarget.querySelector("button");
  btn.disabled=true;
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   alert(sw
    ?"Nenosiri limebadilishwa. Ingia tena kwa nenosiri jipya."
    :"Password updated. Please sign in again with your new password.");
   try{await unregisterZunePushToken();}catch(cleanupError){console.warn("ZUNE push token cleanup:",cleanupError);}
   await supabase.auth.signOut();
   renderLogin();
  }catch(err){
   renderPasswordReset(err.message||"Password update failed.");
  }
 };
}

function renderForgotPassword(errorText = "") {
  state.screen = "forgot-password";
  const sw = state.language === "sw";
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${sw ? "Rejesha nenosiri" : "Reset your password"}</h1>
          <p class="page-description">${sw ? "Weka barua pepe ya akaunti yako. Tutakutumia kiungo cha kuweka nenosiri jipya." : "Enter your account email. We’ll send you a secure link to choose a new password."}</p>
        </div>
        <form id="forgotPasswordForm">
          <div class="form-group">
            <label for="forgotEmail">${sw ? "Barua pepe" : "Email address"}</label>
            <input class="form-control" type="email" id="forgotEmail" autocomplete="email" value="${escapeHTML(state.forgotEmail)}" placeholder="${sw ? "mfano@barua.com" : "you@example.com"}" required>
          </div>
          <p class="form-error" role="alert">${escapeHTML(errorText)}</p>
          <p class="form-footer" id="forgotNotice" role="status">${escapeHTML(state.forgotNotice)}</p>
          <button class="btn btn-primary full-button" id="forgotSubmit" type="submit" ${state.forgotLoading ? "disabled" : ""}>
            ${state.forgotLoading ? (sw ? "Inatuma..." : "Sending...") : (sw ? "Tuma kiungo" : "Send reset link")}
          </button>
        </form>
        <p class="form-footer"><button type="button" id="forgotBack">${sw ? "Rudi kwenye kuingia" : "Back to log in"}</button></p>
      </div>
    </section>
  `;
  document.getElementById("forgotEmail").focus();
  document.getElementById("forgotPasswordForm").onsubmit = handleForgotPassword;
  document.getElementById("forgotBack").onclick = () => {
    state.forgotLoading = false;
    state.forgotNotice = "";
    renderLogin();
  };
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const email = document.getElementById("forgotEmail").value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    renderForgotPassword(t("invalidEmail"));
    return;
  }
  state.forgotEmail = email;
  state.forgotLoading = true;
  state.forgotNotice = "";
  renderForgotPassword();
  try {
    await recoverPassword(email);
    state.forgotLoading = false;
    state.forgotNotice = state.language === "sw"
      ? "Ikiwa akaunti ipo, kiungo cha kurejesha nenosiri kimetumwa kwenye barua pepe yako. Angalia pia Spam."
      : "If an account exists, a password reset link has been sent. Please also check your Spam folder.";
    renderForgotPassword();
  } catch (error) {
    state.forgotLoading = false;
    renderForgotPassword(error.message || t("forgotError"));
  }
}

/* =========================================
   SIGNUP RESET
========================================= */

function resetSignup() {
  state.signupStep = 1;

  state.firstName = "";
  state.middleName = "";
  state.lastName = "";
  state.phone = "+255";

  state.email = "";
  state.password = "";
  state.confirmPassword = "";

  state.signupSubmitted = false;
}

/* =========================================
   SIGNUP SCREEN
========================================= */

function renderSignup(error = "") {
  state.screen = "signup";

  const step = state.signupStep;

  let content = "";

  if (step === 1) {
    content = `
      <h2 class="page-title">${t("stepOneTitle")}</h2>

      <div class="form-group">
        <label>${t("firstName")}</label>
        <input
          class="form-control"
          id="firstName"
          value="${escapeHTML(state.firstName)}"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("middleName")}</label>
        <input
          class="form-control"
          id="middleName"
          value="${escapeHTML(state.middleName)}"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("lastName")}</label>
        <input
          class="form-control"
          id="lastName"
          value="${escapeHTML(state.lastName)}"
          required
        >
      </div>
    `;
  }

  if (step === 2) {
    content = `
      <h2 class="page-title">${t("stepTwoTitle")}</h2>

      <div class="form-group">
        <label>${t("phone")}</label>
        <input
          class="form-control"
          type="tel"
          id="phone"
          value="${escapeHTML(state.phone)}"
          placeholder="+255 7XXXXXXXX"
          required
        >
      </div>
    `;
  }

  if (step === 3) {
    content = `
      <h2 class="page-title">${t("stepThreeTitle")}</h2>

      <div class="form-group">
        <label>${t("email")}</label>
        <input
          class="form-control"
          type="email"
          id="email"
          value="${escapeHTML(state.email)}"
          autocomplete="email"
          required
        >
      </div>
    `;
  }

  if (step === 4) {
    content = `
      <h2 class="page-title">${t("stepFourTitle")}</h2>

      <div class="form-group">
        <label>${t("createPassword")}</label>
        <input
          class="form-control"
          type="password"
          id="newPassword"
          autocomplete="new-password"
          value="${escapeHTML(state.password)}"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("confirmPassword")}</label>
        <input
          class="form-control"
          type="password"
          id="confirmPassword"
          autocomplete="new-password"
          value="${escapeHTML(state.confirmPassword)}"
          required
        >
      </div>
    `;
  }

  if (step === 5 && !state.signupSubmitted) {
    content = `
      <h2 class="page-title">${t("verifyTitle")}</h2>

      <p class="page-description">
        ${t("verifyText")}
      </p>

      <p class="page-description">
        ${escapeHTML(state.email)}
      </p>
    `;
  }

  if (step === 5 && state.signupSubmitted) {
    content = `
      <h2 class="page-title">${t("verifyTitle")}</h2>

      <p class="page-description">
        ${t("signupSuccess")}
      </p>

      <p class="page-description">
        ${escapeHTML(state.email)}
      </p>
    `;
  }

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}

          <h1 class="page-title">
            ${t("signup")}
          </h1>
        </div>

        ${step === 1 ? googleButtonMarkup() : ""}

        <p class="step-label">
          ${t("step")} ${step} ${t("of")}
        </p>

        <div class="progress-track">
          <div
            class="progress-value"
            style="width:${step * 20}%"
          ></div>
        </div>

        <form id="signupForm">
          ${content}

          <p class="form-error">
            ${escapeHTML(error)}
          </p>

          <div class="form-actions">
            ${
              step > 1 && !state.signupSubmitted
                ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    id="signupBack"
                  >
                    ${t("back")}
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    id="signupCancel"
                  >
                    ${t("back")}
                  </button>
                `
            }

            <button
              type="submit"
              class="btn btn-primary"
              id="signupSubmit"
              ${state.loading ? "disabled" : ""}
            >
              ${
                state.loading
                  ? t("processing")
                  : state.signupSubmitted
                    ? t("loginAgain")
                    : step === 5
                      ? t("finish")
                      : t("continue")
              }
            </button>
          </div>
        </form>

        <p class="form-footer">
          ${t("haveAccount")}
          <button id="goLogin">${t("login")}</button>
        </p>
      </div>
    </section>
  `;

  if (step === 1) {
    document.getElementById("googleAuthBtn").onclick = event => handleGoogleAuth(event.currentTarget);
  }

  document.getElementById("signupForm").onsubmit = handleSignup;

  const backButton = document.getElementById("signupBack");

  if (backButton) {
    backButton.onclick = () => {
      saveSignupFields();

      state.signupStep--;

      waveTo(() => renderSignup());
    };
  }

  const cancelButton = document.getElementById("signupCancel");

  if (cancelButton) {
    cancelButton.onclick = () => {
      waveTo(renderWelcome);
    };
  }

  document.getElementById("goLogin").onclick = () => {
    waveTo(renderLogin);
  };
}

/* =========================================
   SAVE SIGNUP FORM DATA
========================================= */

function saveSignupFields() {
  const fields = [
    ["firstName", "firstName"],
    ["middleName", "middleName"],
    ["lastName", "lastName"],
    ["phone", "phone"],
    ["email", "email"]
  ];

  fields.forEach(([id, key]) => {
    const input = document.getElementById(id);

    if (input) {
      state[key] = input.value.trim();
    }
  });

  const passwordInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");

  if (passwordInput) {
    state.password = passwordInput.value;
  }

  if (confirmInput) {
    state.confirmPassword = confirmInput.value;
  }
}

/* =========================================
   SIGNUP VALIDATION AND SUBMISSION
========================================= */

async function handleSignup(event) {
  event.preventDefault();

  if (state.signupSubmitted) {
    state.loginIdentity = state.email;
    waveTo(renderLogin);
    return;
  }

  saveSignupFields();

  const step = state.signupStep;

  if (step === 1) {
    if (
      !state.firstName ||
      !state.middleName ||
      !state.lastName
    ) {
      renderSignup(t("required"));
      return;
    }
  }

  if (step === 2) {
    const phoneDigits = state.phone.replace(/\D/g, "");

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      renderSignup(t("invalidPhone"));
      return;
    }
  }

  if (step === 3) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(state.email)) {
      renderSignup(t("invalidEmail"));
      return;
    }
  }

  if (step === 4) {
    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    state.password = password;
    state.confirmPassword = confirm;

    if (password.length < 8) {
      renderSignup(t("passwordShort"));
      return;
    }

    if (!isStrongPassword(password)) {
      renderSignup(t("passwordWeak"));
      return;
    }

    if (password !== confirm) {
      renderSignup(t("passwordMismatch"));
      return;
    }
  }

  if (step === 5) {
    state.loading = true;
    renderSignup();

    try {
      const result = await registerCustomer({
        firstName: state.firstName,
        middleName: state.middleName,
        lastName: state.lastName,
        phone: state.phone,
        email: state.email,
        password: state.password
      });

      state.loading = false;

      state.password = "";
      state.confirmPassword = "";

      if (result?.session) {
        state.signupSubmitted = true;
        await renderAccount();
        return;
      }

      state.signupSubmitted = true;
      renderSignup();

      return;

    } catch (error) {
      state.loading = false;

      renderSignup(error.message || t("signupError"));
      return;
    }
  }

  state.signupStep++;

  waveTo(() => renderSignup());
}

/* =========================================
   MARKETPLACE ACCOUNT ENTRY
========================================= */

async function renderAccount(knownUser = null) {
  state.screen = "marketplace";

  try {
    // Tumia user aliyethibitishwa wakati wa startup ili kuepuka getUser() ya pili.
    const user = knownUser || await getCurrentCustomer();

    if (!user) {
      renderWelcome();
      return;
    }

    if (!marketplaceHomeModule) {
      // Ondoa loader ya pili ya full-screen; Home itajionyesha moja kwa moja ikishapakiwa.
      app.setAttribute("aria-busy", "true");
      marketplaceHomeModule = await withStartupTimeout(
        () => import("./home.js?v=20261128-smart-ranking-4"),
        7000,
        state.language === "sw"
          ? "Marketplace imechelewa kupakia. Angalia intaneti kisha jaribu tena."
          : "Marketplace module timed out. Check your connection and retry."
      );
    }

    await marketplaceHomeModule.renderMarketplaceHome({
      app,
      user,

      onLogout: async () => {
        await handleLogout();
      }
    });
    app.removeAttribute("aria-busy");

  } catch (error) {
    app.removeAttribute("aria-busy");
    console.error("ZUNE Marketplace error:", error);

    renderLogin(error.message || t("loginError"));
  }
}

/* =========================================
   LOGOUT
========================================= */

async function handleLogout() {
  try {
    await logoutCustomer();

    state.loginPassword = "";
    state.loginIdentity = "";

    waveTo(renderWelcome);

  } catch (error) {
    console.error("ZUNE logout error:", error);

    alert(
      state.language === "sw"
        ? "Imeshindikana kutoka kwenye akaunti."
        : "Unable to log out."
    );
  }
}

/* =========================================
   START APPLICATION
========================================= */

// Every network-backed startup step must fail visibly instead of holding the
// branded splash screen indefinitely on slow mobile connections.
function withStartupTimeout(task, milliseconds, message) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([
    Promise.resolve().then(() => typeof task === "function" ? task() : task),
    timeout
  ]).finally(() => window.clearTimeout(timerId));
}

function renderStartupError() {
  const sw = state.language === "sw";
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${sw ? "Imeshindikana kuthibitisha akaunti" : "Unable to verify your account"}</h1>
          <p class="page-description" role="alert">${sw ? "Muunganisho au uthibitishaji wa session umeshindwa. Akaunti yako haijatolewa nje. Jaribu tena." : "The connection or session check failed. You have not been signed out. Please try again."}</p>
        </div>
        <button class="btn btn-primary full-button" id="startupRetry" type="button">${sw ? "Jaribu tena" : "Try again"}</button>
      </div>
    </section>
  `;
  document.getElementById("startupRetry").onclick = startApp;
}

async function startApp() {
  if (!app) {
    console.error("ZUNE: Element with id app was not found.");
    return;
  }

  if (state.language !== "sw" && state.language !== "en") {
    renderLanguage();
    return;
  }

  try {
    // Never leave the branded splash screen running forever if the
    // Supabase session request stalls on a slow or unavailable connection.
    const session = await withStartupTimeout(
      () => getCustomerSession(),
      7000,
      state.language === "sw"
        ? "Kuangalia session kumechelewa. Angalia intaneti kisha jaribu tena."
        : "Session check timed out. Check your connection and retry."
    );

    if (session) {
      // New Google Marketplace accounts default to buyer; preserve existing account types.
      const authUser = await withStartupTimeout(
        () => getCurrentCustomer(),
        7000,
        state.language === "sw"
          ? "Kuthibitisha akaunti kumechelewa. Angalia intaneti kisha jaribu tena."
          : "Account verification timed out. Check your connection and retry."
      );
      if (authUser && !authUser.user_metadata?.account_type) {
        const metadataResult = await withStartupTimeout(
          () => supabase.auth.updateUser({ data: { account_type: "buyer" } }),
          5000,
          state.language === "sw"
            ? "Kuhifadhi aina ya akaunti kumechelewa. Jaribu tena."
            : "Saving account type timed out. Please retry."
        );
        if (metadataResult?.error) throw metadataResult.error;
      }
      // Password-recovery sessions must reach the reset form before the normal
      // sign-in MFA gate; otherwise an enrolled factor can trap the recovery flow.
      if (passwordRecoveryActive || location.hash.includes("type=recovery")) { passwordRecoveryActive = true; await renderPasswordReset(); return; }
      const aalResult = await withStartupTimeout(
        () => supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        5000,
        state.language === "sw"
          ? "Ukaguzi wa usalama umechelewa. Jaribu tena."
          : "Security verification timed out. Please retry."
      );
      const { data: aal, error: aalError } = aalResult || {};
      if (aalError) throw aalError;
      if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") { await renderMfaLoginChallenge(); return; }
      await renderAccount(authUser);
      return;
    }

    renderWelcome();

  } catch (error) {
    console.error("ZUNE startup error:", error);
    renderStartupError();
  }
}

/* =========================================
   RUN ZUNE APPLICATION
========================================= */

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    passwordRecoveryActive = true;
    renderPasswordReset();
  }
});

startApp().finally(() => {
  window.dispatchEvent(new Event("zune:app-ready"));
});
