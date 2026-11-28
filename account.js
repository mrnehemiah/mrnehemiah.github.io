import { supabase } from "./supabase.js";

const root = document.getElementById("account-root");
const logoutButton = document.getElementById("account-logout");
const LANG_KEY = "zune_language";
const THEME_KEY = "zune_account_theme";
let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "sw";
let themeMode = ["system","light","dark"].includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : "system";
const copy = {
  sw: {eyebrow:"AKAUNTI YANGU",profile:"Tazama wasifu",quick:"Njia za haraka",myProfile:"Wasifu",verification:"Uthibitishaji",orders:"Oda zangu",wishlist:"Wishlist",shopping:"Manunuzi na Delivery",cart:"Kikapu cha manunuzi",addresses:"Anwani zangu",recent:"Bidhaa ulizotazama",reviews:"Maoni na tathmini",wallet:"Payments & Wallet",available:"Salio linalopatikana",spending:"Jumla iliyotoka",transactions:"Historia ya miamala",paymentMethods:"Njia za malipo",seller:"Seller Centre",become:"Kuwa Muuzaji",pending:"Maombi yametumwa",pendingText:"Ombi lako la kufungua duka linasubiri kukaguliwa.",approved:"Duka lako limeidhinishwa",sellerText:"Simamia bidhaa, oda na biashara yako.",dashboard:"Fungua Seller Dashboard",settings:"Mipangilio ya Akaunti",personal:"Taarifa binafsi",security:"Usalama wa akaunti",notifications:"Notifications",language:"Lugha",appearance:"Muonekano",privacy:"Faragha na usalama",support:"Msaada na Support",about:"Kuhusu ZUNE",logout:"Toka kwenye akaunti",system:"Fuata simu",light:"Light Mode",dark:"Dark Mode",save:"Hifadhi",cancel:"Ghairi",close:"Funga",chooseLanguage:"Chagua lugha",chooseTheme:"Chagua muonekano",active:"Inatumika",customer:"Mteja",sellerRole:"Muuzaji",id:"ZUNE ID",copy:"Nakili",copied:"Imenakiliwa",walletEmpty:"Wallet haijawezeshwa bado.",notReady:"Sehemu hii bado haipatikani.",signIn:"Ingia au jisajili",signInText:"Ingia ili kusimamia akaunti yako.",logoutConfirm:"Una uhakika unataka kutoka kwenye akaunti?",totalIn:"Jumla iliyoingia"},
  en: {eyebrow:"MY ACCOUNT",profile:"View profile",quick:"Quick Access",myProfile:"My Profile",verification:"Verification",orders:"My Orders",wishlist:"Wishlist",shopping:"Shopping & Delivery",cart:"Shopping Cart",addresses:"My Addresses",recent:"Recently Viewed",reviews:"Reviews & Ratings",wallet:"Payments & Wallet",available:"Available Balance",spending:"Total Spending",transactions:"Transaction History",paymentMethods:"Payment Methods",seller:"Seller Centre",become:"Become a Seller",pending:"Application submitted",pendingText:"Your seller application is waiting for review.",approved:"Your store is approved",sellerText:"Manage your products, orders and business.",dashboard:"Open Seller Dashboard",settings:"Account Settings",personal:"Personal Information",security:"Account Security",notifications:"Notifications",language:"Language",appearance:"Appearance",privacy:"Privacy & Security",support:"Help & Support",about:"About ZUNE",logout:"Log out",system:"Follow device",light:"Light Mode",dark:"Dark Mode",save:"Save",cancel:"Cancel",close:"Close",chooseLanguage:"Choose language",chooseTheme:"Choose appearance",active:"Active",customer:"Customer",sellerRole:"Seller",id:"ZUNE ID",copy:"Copy",copied:"Copied",walletEmpty:"Wallet is not enabled yet.",notReady:"This feature is not available yet.",signIn:"Sign in or create an account",signInText:"Sign in to manage your account.",logoutConfirm:"Are you sure you want to log out?",totalIn:"Total received"}
};
const t = key => copy[lang][key] || key;
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat(lang==="sw"?"sw-TZ":"en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(value)||0);
function applyTheme(){
  const dark = themeMode === "dark" || (themeMode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.accountTheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#10231c":"#087A55");
}
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if(themeMode==="system")applyTheme();});
function verifiedBadge(){return '<span class="account-name-verified" role="img" aria-label="Verified Account" title="Verified Account"><svg viewBox="-30 -30 60 60" aria-hidden="true"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';}
function icon(symbol){return '<span class="account-row-icon" aria-hidden="true">'+symbol+'</span>';}
function row(symbol,title,description,href,disabled=false){return disabled?'<div class="account-list-row is-disabled" aria-disabled="true">'+icon(symbol)+'<span class="account-row-copy"><b>'+title+'</b><small>'+description+'</small></span><span class="account-row-note">—</span></div>':'<a class="account-list-row" href="'+href+'">'+icon(symbol)+'<span class="account-row-copy"><b>'+title+'</b><small>'+description+'</small></span><span class="account-row-arrow">›</span></a>';}
function group(title,rows,extraClass=""){return '<section class="account-section account-list-section '+extraClass+'"><h2>'+title+'</h2><div class="account-list-card">'+rows.join("")+'</div></section>';}
function renderGuest(){root.innerHTML='<section class="account-guest"><div class="account-guest-mark">Ⓩ</div><h1>Karibu ZUNE</h1><p>'+t("signInText")+'</p><a class="account-primary-button" href="./index.html">'+t("signIn")+'</a></section>';}
async function init(){
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session?.user){renderGuest();return;}
  const user=session.user;
  const [profileResult,applicationResult,walletResult,ledgerResult]=await Promise.all([
    supabase.from("profiles").select("full_name,is_verified,zune_id,role,avatar_path,account_status").eq("id",user.id).maybeSingle(),
    supabase.from("seller_applications").select("id,store_name,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("wallets").select("balance,updated_at").eq("user_id",user.id).maybeSingle(),
    supabase.from("wallet_ledger").select("amount").eq("user_id",user.id).limit(500)
  ]);
  for(const result of [profileResult,applicationResult,walletResult,ledgerResult])if(result.error)throw result.error;
  const profile=profileResult.data||{}, application=applicationResult.data;
  const name=profile.full_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"ZUNE Customer";
  const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  const verified=profile.is_verified===true;
  const role=String(profile.role||"customer").toLowerCase();
  const isSeller=role==="vendor"&&String(profile.account_status||"active")==="active"&&application?.status==="approved";
  const pending=!!application&&["pending","submitted","under_review"].includes(String(application.status||"").toLowerCase());
  let avatar='<span>'+esc(initials)+'</span>';
  if(profile.avatar_path){try{const {data,error}=await supabase.storage.from("zune-avatars").download(profile.avatar_path);if(!error&&data){const url=URL.createObjectURL(data);avatar='<img src="'+url+'" alt="Profile photo">';}}catch(e){console.warn("ZUNE account avatar:",e);}}
  const totalOut=(ledgerResult.data||[]).filter(x=>Number(x.amount)<0).reduce((sum,x)=>sum+Math.abs(Number(x.amount)),0);
  const balance=walletResult.data?money(walletResult.data.balance):"—";
  const walletStatus=walletResult.data?'<strong>'+esc(balance)+'</strong>':'<strong>—</strong><small>'+t("walletEmpty")+'</small>';
  const sellerBlock=isSeller?'<section class="account-seller-card"><div class="account-seller-top"><span class="account-seller-icon">▣</span><div><b>'+esc(application.store_name||name+"'s Store")+'</b><small>'+t("approved")+'</small></div><span class="account-approved">✓</span></div><p>'+t("sellerText")+'</p><a class="account-primary-button" href="https://mrnehemiah.github.io/zuneacts/">'+t("dashboard")+' →</a></section>':pending?'<section class="account-seller-card is-pending"><div class="account-seller-top"><span class="account-seller-icon">◷</span><div><b>'+t("pending")+'</b><small>'+esc(application.store_name||"ZUNE Store")+'</small></div></div><p>'+t("pendingText")+'</p><span class="account-status-pill">'+t("pending")+'</span></section>':'<a class="account-become-seller" href="./index.html?tab=me"><span class="account-seller-icon">＋</span><span><b>'+t("become")+'</b><small>'+ (lang==="sw"?"Anzisha duka lako ZUNE":"Start your ZUNE store")+'</small></span><span class="account-row-arrow">›</span></a>';
  root.innerHTML=
    '<section class="account-identity-card" tabindex="0" role="button" aria-expanded="false" aria-controls="account-identity-details"><span class="account-avatar">'+avatar+'</span><span class="account-identity-main"><small class="account-eyebrow">'+t("eyebrow")+'</small><span class="account-name">'+esc(name)+(verified?verifiedBadge():"")+'</span><small class="account-identity-hint">'+t("profile")+'</small></span><span class="account-expand-icon">⌄</span><span class="account-identity-details" id="account-identity-details" hidden><span><small>'+t("id")+'</small><b>'+esc(profile.zune_id||"—")+'</b><button type="button" class="account-copy-id" data-copy-id="'+esc(profile.zune_id||"")+'">'+t("copy")+'</button></span><span><small>Email / Phone</small><b>'+esc(user.email||user.phone||"—")+'</b></span><span><small>'+t("active")+'</small><b>'+esc(profile.account_status||"active")+'</b></span><span><small>Account type</small><b>'+ (isSeller?t("sellerRole"):t("customer"))+'</b></span><a href="./profile.html">'+t("profile")+' →</a></span></section>'+
    '<section class="account-section account-quick-section"><h2>'+t("quick")+'</h2><div class="account-quick-grid">'+
      '<a href="./profile.html"><span>♙</span><small>'+t("myProfile")+'</small></a>'+
      '<a href="./verification.html"><span>✓</span><small>'+t("verification")+'</small></a>'+
      '<a href="./orders.html"><span>▤</span><small>'+t("orders")+'</small></a>'+
      '<a href="#" class="is-disabled" aria-disabled="true" data-unavailable><span>♡</span><small>'+t("wishlist")+'</small></a>'+
    '</div></section>'+
    group(t("shopping"),[
      row("▣",t("cart"),lang==="sw"?"Bidhaa zako za kununua":"Items ready for checkout","./cart.html"),
      row("⌖",t("addresses"),lang==="sw"?"Anwani za kupokea bidhaa":"Delivery addresses","./addresses.html"),
      row("◷",t("recent"),t("notReady"),null,true),
      row("☆",t("reviews"),t("notReady"),null,true)
    ],"account-shopping-section")+
    '<section class="account-section account-wallet-section"><div class="account-section-title"><h2>'+t("wallet")+'</h2><a href="./wallet.html">'+t("transactions")+' →</a></div><a class="account-wallet-card" href="./wallet.html"><span class="account-wallet-mark">Ⓩ</span><span class="account-wallet-label">'+t("available")+'</span>'+walletStatus+'<span class="account-wallet-stats"><span><small>'+t("spending")+'</small><b>'+esc(money(totalOut))+'</b></span><span><small>'+t("transactions")+'</small><b>→</b></span></span></a></section>'+
    '<section class="account-section"><h2>'+t("seller")+'</h2>'+sellerBlock+'</section>'+
    group(t("settings"),[
      row("♙",t("personal"),lang==="sw"?"Jina, simu na picha ya wasifu":"Name, phone and profile photo","./profile.html"),
      row("⌑",t("security"),lang==="sw"?"Password na historia ya kuingia":"Password and sign-in history","./settings.html?section=security"),
      row("♧",t("notifications"),lang==="sw"?"Taarifa na arifa zako":"Your alerts and updates","./notifications.html"),
      '<button class="account-list-row account-action-row" type="button" data-account-action="language">'+icon("文")+'<span class="account-row-copy"><b>'+t("language")+'</b><small>'+(lang==="sw"?"Kiswahili":"English")+'</small></span><span class="account-row-arrow">›</span></button>',
      '<button class="account-list-row account-action-row" type="button" data-account-action="theme">'+icon("◐")+'<span class="account-row-copy"><b>'+t("appearance")+'</b><small>'+t(themeMode)+'</small></span><span class="account-row-arrow">›</span></button>',
      row("⛨",t("privacy"),lang==="sw"?"Dhibiti taarifa zako":"Manage your data","./account-data.html")
    ])+
    group(t("support"),[
      row("?",t("support"),lang==="sw"?"Pata msaada kutoka ZUNE":"Get help from ZUNE","./support.html"),
      row("Ⓩ",t("about"),lang==="sw"?"Taarifa rasmi za ZUNE":"Official ZUNE information","./about-zune.html"),
      '<button class="account-list-row account-action-row account-logout-row" type="button" data-account-action="logout">'+icon("↗")+'<span class="account-row-copy"><b>'+t("logout")+'</b></span><span class="account-row-arrow">›</span></button>'
    ]);
  root.querySelector(".account-identity-card")?.addEventListener("click",e=>{
    if(e.target.closest("[data-copy-id]")||e.target.closest("a"))return;
    const card=e.currentTarget,details=card.querySelector(".account-identity-details"),open=card.getAttribute("aria-expanded")==="true";
    card.setAttribute("aria-expanded",String(!open));details.hidden=open;
  });
  root.querySelector("[data-copy-id]")?.addEventListener("click",async e=>{e.stopPropagation();const id=e.currentTarget.dataset.copyId;if(!id)return;try{await navigator.clipboard.writeText(id);e.currentTarget.textContent=t("copied");}catch{alert(id);}});
  root.querySelectorAll("[data-unavailable]").forEach(el=>el.addEventListener("click",e=>e.preventDefault()));
  root.addEventListener("click",e=>{
    const action=e.target.closest("[data-account-action]")?.dataset.accountAction;
    if(action==="language")showChoice("language");
    if(action==="theme")showChoice("theme");
    if(action==="logout"&&confirm(t("logoutConfirm")))logout();
  });
}
function showChoice(type){
  const isLang=type==="language";
  const options=isLang?[["sw","Kiswahili"],["en","English"]]:[["system",t("system")],["light",t("light")],["dark",t("dark")]];
  const title=isLang?t("chooseLanguage"):t("chooseTheme");
  const current=isLang?lang:themeMode;
  const dialog=document.createElement("dialog");dialog.className="account-choice-dialog";
  dialog.innerHTML='<form method="dialog"><header><b>'+title+'</b><button value="cancel" aria-label="'+t("close")+'">×</button></header>'+options.map(([value,label])=>'<label><input type="radio" name="choice" value="'+value+'" '+(current===value?"checked":"")+'><span>'+label+'</span></label>').join("")+'<button class="account-primary-button" value="save">'+t("save")+'</button></form>';
  document.body.append(dialog);dialog.showModal();
  dialog.addEventListener("close",()=>{const value=dialog.querySelector('input[name="choice"]:checked')?.value;dialog.remove();if(dialog.returnValue!=="save"||!value)return;if(isLang){lang=value;localStorage.setItem(LANG_KEY,value);}else{themeMode=value;localStorage.setItem(THEME_KEY,value);applyTheme();}init().catch(err=>{console.error(err);});});
}
async function logout(){const buttons=root.querySelectorAll('[data-account-action="logout"]');buttons.forEach(b=>b.disabled=true);const {error}=await supabase.auth.signOut();if(error){buttons.forEach(b=>b.disabled=false);alert(error.message||"Logout failed");return;}location.replace("./index.html");}
init().catch(error=>{console.error("ZUNE Account:",error);root.innerHTML='<p class="account-error">Imeshindikana kupakia akaunti. Tafadhali jaribu tena.</p>';});
