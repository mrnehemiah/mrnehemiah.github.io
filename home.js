// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 1/4
// ============================================

import { supabase } from "./supabase.js";

// --------------------------------------------
// 1. SETTINGS AND STATE
// --------------------------------------------

let cartModule = null;

const PAGE_SIZE = 12;




function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("ZUNE storage error:", key, error);
    return fallback;
  }
}

const homeState = {
  products: [],
  categories: [],
  featuredStores: [],
  statusByStore: {},
  statusesLoadedAt: 0,
  sponsoredCampaigns: [],
  sponsoredProducts: [],
  sponsoredStores: [],
  sponsoredAdsLoaded: false,
  maxSponsoredAdsPerPlacement: 3,
  selectedVendor: "",
  searchSuggestionsOpen: false,
  searchFilters: { minPrice:"", maxPrice:"", inStock:false, verifiedOnly:false, sort:"newest" },
  selectedSearchImage: null,

  selectedCategory: "",
  search: "",

  page: 0,
  loading: false,
  loadError: false,
  hasMore: true,

  activeTab: "home",

  saved: [],
  cart: [],
  cartProducts: [],
  cartProductsKey: "",
  cartProductsLoading: false,
  cartProductsError: false,

  liveBroadcasts: [],
  liveLoading: false,
  liveLoaded: false,
  liveError: "",
  liveSelectedId: "",
  liveLikedIds: new Set(),
  liveGiftCounts: {},
  liveMiniPlayer: false,
  liveAutoNextTimer: null,

  user: null,
  app: null,
  onLogout: null,
  accountProfile: null,
  sellerApplication: null,
  customerVerificationRequest: null,
  accountLoading: false,
  accountLoadedFor: null,
  accountError: "",
  accountNavigating: false,

  observer: null,
  requestId: 0,
  carouselIndex: 0,
  carouselTimer: null
};

// --------------------------------------------
// 2. LANGUAGE TRANSLATIONS
// --------------------------------------------

const homeText = {
  sw: {
    search: "Tafuta bidhaa...",
    categories: "Makundi ya bidhaa",
    allCategories: "Makundi yote",
    all: "Zote",
    latest: "Bidhaa mpya",

    empty: "Bado hakuna bidhaa zilizowekwa.",
    emptySearch: "Hakuna bidhaa zilizopatikana.",

    loading: "Inapakia bidhaa...",
    retry: "Jaribu tena",
    loadError: "Imeshindikana kupakia bidhaa.",
    end: "Umefika mwisho wa bidhaa.",

    home: "Nyumbani",
    explore: "Gundua",
    cart: "Kikapu",
    saved: "Zilizohifadhiwa",
    me: "Akaunti",

    savedEmpty: "Bado hujahifadhi bidhaa.",
    cartEmpty: "Kikapu chako bado hakina bidhaa.",

    price: "Bei",
    seller: "Muuzaji",
    account: "Akaunti yangu",
    logout: "Toka kwenye akaunti",

    welcome: "Karibu ZUNE",
    homeTitle: "Gundua bidhaa bora kutoka kwa wauzaji mbalimbali.",
    exploreTitle: "Gundua bidhaa",
    savedTitle: "Bidhaa ulizohifadhi",
    cartTitle: "Kikapu chako",

    addCart: "Weka kikapuni",
    added: "Imeongezwa kikapuni",
    remove: "Ondoa",
    total: "Jumla",
    continueShopping: "Endelea kununua",

    quantity: "Idadi",
    cartCount: "Bidhaa",
    emptyName: "Bidhaa",

    orderSummary: "Muhtasari wa oda",
    subtotal: "Jumla ndogo",
    checkout: "Endelea kulipia",
    checkoutNote: "Malipo yatapatikana baada ya kuunganishwa kwa mfumo wa malipo.",
    checkoutComingSoon: "Mfumo wa malipo utaunganishwa baadaye.",

    yourCollection: "Mkusanyiko wako",
    yourProfile: "Wasifu wako",
    noSaved: "Hakuna bidhaa zilizohifadhiwa",
    noSavedText: "Hifadhi bidhaa unazozipenda ili uzipate kwa urahisi.",
    exploreProducts: "Gundua bidhaa",

    yourCart: "Ununuzi wako",
    emptyCart: "Kikapu kiko tupu",
    emptyCartText: "Ongeza bidhaa unazotaka kununua."
  },

  en: {
    search: "Search products...",
    categories: "Product categories",
    allCategories: "All categories",
    all: "All",
    latest: "Latest products",

    empty: "No products have been listed yet.",
    emptySearch: "No products found.",

    loading: "Loading products...",
    retry: "Try again",
    loadError: "Unable to load products.",
    end: "You have reached the end.",

    home: "Home",
    explore: "Explore",
    cart: "Cart",
    saved: "Saved",
    me: "Account",

    savedEmpty: "You have not saved any products yet.",
    cartEmpty: "Your cart is empty.",

    price: "Price",
    seller: "Seller",
    account: "My account",
    logout: "Log out",

    welcome: "Welcome to ZUNE",
    homeTitle: "Discover great products from different sellers.",
    exploreTitle: "Explore products",
    savedTitle: "Your saved products",
    cartTitle: "Your shopping cart",

    addCart: "Add to cart",
    added: "Added to cart",
    remove: "Remove",
    total: "Total",
    continueShopping: "Continue shopping",

    quantity: "Quantity",
    cartCount: "Items",
    emptyName: "Product",

    orderSummary: "Order summary",
    subtotal: "Subtotal",
    checkout: "Continue to checkout",
    checkoutNote: "Payments will be available after payment integration.",
    checkoutComingSoon: "Payment system will be connected later.",

    yourCollection: "Your collection",
    yourProfile: "Your profile",
    noSaved: "No saved products",
    noSavedText: "Save products you like to find them easily.",
    exploreProducts: "Explore products",

    yourCart: "Your shopping",
    emptyCart: "Your cart is empty",
    emptyCartText: "Add products you want to buy."
  }
};

// --------------------------------------------
// 3. LANGUAGE AND TEXT HELPERS
// --------------------------------------------

function language() {
  return localStorage.getItem("zune_language") === "en"
    ? "en"
    : "sw";
}

function tx(key) {
  return homeText[language()][key] || key;
}

function userStorageKey(baseKey) {
  const userId = homeState.user?.id;
  return userId ? `${baseKey}:${userId}` : null;
}

function readUserStorage(baseKey, fallback) {
  const key = userStorageKey(baseKey);
  if (!key) return fallback;
  return readStorage(key, fallback);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(
    language() === "sw" ? "sw-TZ" : "en-TZ"
  ).format(amount) + " TSh";
}

// --------------------------------------------
// 4. CART STORAGE HELPERS
// --------------------------------------------

function getCartCount() {
  return homeState.cart.reduce(
    (total, item) =>
      total + Math.max(0, Number(item.quantity) || 0),
    0
  );
}

let cartCloudSync = Promise.resolve();

function saveCart() {
  const key = userStorageKey("zune_cart");
  const userId = homeState.user?.id;
  if (!key || !userId) return;
  localStorage.setItem(key, JSON.stringify(homeState.cart));
  updateCartBadges();
  const snapshot = homeState.cart.map(item => ({ productId: String(item.productId), variantId: item.variantId || null, quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)) }));
  cartCloudSync = cartCloudSync.then(async () => {
    const removed = await supabase.from("cart_items").delete().eq("user_id", userId);
    if (removed.error) throw removed.error;
    if (snapshot.length) {
      const rows = snapshot.map(item => ({ user_id: userId, product_id: item.productId, variant_id: item.variantId, quantity: item.quantity }));
      const saved = await supabase.from("cart_items").insert(rows);
      if (saved.error) throw saved.error;
    }
  }).catch(error => console.warn("ZUNE cart cloud sync:", error.message));
  return cartCloudSync;
}

function updateCartBadges() {
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    const count = getCartCount();

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });
}

// --------------------------------------------
// 5. ICON SYSTEM
// --------------------------------------------

function zIcon(name) {
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',

    explore: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M14 8l-2 5-5 2 2-5z"/>',

    live: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/><path d="M3 7h2M19 7h2M3 17h2M19 17h2"/>',

    cart: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.5L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',

    notification: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',

    saved: '<path d="M20.8 8.6c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.8 4.8 0 0 1 8.8-2.5 4.8 4.8 0 0 1 8.8 2.5z"/>',

    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',

    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',

    plus: '<path d="M12 5v14M5 12h14"/>',

    minus: '<path d="M5 12h14"/>',

    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>'
  };

  return `
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${icons[name] || icons.home}
    </svg>
  `;
}

// --------------------------------------------
// 6. LUXURY EMERALD STYLES
// --------------------------------------------

function addHomeStyles() {
  if (document.getElementById("zuneHomeStyles")) return;

  const style = document.createElement("style");
  style.id = "zuneHomeStyles";

  style.textContent = `

    .z-home,
    .z-marketplace {
      min-height: 100vh;
      background: var(--background, #f5f7f6);
      color: var(--text, #17231e);
      font-family: inherit;
    }

    .z-home {
      padding-bottom: 100px;
    }

    .z-home-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: var(--surface, #ffffff);
      border-bottom: 1px solid var(--border, #e4ebe7);
      padding: 15px 16px;
    }

    .z-home-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 15px;
    }

    .z-home-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 800;
    }

    .zune-logo {
      display: flex;
      align-items: center;
      gap: 2px;
      color: var(--primary, #087a55);
      font-size: 25px;
      font-weight: 900;
    }

    .z-home-actions {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .z-icon-button {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--background, #f5f7f6);
      color: var(--text, #17231e);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .z-search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 49px;
      padding: 0 13px;
      background: var(--background, #f5f7f6);
      border: 1px solid var(--border, #e4ebe7);
      border-radius: 15px;
    }

    .z-search-box { position:relative; }
    .z-search-suggestions{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:40;display:none;max-height: min(55vh,360px);overflow:auto;padding:7px;border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:0 12px 30px rgba(0,0,0,.14)}
    .z-search-suggestions.open{display:block}
    .z-search-suggestion{width:100%;display:flex;align-items:center;gap:10px;padding:10px;border:0;border-radius:9px;background:transparent;color:var(--text);text-align:left;font-size:12px;cursor:pointer}
    .z-search-suggestion:hover{background:var(--background)}
    .z-search-suggestion small{display:block;color:var(--text-muted);margin-top:3px}
    .z-product-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(155px,43%);gap:11px;overflow-x:auto;padding:2px 1px 13px;scroll-snap-type:x mandatory;scrollbar-width:none}
    .z-product-row>.z-product-card{scroll-snap-align:start}
    @media(min-width:700px){.z-product-row{grid-auto-columns:minmax(190px,24%)}}
    .z-featured-stores{display:flex;gap:18px;overflow-x:auto;padding:5px 2px 14px;scrollbar-width:none}
    .z-featured-stores::-webkit-scrollbar{display:none}
    .z-featured-store{flex:0 0 92px;min-height:132px;padding:7px 4px;border:0;border-radius:14px;background:transparent;color:var(--text);text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer}
    .z-featured-store-logo{width:76px;height:76px;flex:0 0 76px;border-radius:50%;display:grid;place-items:center;overflow:hidden;border:2px solid var(--border);background:var(--surface);color:var(--primary);font-size:23px;font-weight:900;letter-spacing:-1px;box-shadow:0 3px 12px rgba(0,0,0,.07)}
    .z-featured-store-logo.has-status{border:3px solid transparent;background:linear-gradient(var(--surface,#fff),var(--surface,#fff)) padding-box,conic-gradient(from 0deg,#1eb53a 0 25%,#fcd116 25% 38%,#111 38% 63%,#00a3dd 63% 100%) border-box;box-shadow:0 0 0 2px var(--surface,#fff),0 0 0 4px #1eb53a55}
    .z-featured-store-logo.has-unseen-status{animation:zuneStatusRingPulse 2.4s ease-in-out infinite}
    .z-featured-store-logo.status-seen{border:3px solid #aeb8b2;background:var(--surface)}
    @keyframes zuneStatusRingPulse{0%,100%{box-shadow:0 0 0 2px var(--surface,#fff),0 0 0 4px #1eb53a55}50%{box-shadow:0 0 0 2px var(--surface,#fff),0 0 0 6px #00a3dd55}}
    .z-status-viewer{position:fixed;inset:0;z-index:9999;background:rgba(5,12,9,.96);display:flex;align-items:center;justify-content:center;padding:18px}
    .z-status-card{position:relative;width:min(100%,430px);height:min(86vh,760px);border-radius:22px;overflow:hidden;background:#111;color:#fff;display:flex;flex-direction:column}
    .z-status-progress{display:flex;gap:4px;padding:12px 12px 5px;position:absolute;top:0;left:0;right:0;z-index:3}
    .z-status-progress span{height:3px;border-radius:9px;background:#ffffff66;flex:1}.z-status-progress span{overflow:hidden}.z-status-progress span i{display:block;width:0;height:100%;background:#fff;border-radius:9px}.z-status-top small{font-size:10px;color:#ffffffc9}.z-status-product{position:absolute;z-index:4;bottom:55px;left:50%;transform:translateX(-50%);border:0;border-radius:999px;padding:11px 19px;background:#0b9668;color:#fff;font-weight:800;box-shadow:0 8px 22px #0006;white-space:nowrap}
    .z-status-progress span.done{background:#fff}
    .z-status-top{position:absolute;top:25px;left:14px;right:14px;z-index:3;display:flex;align-items:center;gap:9px;text-shadow:0 1px 5px #000}
    .z-status-top img{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#fff}
    .z-status-close{margin-left:auto;border:0;background:#0006;color:#fff;border-radius:50%;width:36px;height:36px;font-size:23px}
    .z-status-media{width:100%;height:100%;object-fit:contain;background:#080808}
    .z-status-caption{position:absolute;bottom:18px;left:18px;right:18px;z-index:3;text-align:center;text-shadow:0 2px 8px #000;font-size:14px}
    .z-status-nav{position:absolute;inset:70px 0 65px;display:flex;z-index:2}
    .z-status-nav button{width:50%;border:0;background:transparent}
    .z-status-empty-media{display:grid;place-items:center;flex:1;padding:30px;text-align:center;font-size:25px;font-weight:800;background:linear-gradient(145deg,#087a55,#10251c)}
    .z-status-caption{bottom:190px!important;padding:0 12px}
    .z-status-product{bottom:158px!important}
    .z-status-engagement{position:absolute;z-index:5;left:12px;right:12px;bottom:10px;padding:10px 11px;border:1px solid #ffffff35;border-radius:16px;background:rgba(8,18,14,.82);backdrop-filter:blur(14px);color:#fff;max-height:38%;display:flex;flex-direction:column;gap:8px}
    .z-status-actions{display:flex;align-items:center;gap:8px}
    .z-status-action{border:1px solid #ffffff35;border-radius:999px;padding:8px 12px;background:#ffffff16;color:#fff;font-size:12px;font-weight:800}
    .z-status-action.liked{background:#e83e68;border-color:#e83e68}
    .z-status-comments{overflow:auto;max-height:105px;font-size:11px;display:flex;flex-direction:column;gap:7px}
    .z-status-comment{line-height:1.35}.z-status-comment strong{color:#b9f3d9;margin-right:5px}
    .z-status-comment-form,.z-status-message-form{display:flex;gap:6px}
    .z-status-comment-form input,.z-status-message-form input{min-width:0;flex:1;border:1px solid #ffffff45;border-radius:999px;padding:9px 11px;background:#ffffff18;color:#fff;outline:none;font-size:12px}
    .z-status-comment-form button,.z-status-message-form button{border:0;border-radius:999px;padding:0 13px;background:#0b9668;color:#fff;font-weight:800}
    .z-status-message-form{display:none}.z-status-message-form.open{display:flex}
    .z-status-hint{font-size:10px;color:#ffffffb8}


    .z-featured-store-logo img{display:block;width:100%;height:100%;object-fit:contain;border-radius:50%}
    .z-featured-store strong{display:flex;align-items:center;justify-content:center;gap:4px;width:100%;font-size:11px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .z-featured-store small{display:block;max-width:100%;color:var(--text-muted);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .z-featured-store .store-verified{display:inline-grid;place-items:center;width:14px;height:14px;flex:0 0 14px;border-radius:50%;background:var(--verified-store,#2586ce);color:#fff;font-size:9px;font-weight:900}
    .z-featured-store:focus-visible{outline:2px solid var(--primary);outline-offset:3px;border-radius:12px}
    .z-sponsored-placeholder{display:none}
    .z-search-box input {
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text, #17231e);
      font-size: 14px;
    }

    .z-home-content {
      max-width: 1100px;
      margin: auto;
      padding: 19px 15px 25px;
    }


    .z-home-carousel{position:relative;overflow:hidden;min-height:250px;margin:0 0 25px;border:1px solid rgba(255,255,255,.45);border-radius:24px;isolation:isolate;background:#073d2b;color:#fff;touch-action:pan-y;transform:translateZ(0);box-shadow:0 16px 34px rgba(7,55,36,.22),0 5px 0 rgba(5,70,46,.12),inset 0 1px 0 rgba(255,255,255,.28)}
    .z-slide-image{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:center;transform:scale(1.035);filter:saturate(1.08) contrast(1.04);transition:transform 7s ease}
    .z-home-carousel:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(4,25,17,.88) 0%,rgba(4,25,17,.68) 48%,rgba(4,25,17,.12) 100%),linear-gradient(0deg,rgba(0,0,0,.28),transparent 45%);pointer-events:none}.z-home-carousel:hover .z-slide-image{transform:scale(1.09)}
    .z-slide-copy{position:relative;z-index:1;min-height:250px;max-width:560px;padding:29px 23px 54px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;transform:translateZ(24px);text-shadow:0 2px 12px rgba(0,0,0,.3)}
    .z-slide-kicker{display:inline-flex;align-items:center;min-height:25px;margin-bottom:11px;padding:5px 10px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);font-size:10px;font-weight:900;letter-spacing:1.4px;color:#fff;box-shadow:0 5px 14px rgba(0,0,0,.16)}
    .z-slide-copy h2{max-width:460px;margin:0 0 9px;font-size:clamp(22px,4vw,32px);line-height:1.12;font-weight:900;color:#fff}
    .z-slide-copy p{max-width:430px;margin:0 0 16px;font-size:13px;line-height:1.55;color:#fff}
    .z-slide-cta{min-height:43px;padding:0 19px;border:1px solid rgba(255,255,255,.75);border-radius:13px;background:linear-gradient(180deg,#fff 0%,#eaf5ef 100%);color:#07583d;font-size:12px;font-weight:950;cursor:pointer;box-shadow:0 6px 0 #b8d7c7,0 11px 22px rgba(0,0,0,.24);transform:translateY(-2px);transition:transform .18s ease,box-shadow .18s ease}.z-slide-cta:active{transform:translateY(3px);box-shadow:0 2px 0 #b8d7c7,0 5px 12px rgba(0,0,0,.2)}
    .z-slide-controls{position:absolute;z-index:2;left:18px;right:18px;bottom:12px;display:flex;align-items:center;justify-content:space-between}
    .z-slide-dots{display:flex;align-items:center;gap:5px;max-width:calc(100% - 82px);overflow-x:auto;padding:5px 2px;scrollbar-width:none}.z-slide-dots::-webkit-scrollbar{display:none}
    .z-slide-dot{flex:0 0 6px;width:6px;height:6px;padding:0;border:0;border-radius:20px;background:rgba(255,255,255,.58);cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.25)}
    .z-slide-dot.active{flex-basis:20px;width:20px;background:#fff}
    .z-slide-arrows{display:flex;gap:7px}
    .z-slide-arrow{width:29px;height:29px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(0,0,0,.18);color:#fff;font-size:17px;cursor:pointer}
    .z-category-heading-actions{display:flex;align-items:center;gap:8px}
    .z-all-categories{border:0;padding:7px 10px;border-radius:9px;background:var(--background);color:var(--primary);font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
    .z-category-directory{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0 0 17px}
    .z-category-directory .z-category{text-align:left;min-height:44px}

    .z-explore-intro{padding:8px 1px 18px}
    .z-explore-intro>span,.z-category-page-intro>span{display:block;color:var(--primary,#087a55);font-size:10px;font-weight:900;letter-spacing:1.5px;margin-bottom:6px}
    .z-explore-intro .z-page-title,.z-category-page-intro .z-page-title{margin:0;font-size:clamp(25px,5vw,32px);font-weight:900;letter-spacing:-.7px}
    .z-explore-intro p,.z-category-page-intro p{margin:6px 0 0;color:var(--text-muted,#748078);font-size:12px;line-height:1.5}
    .z-explore-section-heading{align-items:center;margin-bottom:12px}
    .z-explore-section-heading h2,.z-explore-products-heading h2{margin:0;font-size:16px;font-weight:850}
    .z-explore-see-all{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--primary,#087a55);font-size:11px;font-weight:850;padding:7px 0;cursor:pointer}
    .z-explore-category-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:22px}
    .z-explore-category-card{position:relative;isolation:isolate;overflow:hidden;aspect-ratio:1/1.08;min-width:0;padding:0;border:2px solid transparent;border-radius:15px;background:#dfe8e2;color:#fff;text-align:left;cursor:pointer;box-shadow:0 3px 12px rgba(15,45,31,.08)}
    .z-explore-category-card img,.z-category-image-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
    .z-explore-category-card:active img,.z-category-image-card:active img{transform:scale(1.04)}
    .z-explore-category-shade,.z-category-image-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02) 25%,rgba(0,0,0,.68) 100%);z-index:1}
    .z-explore-category-card strong{position:absolute;z-index:2;left:7px;right:5px;bottom:9px;color:#fff;font-size:clamp(9px,2.7vw,12px);font-weight:850;line-height:1.15;overflow-wrap:anywhere;text-shadow:0 1px 5px #000}
    .z-explore-category-card.active{border-color:var(--primary,#087a55);box-shadow:0 0 0 2px rgba(8,122,85,.2)}
    .z-explore-sponsored-section{margin-top:2px}
    .z-explore-products-heading{display:flex;align-items:center;justify-content:space-between;margin:18px 0 12px}
    .z-category-page-intro{padding:9px 0 18px}
    .z-category-search{margin-top:2px}
    .z-categories-image-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .z-category-image-card{position:relative;isolation:isolate;overflow:hidden;min-width:0;aspect-ratio:1.18/1;padding:0;border:0;border-radius:17px;background:#e2e9e4;color:#fff;text-align:left;cursor:pointer;box-shadow:0 4px 16px rgba(12,45,30,.08)}
    .z-category-image-card strong{position:absolute;z-index:2;left:12px;right:32px;bottom:12px;color:#fff;font-size:14px;font-weight:850;line-height:1.2;text-shadow:0 1px 6px #000}
    .z-category-image-arrow{position:absolute;z-index:2;right:10px;bottom:9px;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font-size:15px}
    .z-category-image-card[hidden]{display:none}
    @media(min-width:650px){.z-explore-category-grid{grid-template-columns:repeat(8,minmax(0,1fr));gap:12px}.z-categories-image-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.z-explore-category-card{aspect-ratio:1/1.15}}
    @media(max-width:360px){.z-explore-category-grid{gap:6px}.z-explore-category-card{border-radius:11px}.z-explore-category-card strong{font-size:9px;left:5px;bottom:7px}}
    @media(min-width:700px){.z-home-carousel,.z-slide-copy{min-height:285px}.z-slide-copy{padding:34px 34px 54px}.z-category-directory{grid-template-columns:repeat(4,minmax(0,1fr))}}

    .z-home-welcome {
      position: relative;
      overflow: hidden;
      background: var(--primary, #087a55);
      color: white;
      border-radius: 21px;
      padding: 23px 19px;
      margin-bottom: 26px;
    }

    .z-welcome-tag {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.1px;
      margin-bottom: 11px;
    }

    .z-home-welcome h2 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 800;
    }

    .z-home-welcome p {
      margin: 0;
      max-width: 290px;
      line-height: 1.55;
      font-size: 13px;
    }

    .z-section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 23px 0 13px;
    }

    .z-section-heading h2 {
      font-size: 16px;
      font-weight: 800;
      margin: 0;
    }

    .z-category-list {
      display: flex;
      overflow-x: auto;
      gap: 9px;
      padding: 3px 0 12px;
      scrollbar-width: none;
    }

    .z-category-list::-webkit-scrollbar {
      display: none;
    }

    .z-category {
      flex: 0 0 auto;
      padding: 10px 16px;
      border-radius: 13px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--surface, #ffffff);
      color: var(--text, #17231e);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .z-category.active {
      background: var(--primary, #087a55);
      color: white;
      border-color: var(--primary, #087a55);
    }

    .z-product-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: stretch;
    }

    .z-sponsored-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.z-sponsored-card{position:relative;min-width:0}.z-sponsored-label,.z-sponsored-note{display:inline-flex;align-items:center;background:#fff2df;color:#9a570c;border:1px solid #f2d4aa;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:800;margin-bottom:6px}.z-sponsored-card .z-product-card{height:100%}.z-sponsored-empty{grid-column:1/-1;color:var(--z-muted,#777);font-size:13px;padding:12px 0}.z-sponsored-stores{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.z-sponsored-store{border:1px solid var(--border,#e4ebe7);border-radius:14px;background:var(--surface,#fff);padding:12px;display:flex;flex-direction:column;gap:8px}.z-sponsored-store strong{font-size:14px}.z-sponsored-store button{align-self:flex-start;border:0;background:transparent;color:var(--primary,#087b5a);font-weight:700;padding:0}@media(min-width:700px){.z-sponsored-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
    .z-product-card {
      min-width: 0;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      position: relative;
      box-shadow: 0 5px 18px color-mix(in srgb, var(--text) 7%, transparent);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .z-product-card:active { transform: scale(.985); }
    .z-product-card:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
    @media (hover:hover) {
      .z-product-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px color-mix(in srgb, var(--text) 12%, transparent); }
    }

    .z-product-media {
      position: relative;
      overflow: hidden;
      aspect-ratio: 4 / 4.6;
      background: var(--background);
    }
    .z-product-gallery {
      position: absolute; inset: 0; display: flex; overflow-x: auto; overflow-y: hidden;
      scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain;
      background: var(--background);
    }
    .z-product-gallery::-webkit-scrollbar { display: none; }
    .z-product-gallery .z-product-image {
      flex: 0 0 100%; width: 100%; min-width: 100%; height: 100%;
      display: block; object-fit: cover; scroll-snap-align: start;
    }
    .z-product-image-count {
      position: absolute; right: 9px; bottom: 9px; z-index: 1; padding: 5px 8px;
      border: 1px solid rgb(255 255 255 / 25%); border-radius: 20px;
      background: rgb(0 0 0 / 58%); color: #fff; font-size: 9px; font-weight: 800;
      pointer-events: none;
    }
    .z-verified-account-mark {
      flex: 0 0 auto; width: 17px; height: 17px; display: inline-grid; place-items: center;
      vertical-align: middle;
    }
    .z-verified-account-mark svg { display: block; width: 100%; height: 100%; }
    .z-product-image,
    .z-product-placeholder {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background);
    }
    .z-product-placeholder { font-size: 40px; }
    .z-product-flags {
      position: absolute;
      top: 9px;
      left: 9px;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      max-width: calc(100% - 54px);
    }
    .z-product-flag {
      display: inline-flex;
      align-items: center;
      min-height: 23px;
      padding: 4px 7px;
      border-radius: 7px;
      background: var(--primary);
      color: #fff;
      font-size: 9px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: .2px;
      box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
    }
    .z-product-flag.discount { background: var(--danger); }
    .z-product-flag.new { background: var(--primary); }
    .z-product-flag.featured { background: var(--secondary); color: var(--text); }
    .z-save-product {
      position: absolute;
      z-index: 2;
      top: 9px;
      right: 9px;
      border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      color: var(--text);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgb(0 0 0 / 9%);
    }
    .z-save-product.is-saved { color: var(--danger); }
    .z-product-info {
      padding: 11px 11px 12px;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .z-product-name {
      font-size: 13px;
      font-weight: 750;
      line-height: 1.38;
      margin: 0 0 7px;
      min-height: 36px;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--text);
    }
    .z-product-price-line {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 5px 7px;
      margin-bottom: 6px;
    }
    .z-product-price {
      font-size: 14px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
      letter-spacing: -.2px;
    }
    .z-product-old-price {
      color: var(--text-muted);
      font-size: 10px;
      text-decoration: line-through;
    }
    .z-product-rating {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 16px;
      margin: 0 0 8px;
      color: var(--text-muted);
      font-size: 10px;
    }
    .z-product-rating-star { color: var(--secondary); font-size: 12px; }
    .z-product-store {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      color: var(--text);
      font-size: 10px;
      font-weight: 750;
    }
    .z-store-open { border:0; padding:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }\n    .z-store-open:hover,.z-store-open:focus-visible { color:var(--primary); text-decoration:underline; }\n    .z-product-store-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .z-verified-store-mark {
      flex: 0 0 auto;
      display: inline-grid;
      place-items: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--verified-store);
      color: #fff;
      font-size: 9px;
      font-weight: 900;
    }
    .z-product-location {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 5px;
      color: var(--text-muted);
      font-size: 9px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .z-product-stock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      font-size: 9px;
      font-weight: 750;
      color: var(--danger);
    }
    @media (min-width: 700px) {
      .z-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .z-product-info { padding: 13px; }
      .z-product-name { font-size: 14px; }
      .z-product-price { font-size: 16px; }
    }
    @media (min-width: 1050px) {
      .z-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
    }
    @media (min-width: 1380px) {
      .z-product-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    }

    .z-product-category {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0 0 10px;
    }

    .z-add-cart,
    .z-primary-button {
      width: 100%;
      min-height: 40px;
      border: none;
      border-radius: 10px;
      background: var(--primary, #087a55);
      color: white;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
    }

    .z-product-detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 14px;
      background: rgb(0 0 0 / 55%);
      backdrop-filter: blur(4px);
    }
.z-detail-variants{margin:12px 0}.z-variant-label{display:grid;gap:7px;font-size:13px;font-weight:700;color:var(--text)}.z-variant-label select{width:100%;min-height:46px;border:1px solid var(--border);border-radius:12px;padding:10px 12px;background:var(--surface);color:var(--text);font:inherit}.z-detail-add:disabled{opacity:.5;cursor:not-allowed}
    .z-product-detail-sheet {
      position: relative;
      width: min(100%, 620px);
      max-height: min(92vh, 900px);
      overflow: auto;
      border-radius: 22px 22px 16px 16px;
      background: var(--surface);
      color: var(--text);
      box-shadow: 0 20px 70px rgb(0 0 0 / 25%);
    }
    .z-detail-close {
      position: absolute;
      z-index: 3;
      top: 12px;
      right: 12px;
      width: 38px;
      height: 38px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: color-mix(in srgb, var(--surface) 90%, transparent);
      color: var(--text);
      font-size: 25px;
    }
    .z-detail-image-wrap { position: relative; aspect-ratio: 1 / .82; overflow: hidden; background: var(--background); }
    .z-detail-image-wrap .z-product-image { width: 100%; height: 100%; object-fit: contain; }
    .z-detail-content { padding: 18px; }
    .z-detail-content h2 { margin: 13px 0 8px; font-size: 20px; line-height: 1.3; }
    .z-detail-price { color: var(--primary); font-size: 21px; font-weight: 900; margin: 0 0 12px; }
    .z-detail-description { color: var(--text-muted); font-size: 13px; line-height: 1.65; white-space: pre-wrap; margin: 0 0 12px; }
    .z-detail-category,.z-detail-stock { color: var(--text-muted); font-size: 12px; margin: 0 0 9px; }
    .z-detail-add { margin-top: 14px; }
    @media (min-width: 700px) {
      .z-product-detail-overlay { align-items: center; }
      .z-product-detail-sheet { border-radius: 22px; }
    }

    .z-empty-state {
      padding: 35px 15px;
      text-align: center;
      color: var(--text-muted, #71817a);
      background: var(--surface, #ffffff);
      border: 1px dashed var(--border, #e4ebe7);
      border-radius: 16px;
      line-height: 1.6;
    }

    .z-empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      font-size: 38px;
    }

    .z-load-status {
      text-align: center;
      padding: 20px 10px;
      color: var(--text-muted, #71817a);
      font-size: 13px;
    }

    .z-bottom-nav {
      position: fixed;
      z-index: 30;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: 3px;
      background: var(--surface, #ffffff);
      border-top: 1px solid var(--border, #e4ebe7);
      padding: 9px 7px calc(9px + env(safe-area-inset-bottom));
      box-shadow: 0 -5px 20px rgb(0 0 0 / 4%);
    }

    .z-nav-item {
      position: relative;
      border: none;
      background: transparent;
      color: var(--text-muted, #71817a);
      min-width: 0;
      flex: 1;
      min-height: 57px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .z-nav-icon {
      position: relative;
      width: 42px;
      height: 34px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .z-nav-item.active {
      color: var(--primary, #087a55);
      font-weight: 800;
    }

    .z-nav-item.active .z-nav-icon {
      background: var(--primary, #087a55);
      color: white;
    }

    .z-cart-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 20px;
      background: #E87932;
      color: white;
      border: 2px solid var(--surface, #ffffff);
      font-size: 9px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .z-cart-badge[hidden] {
      display: none;
    }

    .z-page-title {
      font-size: 21px;
      font-weight: 800;
      margin: 4px 0 17px;
    }

    .z-account-card,
    .z-cart-summary {
      padding: 20px;
      border-radius: 18px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--surface, #ffffff);
    }

    .z-account-card {
      text-align: center;
    }

    .z-account-email {
      color: var(--text-muted, #71817a);
      overflow-wrap: anywhere;
    }

    .z-logout-button {
      width: 100%;
      padding: 14px;
      margin-top: 15px;
      border: none;
      border-radius: 12px;
      background: var(--primary, #087a55);
      color: white;
      font-weight: 800;
      cursor: pointer;
    }

    .z-account-page .z-home-content{max-width:820px;padding-top:18px;padding-bottom:30px}
    .z-account-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .z-account-heading .z-page-title{margin:3px 0 0}
    .z-account-heading-mark{color:var(--primary);font-size:13px;font-weight:900}
    .z-account-eyebrow{display:block;color:var(--text-muted);font-size:9px;font-weight:900;letter-spacing:1.2px;margin-bottom:6px}
    .z-account-hero{display:flex;align-items:center;gap:14px;padding:19px;border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:var(--shadow)}
    .z-account-avatar{width:68px;height:68px;flex:0 0 68px;display:grid;place-items:center;border-radius:50%;background:var(--primary);color:#fff;font-size:23px;font-weight:900;object-fit:cover}
    .z-account-identity{min-width:0;flex:1}.z-account-identity h2{margin:0 0 4px;font-size:clamp(16px,3vw,20px);overflow-wrap:anywhere}.z-account-identity p{margin:0;color:var(--text-muted);font-size:11px;overflow-wrap:anywhere}
    .z-account-role{display:inline-flex;padding:6px 10px;border-radius:30px;background:var(--background);color:var(--primary);font-size:9px;font-weight:900;white-space:nowrap}.z-account-role.vendor{background:var(--verified-store);color:#fff}
    .z-account-verified{display:inline-flex;align-items:center;gap:5px;margin-top:8px;color:var(--verified-account);font-size:10px;font-weight:850}.z-account-verified svg{width:18px;height:18px}
    .z-account-section{margin-top:17px;padding:17px;border:1px solid var(--border);border-radius:20px;background:var(--surface)}
    .z-account-section h2{margin:0 0 8px;font-size:16px}.z-account-section p{color:var(--text-muted);font-size:12px;line-height:1.55}
    .z-account-section-heading{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:13px}.z-account-section-heading h2{margin:0}
    .z-account-seller{border-color:color-mix(in srgb,var(--primary) 28%,var(--border))}
    .z-account-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .z-account-shortcut,.z-account-menu-row{width:100%;min-width:0;min-height:68px;display:flex;align-items:center;gap:11px;padding:11px;border:1px solid var(--border);border-radius:15px;background:var(--background);color:var(--text);text-align:left;cursor:pointer}
    .z-account-shortcut>span:nth-child(2),.z-account-menu-row>span:nth-child(2){min-width:0;flex:1}
    .z-account-shortcut strong,.z-account-shortcut small,.z-account-menu-row strong,.z-account-menu-row small{display:block}.z-account-shortcut strong,.z-account-menu-row strong{font-size:12px}.z-account-shortcut small,.z-account-menu-row small{margin-top:4px;color:var(--text-muted);font-size:10px;line-height:1.35}
    .z-account-shortcut>b,.z-account-menu-row>b{color:var(--text-muted);font-size:21px;font-weight:400}
    .shortcut-icon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:13px;background:var(--surface);color:var(--primary);font-size:19px;font-weight:800}.shortcut-icon.saved{color:#D94F83}
    .z-account-menu-row{margin-top:9px;min-height:58px;background:var(--surface)}
    .z-account-logout{width:100%;min-height:49px;margin-top:18px;border:1px solid color-mix(in srgb,var(--danger) 35%,var(--border));border-radius:14px;background:var(--surface);color:var(--danger);font-weight:850;cursor:pointer}
    .z-account-version{padding:17px 0 4px;color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:1.5px;text-align:center}
    .z-account-seller .z-seller-form{margin-top:15px}
    .z-seller-status.pending{border-left:3px solid #D99A28}.z-seller-status.approved{border-left:3px solid #159447}.z-seller-status.rejected{border-left:3px solid var(--danger)}.z-seller-status.review{border-left:3px solid #2586CE}
    @media(min-width:620px){.z-account-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:480px){.z-account-hero{gap:10px;padding:14px}.z-account-avatar{width:56px;height:56px;flex-basis:56px}.z-account-identity h2{font-size:14px}.z-account-role{font-size:8px}.z-account-section{padding:14px}.z-account-shortcuts{gap:8px}.z-account-shortcut{padding:9px;gap:8px}.shortcut-icon{width:35px;height:35px;flex-basis:35px}}
    @media(max-width:350px){.z-account-shortcuts{grid-template-columns:1fr}.z-account-role{display:none}}
    .z-seller-panel { margin-top:18px; padding:18px; border:1px solid var(--border,#e4ebe7); border-radius:17px; background:var(--surface,#fff); }
    .z-seller-panel h2 { margin:0 0 8px; font-size:17px; }
    .z-seller-panel p { color:var(--text-muted,#71817a); line-height:1.5; font-size:13px; }
    .z-seller-status { padding:12px; border-radius:11px; background:var(--background,#f5f7f6); margin:12px 0; }
    .z-seller-status strong { display:block; margin-bottom:5px; }
    .z-theme-panel { margin-top: 18px; }
    .z-theme-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:14px; }
    .z-theme-option { min-width:0; display:flex; align-items:center; gap:8px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surface); color:var(--text); text-align:left; font-size:12px; font-weight:700; cursor:pointer; }
    .z-theme-option.active { border:2px solid var(--primary); padding:9px; }
    .z-theme-swatch { width:23px; height:23px; flex:0 0 23px; border-radius:50%; background:var(--theme-swatch); box-shadow:inset 0 0 0 2px rgba(255,255,255,.45); }
    .z-theme-check { margin-left:auto; color:var(--primary); font-weight:900; }
    .z-seller-form { display:grid; gap:12px; margin-top:14px; }
    .z-seller-form label { display:grid; gap:6px; font-size:12px; font-weight:700; }
    .z-seller-form input,.z-seller-form textarea { width:100%; min-height:44px; box-sizing:border-box; padding:10px 12px; border:1px solid var(--border,#e4ebe7); border-radius:10px; background:var(--background,#f5f7f6); color:var(--text,#17231e); font:inherit; }
    .z-seller-form button:disabled { opacity:.6; cursor:wait; }
    .z-account-message { margin:10px 0; color:var(--text-muted,#71817a); font-size:13px; }
    .z-account-verification { border-color:color-mix(in srgb,var(--verified-account) 24%,var(--border)); }
    .z-account-verification .z-seller-status { margin:12px 0; }
    .z-account-verification .z-seller-form { margin-top:13px; }
    .z-account-verification .z-primary-button { min-height:44px; }

    @media (min-width: 700px) {
      .z-product-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .z-home-content {
        padding: 25px;
      }

      .z-bottom-nav {
        left: 50%;
        right: auto;
        width: min(600px, 96%);
        transform: translateX(-50%);
        bottom: 12px;
        border: 1px solid var(--border, #e4ebe7);
        border-radius: 19px;
        padding-bottom: 9px;
      }

      .z-home {
        padding-bottom: 115px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .z-marketplace *,
      .z-marketplace *::before,
      .z-marketplace *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
    }

    .zune-wave-transition{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;background:var(--background);color:var(--primary);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility .18s ease}
    .zune-wave-transition.active{opacity:1;visibility:visible;pointer-events:auto}
    .zune-wave-wordmark{display:flex;align-items:center;gap:5px;font-size:clamp(48px,14vw,76px);font-weight:950;letter-spacing:-3px;color:var(--primary)}
    .zune-wave-wordmark span{display:inline-block;animation:zuneLetterWave .62s cubic-bezier(.2,.75,.25,1) both;animation-delay:calc(var(--letter-index)*.09s)}
    .zune-wave-caption{font-size:10px;font-weight:900;letter-spacing:3px;color:var(--text-muted)}
    @keyframes zuneLetterWave{0%{transform:translateY(28px) rotate(8deg);opacity:0}45%{transform:translateY(-13px) rotate(-5deg);opacity:1}72%{transform:translateY(5px) rotate(2deg)}100%{transform:translateY(0) rotate(0);opacity:1}}
    .z-account-hero{cursor:pointer}
    .z-account-shortcut,.z-account-menu-row,.z-account-seller{transition:transform .18s ease,border-color .18s ease}
    .z-account-shortcut:active,.z-account-menu-row:active{transform:scale(.985)}
    @media(prefers-reduced-motion:reduce){.zune-wave-wordmark span{animation-duration:.01ms;animation-delay:0ms}}


    /* Animated Tanzania flag edge around every Marketplace product card */
    @property --zune-flag-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
    .z-marketplace .z-product-card{
      border:2px solid transparent!important;
      background:
        linear-gradient(var(--surface,#fff),var(--surface,#fff)) padding-box,
        conic-gradient(from var(--zune-flag-angle),#1eb53a 0deg 105deg,#fcd116 105deg 125deg,#111 125deg 145deg,#fcd116 145deg 165deg,#00a3dd 165deg 270deg,#1eb53a 270deg 360deg) border-box!important;
      animation:zuneProductFlagMotion 6s linear infinite;
    }
    @keyframes zuneProductFlagMotion{to{--zune-flag-angle:360deg}}
    @media(prefers-reduced-motion:reduce){.z-marketplace .z-product-card{animation:none!important}}

    /* ZUNE Cart — Premium Emerald refresh */
    .z-cart-page{background:var(--background,#f5f8f6)}
    .z-cart-content{max-width:1040px!important;padding-top:20px!important;padding-bottom:36px!important}
    .z-cart-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 20px;padding:18px 19px;border:1px solid var(--border,#e3ebe6);border-radius:22px;background:linear-gradient(135deg,var(--surface,#fff) 0%,color-mix(in srgb,var(--primary,#087a55) 7%,white) 100%);box-shadow:0 8px 24px rgba(20,55,37,.045)}
    .z-cart-heading .z-page-title{margin:2px 0 5px;font-size:clamp(23px,5vw,30px);letter-spacing:-.7px}
    .z-cart-heading p{margin:0;color:var(--text-muted,#71817a);font-size:12px}
    .z-cart-eyebrow{display:block;margin-bottom:6px;color:var(--primary,#087a55);font-size:9px;font-weight:950;letter-spacing:1.6px}
    .z-cart-heading-icon{display:grid;place-items:center;width:54px;height:54px;flex:0 0 54px;border-radius:18px;background:var(--primary,#087a55);color:white;font-size:25px;box-shadow:0 8px 18px color-mix(in srgb,var(--primary,#087a55) 22%,transparent)}
    .z-cart-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,330px);align-items:start;gap:17px}
    .z-cart-items{display:grid;gap:11px;min-width:0}
    .z-cart-item{display:grid;grid-template-columns:104px minmax(0,1fr) auto;align-items:center;gap:13px;min-width:0;padding:12px;border:1px solid var(--border,#e3ebe6);border-radius:19px;background:var(--surface,#fff);box-shadow:0 4px 16px rgba(20,55,37,.035)}
    .z-cart-product-image,.z-cart-item-placeholder{width:104px;height:104px;object-fit:cover;border-radius:13px;background:var(--background,#f2f5f3)}
    .z-cart-item-placeholder{display:grid;place-items:center;font-size:30px}
    .z-cart-item-info{min-width:0;align-self:stretch;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px}
    .z-cart-item-info h3{margin:0;color:var(--text,#17231e);font-size:14px;font-weight:850;line-height:1.35;overflow-wrap:anywhere}
    .z-cart-unit-price{color:var(--primary,#087a55);font-size:13px;font-weight:900}
    .z-quantity-controls{display:inline-flex;align-items:center;gap:0;padding:3px;border:1px solid var(--border,#e3ebe6);border-radius:11px;background:var(--background,#f7f9f8)}
    .z-quantity-controls button{display:grid;place-items:center;width:29px;height:27px;border:0;border-radius:8px;background:var(--surface,#fff);color:var(--primary,#087a55);font-size:17px;font-weight:850;cursor:pointer}
    .z-quantity-controls button:disabled{opacity:.35;cursor:not-allowed}
    .z-quantity-controls span{min-width:29px;text-align:center;color:var(--text,#17231e);font-size:12px;font-weight:850}
    .z-cart-item-end{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;align-self:stretch;gap:12px}
    .z-cart-line-total{color:var(--text,#17231e);font-size:13px;font-weight:900;white-space:nowrap}
    .z-cart-remove{border:0;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,#d94b4b 9%,white);color:#bd3737;font-size:10px;font-weight:850;cursor:pointer}
    .z-cart-summary{position:sticky;top:16px;padding:19px!important;border-radius:20px!important;box-shadow:0 8px 24px rgba(20,55,37,.05)}
    .z-cart-summary h2{margin:0 0 17px;font-size:16px;font-weight:900}
    .z-cart-summary-row,.z-cart-summary-total{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;color:var(--text-muted,#71817a);font-size:12px}
    .z-cart-summary-row strong,.z-cart-summary-total strong{color:var(--text,#17231e);font-size:13px;font-weight:900;text-align:right}
    .z-cart-summary-total{margin-top:5px;padding:15px 0;border-top:1px dashed var(--border,#e3ebe6);color:var(--text,#17231e);font-size:13px;font-weight:900}
    .z-cart-summary-total strong{color:var(--primary,#087a55);font-size:19px}
    .z-cart-checkout{width:100%;min-height:49px;margin-top:9px;border-radius:13px!important;font-size:13px;font-weight:900;box-shadow:0 7px 16px color-mix(in srgb,var(--primary,#087a55) 18%,transparent)}
    .z-cart-checkout-note{margin:10px 2px 12px;color:var(--text-muted,#71817a);font-size:10px;line-height:1.5}
    .z-continue-shopping{width:100%;padding:11px;border:1px solid var(--border,#e3ebe6);border-radius:12px;background:transparent;color:var(--primary,#087a55);font-size:11px;font-weight:850;cursor:pointer}
    .z-cart-empty{display:flex;flex-direction:column;align-items:center;max-width:480px;margin:26px auto;padding:34px 22px;border:1px solid var(--border,#e3ebe6);border-radius:24px;background:var(--surface,#fff);text-align:center;box-shadow:0 8px 26px rgba(20,55,37,.045)}
    .z-cart-empty-art{display:grid;place-items:center;width:112px;height:112px;margin-bottom:15px;border-radius:50%;background:color-mix(in srgb,var(--primary,#087a55) 9%,white);font-size:48px}
    .z-cart-empty h2{margin:0 0 8px;font-size:19px;font-weight:900}
    .z-cart-empty p{max-width:330px;margin:0 0 18px;color:var(--text-muted,#71817a);font-size:12px;line-height:1.65}
    .z-cart-empty .z-primary-button{min-width:190px;min-height:45px;border-radius:12px}
    .z-cart-status{padding:11px 13px;border-radius:11px;background:color-mix(in srgb,var(--primary,#087a55) 8%,white);color:var(--primary,#087a55);font-size:11px}
    .z-cart-status.error{background:#fff0ef;color:#b42318}
    @media(max-width:680px){
      .z-cart-content{padding:13px 12px 26px!important}
      .z-cart-heading{padding:15px;border-radius:18px;margin-bottom:14px}
      .z-cart-heading-icon{width:46px;height:46px;flex-basis:46px;border-radius:15px;font-size:21px}
      .z-cart-layout{grid-template-columns:minmax(0,1fr);gap:13px}
      .z-cart-items{gap:9px}
      .z-cart-item{grid-template-columns:84px minmax(0,1fr);gap:10px;padding:10px;border-radius:16px}
      .z-cart-product-image,.z-cart-item-placeholder{width:84px;height:92px;border-radius:11px}
      .z-cart-item-info{gap:6px}
      .z-cart-item-info h3{font-size:12px}
      .z-cart-unit-price{font-size:12px}
      .z-quantity-controls button{width:27px;height:25px}
      .z-cart-item-end{grid-column:2;flex-direction:row;align-items:center;justify-content:space-between;align-self:auto;margin-top:-2px}
      .z-cart-line-total{font-size:12px}
      .z-cart-remove{padding:6px 9px}
      .z-cart-summary{position:static;padding:16px!important;border-radius:18px!important}
      .z-cart-summary-total strong{font-size:18px}
      .z-cart-empty{margin:16px auto;padding:28px 18px}
    }
    @media(min-width:681px) and (max-width:900px){.z-cart-layout{grid-template-columns:minmax(0,1fr) 270px}.z-cart-item{grid-template-columns:84px minmax(0,1fr) auto}.z-cart-product-image,.z-cart-item-placeholder{width:84px;height:90px}}
    @media(prefers-reduced-motion:reduce){.z-cart-page *{scroll-behavior:auto!important;transition:none!important}}

    .z-driver-recruitment{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:16px;margin:20px 16px;padding:18px;border:1px solid rgba(16,130,91,.18);border-radius:22px;background:radial-gradient(circle at 8% 0%,rgba(91,234,179,.22),transparent 35%),linear-gradient(135deg,#062f26 0%,#087a55 58%,#10a878 100%);color:#fff;box-shadow:0 14px 28px rgba(4,73,50,.2),inset 0 1px 0 rgba(255,255,255,.22)}
    .z-driver-recruitment-mark{width:58px;height:58px;display:grid;place-items:center;position:relative;border-radius:18px;background:linear-gradient(145deg,#fff,#b9f5d9);color:#07583e;font-size:27px;font-weight:950;box-shadow:0 8px 16px #001d143d,inset 0 2px 3px #fff}
    .z-driver-recruitment-mark span{position:absolute;right:7px;top:4px;font-size:13px}
    .z-driver-recruitment-kicker{display:block;font-size:10px;font-weight:900;letter-spacing:1.7px;color:#a7f3d0;margin-bottom:5px}
    .z-driver-recruitment-copy h2{margin:0 0 5px;font-size:clamp(16px,3vw,21px);font-weight:900;color:#fff}
    .z-driver-recruitment-copy p{margin:0;max-width:560px;color:#e1fff1;font-size:12px;line-height:1.55}
    .z-driver-recruitment-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;padding:12px 15px;border-radius:13px;background:linear-gradient(145deg,#fff,#dcfce9);color:#07583e;text-decoration:none;font-size:12px;font-weight:900;box-shadow:0 6px 12px #001d143d,inset 0 1px 0 #fff}
    .z-driver-recruitment-cta:focus-visible{outline:3px solid #fef08a;outline-offset:3px}
    @media(max-width:620px){.z-driver-recruitment{grid-template-columns:auto minmax(0,1fr);gap:12px;margin:16px 12px;padding:15px}.z-driver-recruitment-mark{width:48px;height:48px;border-radius:15px}.z-driver-recruitment-cta{grid-column:1/-1;width:100%;min-height:44px}}

  `;

  document.head.appendChild(style);
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 1/4
// SEHEMU YA 2/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 2/4
// ============================================

// --------------------------------------------
// 7. LOAD CATEGORIES FROM SUPABASE
// --------------------------------------------

async function loadCategories() {
  try {
    // Marketplace displays the main categories; each product stores its
    // selected subcategory ID and the matching main category name.
    const { data, error } = await supabase
      .from("product_categories")
      .select("id,name,parent_id,sort_order")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    homeState.categories = data || [];

  } catch (error) {
    console.error("ZUNE categories error:", error);
    homeState.categories = [];
  }
}

// --------------------------------------------
// 8. LOAD PRODUCTS WITH PAGINATION
// --------------------------------------------

async function loadProducts(reset = false) {
  if (homeState.loading) return;

  if (!reset && !homeState.hasMore) return;

  if (reset) {
    homeState.requestId++;
    homeState.products = [];
    homeState.page = 0;
    homeState.hasMore = true;
    homeState.loadError = false;
  }

  const requestId = homeState.requestId;

  homeState.loading = true;
  updateLoadStatus();

  try {
    let query = supabase
      .from("products")
      .select("*")
      .order(homeState.searchFilters.sort==="price_low"?"price":homeState.searchFilters.sort==="price_high"?"price":"created_at", { ascending: homeState.searchFilters.sort==="price_low" })
      .range(
        homeState.page * PAGE_SIZE,
        (homeState.page + 1) * PAGE_SIZE - 1
      );

    if (homeState.selectedCategory) {
      query = query.eq("category", homeState.selectedCategory);
    }

    if (homeState.selectedVendor) query = query.eq("vendor_id", homeState.selectedVendor);
    if (homeState.searchFilters.minPrice && Number(homeState.searchFilters.minPrice)>0) query=query.gte("price",Number(homeState.searchFilters.minPrice));
    if (homeState.searchFilters.maxPrice && Number(homeState.searchFilters.maxPrice)>0) query=query.lte("price",Number(homeState.searchFilters.maxPrice));
    if (homeState.searchFilters.inStock) query=query.gt("stock_quantity",0);

    if (homeState.search.trim()) {
      const searchValue = homeState.search.trim()
        .replace(/[,%()]/g, " ");

      query = query.ilike(
        "title",
        `%${searchValue}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    if (requestId !== homeState.requestId) return;

    const products = data || [];

    // Attach public store details and account verification to product owners.
    const vendorIds = [...new Set(products.map(item => item.vendor_id).filter(Boolean))];
    if (vendorIds.length) {
      try {
        const { data: stores, error: storesError } = await supabase
          .from("stores")
          .select("owner_id,store_name,verification_status,logo_url,description,phone,email,website,region,district,address,storefront_template")
          .in("owner_id", vendorIds);
        if (storesError) throw storesError;
        const storeByOwner = new Map((stores || []).map(store => [String(store.owner_id), store]));
        products.forEach(item => { item.__zuneStore = storeByOwner.get(String(item.vendor_id)) || null; });
        const merged=new Map((homeState.featuredStores||[]).map(st=>[String(st.owner_id),st]));
        (stores||[]).forEach(st=>merged.set(String(st.owner_id),st));
        homeState.featuredStores=[...merged.values()].slice(0,20);
        const featuredHolder=document.getElementById("z-featured-stores");if(featuredHolder)featuredHolder.innerHTML=renderFeaturedStores();
      } catch (storeError) {
        console.warn("ZUNE store details unavailable for product cards:", storeError);
      }
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,is_verified,role")
          .in("id", vendorIds);
        if (profilesError) throw profilesError;
        const profileById = new Map((profiles || []).map(profile => [String(profile.id), profile]));
        products.forEach(item => { item.__zuneOwnerProfile = profileById.get(String(item.vendor_id)) || null; });
      } catch (profileError) {
        console.warn("ZUNE owner verification status unavailable for product cards:", profileError);
      }
    }

    const visibleProducts=homeState.searchFilters.verifiedOnly
      ? products.filter(item=>item.__zuneStore?.verification_status==="verified" || item.__zuneOwnerProfile?.is_verified===true)
      : products;
    if (reset) {
      homeState.products = visibleProducts;
    } else {
      const existingIds = new Set(
        homeState.products.map(product => String(product.id))
      );

      const newProducts = visibleProducts.filter(
        product => !existingIds.has(String(product.id))
      );

      homeState.products.push(...newProducts);
    }

    homeState.page++;
    homeState.hasMore = products.length === PAGE_SIZE;
    homeState.loadError = false;

  } catch (error) {
    if (requestId === homeState.requestId) {
      console.error("ZUNE products error:", error);
      homeState.loadError = true;
    }

  } finally {
    if (requestId === homeState.requestId) {
      homeState.loading = false;
      updateLoadStatus();
      updateProductArea();
      if (!homeState.sponsoredAdsLoaded) loadSponsoredCampaigns();
    }
  }
}

async function loadSponsoredCampaigns() {
  if (homeState.sponsoredAdsLoaded) return;
  homeState.sponsoredAdsLoaded = true;
  try {
    const {data:publicAdSettings}=await supabase.rpc("zune_ad_public_settings");
    homeState.maxSponsoredAdsPerPlacement=Math.max(1,Math.min(20,Number(publicAdSettings?.max_ads_per_placement)||3));
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("ad_campaigns")
      .select("id,store_id,seller_id,product_id,campaign_type,placement,title,starts_at,ends_at")
      .eq("status", "approved").order("created_at", { ascending: false }).limit(40);
    if (error) throw error;
    const liveCampaigns = (data || []).filter(c => (!c.starts_at || c.starts_at <= now) && (!c.ends_at || c.ends_at > now));
    const storeCampaigns = liveCampaigns.filter(c => c.campaign_type === "sponsored_store" && ["home","home_feed"].includes(String(c.placement||"").toLowerCase()) && c.store_id);
    const storeIds = [...new Set(storeCampaigns.map(c=>c.store_id))];
    let sponsoredStoreRows=[];
    if(storeIds.length){
      const {data:storeRows,error:storeError}=await supabase.from("stores").select("id,owner_id,store_name,logo_url,verification_status").in("id",storeIds);
      if(!storeError)sponsoredStoreRows=storeRows||[];
    }
    const sponsoredStoreMap=new Map(sponsoredStoreRows.map(x=>[String(x.id),x]));
    homeState.sponsoredStores=storeCampaigns.filter(c=>sponsoredStoreMap.has(String(c.store_id))).slice(0,homeState.maxSponsoredAdsPerPlacement).map(c=>({campaign:c,store:sponsoredStoreMap.get(String(c.store_id))}));
    const campaigns = liveCampaigns.filter(c =>
      ["sponsored_product", "combo"].includes(c.campaign_type) &&
      ["home", "home_feed", "trending", "recommendations", "category", "search"].includes(String(c.placement || "").toLowerCase()) && c.product_id
    );
    const productIds = [...new Set(campaigns.map(c => c.product_id))];
    if (!productIds.length) { homeState.sponsoredCampaigns=[];homeState.sponsoredProducts=[];renderSponsoredPlacementBlocks();updateProductArea();bindSponsoredAdEvents();return; }
    const { data: products, error: productError } = await supabase.from("products").select("*").in("id", productIds);
    if (productError) throw productError;
    const byId = new Map((products || []).map(p => [String(p.id), p]));
    const vendorIds = [...new Set((products || []).map(p => p.vendor_id).filter(Boolean))];
    let stores = [], profiles = [];
    if (vendorIds.length) {
      const [storeResult, profileResult] = await Promise.all([
        supabase.from("stores").select("owner_id,store_name,verification_status,logo_url,description,phone,email,website,region,district,address,storefront_template").in("owner_id", vendorIds),
        supabase.from("profiles").select("id,is_verified,role").in("id", vendorIds)
      ]);
      if (!storeResult.error) stores = storeResult.data || [];
      if (!profileResult.error) profiles = profileResult.data || [];
    }
    const storeMap = new Map(stores.map(x => [String(x.owner_id), x]));
    const profileMap = new Map(profiles.map(x => [String(x.id), x]));
    homeState.sponsoredCampaigns = campaigns.filter(c => byId.has(String(c.product_id)));
    homeState.sponsoredProducts = homeState.sponsoredCampaigns.map(c => {
      const p = byId.get(String(c.product_id));
      p.__zuneStore = storeMap.get(String(p.vendor_id)) || null;
      p.__zuneOwnerProfile = profileMap.get(String(p.vendor_id)) || null;
      return { campaign: c, product: p };
    });
    renderSponsoredPlacementBlocks();
    updateProductArea();
    bindSponsoredAdEvents();
  } catch (error) {
    homeState.sponsoredAdsLoaded = false;
    console.warn("ZUNE sponsored ads unavailable:", error);
  }
}


function renderSponsoredPlacementBlocks(){
  const homeHost=document.getElementById("z-sponsored-products");
  const exploreHost=document.getElementById("z-explore-sponsored-products");
  const storeHost=document.getElementById("z-sponsored-stores");
  const renderProduct=(item,placement)=>'<article class="z-sponsored-card" data-sponsored-campaign="'+safe(item.campaign.id)+'" data-sponsored-placement="'+safe(placement||item.campaign.placement||"home")+'"><span class="z-sponsored-label">Sponsored</span>'+productCard(item.product)+'</article>';
  const homeItems=homeState.sponsoredProducts.filter(x=>["home","home_feed","trending"].includes(String(x.campaign.placement||"").toLowerCase())).slice(0,homeState.maxSponsoredAdsPerPlacement);
  const explorePlacement=homeState.search?"search":(homeState.selectedCategory?"category":"recommendations");
  const exploreItems=homeState.sponsoredProducts.filter(x=>String(x.campaign.placement||"").toLowerCase()===explorePlacement).slice(0,homeState.maxSponsoredAdsPerPlacement);
  if(homeHost)homeHost.innerHTML=homeItems.map(x=>renderProduct(x,x.campaign.placement)).join("")||'<div class="z-sponsored-empty">No sponsored products right now.</div>';
  if(exploreHost)exploreHost.innerHTML=exploreItems.map(x=>renderProduct(x,explorePlacement)).join("");
  if(storeHost)storeHost.innerHTML=homeState.sponsoredStores.map(x=>'<article class="z-sponsored-store" data-sponsored-campaign="'+safe(x.campaign.id)+'" data-sponsored-event="store_visit"><span class="z-sponsored-label">Sponsored</span><strong>'+safe(x.store.store_name||"ZUNE Store")+'</strong><button type="button" data-sponsored-open="'+safe(x.store.owner_id)+'">Visit store</button></article>').join("");
}

async function loadStorefrontSponsoredAds(overlay, currentSellerId) {
  const host=overlay.querySelector("#z-store-sponsored-products");
  if(!host)return;
  const now=new Date().toISOString();
  const {data:campaigns,error}=await supabase.from("ad_campaigns")
    .select("id,product_id,seller_id,campaign_type,placement,starts_at,ends_at")
    .eq("status","approved").eq("placement","store_page").neq("seller_id",currentSellerId).limit(12);
  if(error)throw error;
  const live=(campaigns||[]).filter(c=>(!c.starts_at||c.starts_at<=now)&&(!c.ends_at||c.ends_at>now)&&c.product_id);
  const ids=[...new Set(live.map(c=>c.product_id))].slice(0,homeState.maxSponsoredAdsPerPlacement||3);
  if(!ids.length){host.closest(".z-storefront-sponsored")?.remove();return;}
  const {data:products,error:productError}=await supabase.from("products").select("*").in("id",ids).eq("moderation_status","approved");
  if(productError)throw productError;
  const byId=new Map((products||[]).map(p=>[String(p.id),p]));
  const cards=live.filter(c=>byId.has(String(c.product_id))).map(c=>`<div data-sponsored-campaign="${safe(c.id)}" data-sponsored-event="store_visit">${productCard(byId.get(String(c.product_id)))}</div>`);
  host.innerHTML=cards.join("");
  bindProductCards(host);
  bindSponsoredAdEvents();
  if(!cards.length)host.closest(".z-storefront-sponsored")?.remove();
}

function openSponsoredStore(sellerId){
  if(!sellerId)return;
  homeState.selectedVendor=String(sellerId);homeState.selectedCategory="";homeState.search="";
  renderMarketplacePage("explore");loadProducts(true);
}

function sponsoredVisitorKey() {
  try {
    let key = localStorage.getItem("zune_ads_visitor_key");
    if (!key) { key = crypto.randomUUID(); localStorage.setItem("zune_ads_visitor_key", key); }
    return key;
  } catch (_) { return crypto.randomUUID(); }
}

function recordSponsoredEvent(campaignId, eventType, placement = "home") {
  if (!campaignId) return;
  const payload = {
    campaign_id: campaignId,
    event_type: eventType,
    event_key: crypto.randomUUID(),
    visitor_key: sponsoredVisitorKey(),
    placement,
    metadata: { source: "marketplace" }
  };
  supabase.from("ad_events").insert(payload)
    .then(({ error }) => { if (error) console.warn("Ad event was not recorded:", error.message); });
}

function bindSponsoredAdEvents() {
  const hosts = [document.getElementById("z-sponsored-products"), document.getElementById("z-explore-sponsored-products"), document.getElementById("z-sponsored-stores"), document.getElementById("z-store-sponsored-products"), ...document.querySelectorAll("#z-product-sponsored-recommendations .z-sponsored-products")].filter(Boolean);
  if (!hosts.length) return;
  hosts.forEach(host => host.querySelectorAll("[data-sponsored-campaign]").forEach(card => {
    if (card.dataset.impressionBound) return;
    card.dataset.impressionBound = "1";
    const campaignId = card.dataset.sponsoredCampaign;
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { recordSponsoredEvent(campaignId, "impression", card.dataset.sponsoredPlacement || (host.id === "z-store-sponsored-products" ? "store_page" : "home")); observer.disconnect(); }
        });
      }, { threshold: 0.5 });
      observer.observe(card);
    }
    card.querySelector("[data-open-product]")?.addEventListener("click", () => recordSponsoredEvent(campaignId, "click", card.dataset.sponsoredPlacement || (host.id === "z-store-sponsored-products" ? "store_page" : "home")), { once: true });
    card.querySelector("[data-sponsored-open]")?.addEventListener("click", () => { recordSponsoredEvent(campaignId, card.dataset.sponsoredEvent || "store_visit", host.id === "z-sponsored-stores" ? "home" : "store_page"); openSponsoredStore(card.querySelector("[data-sponsored-open]").dataset.sponsoredOpen); }, { once: true });
    card.querySelector("[data-open-product]")?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") recordSponsoredEvent(campaignId, "click", card.dataset.sponsoredPlacement || (host.id === "z-store-sponsored-products" ? "store_page" : "home"));
    }, { once: true });
  }));
}

// --------------------------------------------
// 9. PRODUCT IMAGE
// --------------------------------------------

function productImage(product) {
  let images = Array.isArray(product.image_urls) ? product.image_urls : [];
  if (typeof product.image_urls === "string") {
    try {
      const parsed = JSON.parse(product.image_urls);
      if (Array.isArray(parsed)) images = parsed;
    } catch (_) {
      images = product.image_urls.trim() ? [product.image_urls.trim()] : [];
    }
  }
  images = images.map(item => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return item.url || item.publicUrl || item.public_url || item.src || "";
    return "";
  }).filter(Boolean);
  const primaryImage = product.image_url || "";
  if (primaryImage && !images.includes(primaryImage)) images.unshift(primaryImage);
  images = [...new Set(images)];
  if (!images.length) {
    return `<div class="z-product-placeholder"><span>📦</span></div>`;
  }
  return `
    <div class="z-product-gallery" aria-label="${safe(product.title || tx("emptyName"))} — ${images.length} ${language()==="sw"?"picha":"photos"}">
      ${images.map((image, index) => `
        <img class="z-product-image" src="${safe(image)}" alt="${safe(product.title || tx("emptyName"))} — ${index + 1}" loading="lazy" onerror="this.style.display='none'">
      `).join("")}
      ${images.length > 1 ? `<span class="z-product-image-count">${images.length} ${language()==="sw"?"picha":"photos"}</span>` : ""}
    </div>
  `;
}

// --------------------------------------------
// 10. PRODUCT CARD
// --------------------------------------------

function productCard(product) {
  const id = String(product.id);
  const isSaved = homeState.saved.map(String).includes(id);
  const store = product.__zuneStore || null;
  const ownerProfile = product.__zuneOwnerProfile || null;
  const accountVerified = ownerProfile?.is_verified === true;
  const basePrice = Number(product.price || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(product.discount_percent || 0)));
  const currentPrice = discountPercent > 0
    ? basePrice * (1 - discountPercent / 100)
    : basePrice;
  const oldPrice = discountPercent > 0
    ? basePrice
    : Number(product.compare_at_price || product.original_price || 0);
  const rating = Number(product.average_rating || product.rating_average || product.rating || 0);
  const reviews = Number(product.review_count || product.reviews_count || 0);
  const stock = product.stock_quantity == null ? null : Number(product.stock_quantity);
  const createdAt = product.created_at ? new Date(product.created_at).getTime() : 0;
  const isNew = createdAt > 0 && Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
  const discount = discountPercent > 0
    ? Math.round(discountPercent)
    : (oldPrice > currentPrice && currentPrice > 0
      ? Math.round((1 - currentPrice / oldPrice) * 100) : 0);
  const flags = [
    discount ? `<span class="z-product-flag discount">-${discount}%</span>` : "",
    product.is_featured || product.featured ? `<span class="z-product-flag featured">${language()==="sw"?"Featured":"Featured"}</span>` : "",
    !discount && !product.is_featured && !product.featured && isNew ? `<span class="z-product-flag new">${language()==="sw"?"Mpya":"New"}</span>` : ""
  ].filter(Boolean).join("");
  const storeName = store?.store_name || product.store_name || product.seller_name || (language()==="sw"?"Muuzaji wa ZUNE":"ZUNE Seller");
  const verified = store?.verification_status === "verified";
  const location = [store?.district || product.district, store?.region || product.region, store?.address || product.location]
    .filter(Boolean).slice(0,2).join(", ");
  const ratingMarkup = rating > 0
    ? `<div class="z-product-rating"><span class="z-product-rating-star">★</span><strong>${rating.toFixed(1)}</strong>${reviews > 0 ? `<span>(${reviews.toLocaleString()})</span>` : ""}</div>`
    : "";
  const stockMarkup = stock !== null && stock <= 0
    ? `<div class="z-product-stock">${language()==="sw"?"Imeisha":"Out of stock"}</div>` : "";

  return `
    <article class="z-product-card" data-open-product="${safe(id)}" tabindex="0" role="button" aria-label="${safe(product.title || tx("emptyName"))}">
      <div class="z-product-media">
        ${productImage(product)}
        <div class="z-product-flags">${flags}</div>
        <button type="button" class="z-save-product ${isSaved ? "is-saved" : ""}" data-save-product="${safe(id)}" aria-label="${isSaved ? "Remove saved product" : "Save product"}" aria-pressed="${isSaved}">
          ${isSaved ? "♥" : "♡"}
        </button>
      </div>
      <div class="z-product-info">
        <h3 class="z-product-name">${safe(product.title || tx("emptyName"))}</h3>
        <div class="z-product-price-line">
          <p class="z-product-price">${money(currentPrice)}</p>
          ${oldPrice > currentPrice ? `<span class="z-product-old-price">${money(oldPrice)}</span>` : ""}
        </div>
        ${ratingMarkup}
        <div class="z-product-store">
          <button type="button" class="z-product-store-name z-store-open" data-open-store="${safe(product.vendor_id||"")}">${safe(storeName)}</button>
          ${accountVerified ? '<span class="z-verified-account-mark" title="Verified Account" aria-label="Verified Account"><svg viewBox="-30 -30 60 60" role="img"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ""}
        </div>
        ${location ? `<div class="z-product-location">⌖ ${safe(location)}</div>` : ""}
        ${stockMarkup}
      </div>
    </article>
  `;
}

// --------------------------------------------
// 11. PRODUCT DETAILS QUICK VIEW
// --------------------------------------------

async function openStoreDetails(ownerId, product = null) {
  if (!ownerId) return;
  // Open the complete customer-facing Storefront 2.0 page when an active store record exists.
  try {
    const { data: storefrontRecord, error: storefrontLookupError } = await supabase
      .from("stores").select("id").eq("owner_id", ownerId).eq("is_active", true).maybeSingle();
    if (!storefrontLookupError && storefrontRecord?.id) {
      const storefrontUrl = new URL("/zuneacts/storefront.html", location.origin);
      storefrontUrl.searchParams.set("store", storefrontRecord.id);
      location.assign(storefrontUrl.toString());
      return;
    }
  } catch (storefrontNavigationError) {
    console.warn("ZUNE Storefront 2.0 navigation unavailable; using in-page store preview.", storefrontNavigationError);
  }
  document.getElementById("z-store-detail-overlay")?.remove();
  const cachedStore = product?.__zuneStore || null;
  const cachedProfile = product?.__zuneOwnerProfile || null;
  const fallback = cachedStore?.store_name || product?.store_name || product?.seller_name || (language()==="sw"?"Duka la ZUNE":"ZUNE Store");
  const overlay = document.createElement("div");
  overlay.id = "z-store-detail-overlay";
  overlay.className = "z-product-detail-overlay";
  overlay.innerHTML = `<section class="z-product-detail-sheet z-storefront-sheet" role="dialog" aria-modal="true" aria-label="${safe(fallback)}">
    <button type="button" class="z-detail-close" aria-label="Close">×</button>
    <div class="z-storefront-banner"><span class="z-storefront-brand">ⓏⓊⓃⒺ MARKETPLACE</span><div class="z-storefront-logo" id="z-store-detail-logo" aria-label="Store logo"></div><div class="z-storefront-heading"><h2 id="z-store-detail-name">${safe(fallback)}</h2><div id="z-store-detail-status" class="z-product-store"></div><p id="z-store-detail-location" class="z-product-location"></p></div></div>
    <div class="z-storefront-content"><div class="z-storefront-section-head"><div><span class="z-account-eyebrow">${language()==="sw"?"DUKA LA SELLER":"SELLER STOREFRONT"}</span><h3>${language()==="sw"?"Bidhaa za duka":"Store products"}</h3></div><span id="z-storefront-count" class="z-storefront-count"></span></div>
    <p id="z-store-detail-message" class="z-account-message">${language()==="sw"?"Inapakia taarifa na bidhaa za duka...":"Loading store information and products..."}</p>
    <div id="z-storefront-products" class="z-storefront-product-grid"></div>
    <section class="z-storefront-sponsored"><div class="z-storefront-section-head"><div><span class="z-account-eyebrow">SPONSORED</span><h3>${language()==="sw"?"Bidhaa zilizodhaminiwa":"Sponsored products"}</h3></div></div><div id="z-store-sponsored-products" class="z-storefront-product-grid"></div></section></div>
  </section>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  overlay.querySelector(".z-detail-close")?.addEventListener("click",close);

  const badgeMarkup=(store,profile)=>{
    const verifiedStore=String(store?.verification_status||"").toLowerCase()==="verified";
    const verifiedAccount=profile?.is_verified===true;
    return (verifiedStore?'<span class="z-verified-store-mark" title="Verified Store">✓</span><strong>Verified Store</strong>':(language()==="sw"?"Duka halijathibitishwa":"Store not verified"))+
      (verifiedAccount?'<span class="z-verified-account-mark" title="Verified Account"><svg viewBox="-30 -30 60 60"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><strong>Verified Account</strong>':"");
  };

  if(!document.getElementById("zuneStorefrontTemplateStyles")){
    const style=document.createElement("style");
    style.id="zuneStorefrontTemplateStyles";
    style.textContent=`
      .z-storefront-sheet{width:min(760px,100%);max-height:92vh;overflow:auto;padding:0!important;background:var(--surface,#fff)}
      .z-storefront-logo{width:76px;height:76px;display:grid;place-items:center;overflow:hidden;border:3px solid rgba(255,255,255,.9);border-radius:22px;background:#e8f5ed;color:#087a50;font-size:23px;font-weight:900;box-shadow:0 8px 24px rgba(0,0,0,.12)}.z-storefront-logo img{width:100%;height:100%;object-fit:cover}.z-storefront-banner{padding:24px 22px 20px;background:linear-gradient(135deg,#087a55,#064d39);color:#fff}
      .z-storefront-brand{font-size:10px;font-weight:800;letter-spacing:2px;opacity:.8}
      .z-storefront-heading h2{margin:12px 0 8px;color:inherit;font-size:25px}
      .z-storefront-heading .z-product-store{color:inherit;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .z-storefront-heading .z-product-location{color:rgba(255,255,255,.8);margin:8px 0 0}
      .z-storefront-content{padding:20px}
      .z-storefront-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}
      .z-storefront-section-head h3{margin:5px 0 0;font-size:18px}
      .z-storefront-count{font-size:12px;color:var(--text-muted)}
      .z-storefront-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .z-storefront-product-grid .z-product-card{min-width:0}
      .z-storefront-sponsored{margin-top:22px;padding-top:16px;border-top:1px solid var(--border,#e4ebe7)}
      .z-storefront-sheet[data-zune-store-template="editorial"] .z-storefront-banner{background:#29251f}
      .z-storefront-sheet[data-zune-store-template="hero"] .z-storefront-banner{background:linear-gradient(135deg,#101d35,#314b73);padding:42px 24px}
      .z-storefront-sheet[data-zune-store-template="compact"] .z-storefront-content{padding:12px}
      .z-storefront-sheet[data-zune-store-template="compact"] .z-storefront-product-grid{gap:7px}
      .z-storefront-sheet[data-zune-store-template="boutique"] .z-storefront-banner{background:#34251f}
      .z-storefront-sheet[data-zune-store-template="catalog"] .z-storefront-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .z-storefront-sheet[data-zune-store-template="stories"] .z-storefront-banner{background:linear-gradient(135deg,#58366b,#a66eae)}
      .z-storefront-sheet[data-zune-store-template="minimal"] .z-storefront-banner{background:#f4f4f1;color:#242424}
      .z-storefront-sheet[data-zune-store-template="minimal"] .z-storefront-product-grid .z-product-card{box-shadow:none;border-radius:0}
      .z-storefront-sheet[data-zune-store-template="deals"] .z-storefront-banner{background:linear-gradient(135deg,#a94c12,#e58b2a)}
      .z-storefront-sheet[data-zune-store-template="showcase"] .z-storefront-banner{background:linear-gradient(135deg,#111820,#354b5d)}
      @media(max-width:520px){.z-storefront-product-grid,.z-storefront-sheet[data-zune-store-template="catalog"] .z-storefront-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.z-storefront-content{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  Promise.all([
    supabase.from("stores").select("owner_id,store_name,verification_status,logo_url,description,phone,email,website,region,district,address,storefront_template").eq("owner_id",ownerId).maybeSingle(),
    supabase.from("profiles").select("id,is_verified").eq("id",ownerId).maybeSingle(),
    supabase.from("products").select("*").eq("vendor_id",ownerId).order("created_at",{ascending:false}).limit(24)
  ]).then(([storeResult,profileResult,productsResult])=>{
    if(!overlay.isConnected)return;
    if(storeResult.error)throw storeResult.error;
    // Public storefronts must remain viewable even when authenticated profile RLS
    // hides another seller's private profile row. Verification is optional metadata.
    if(profileResult.error)console.warn("ZUNE storefront profile verification unavailable:",profileResult.error.message);
    if(productsResult.error)console.warn("ZUNE storefront products query failed:",productsResult.error.message);
    const store=storeResult.data||cachedStore;
    const profile=profileResult.data||cachedProfile||null;
    const products=productsResult.error?[]:(productsResult.data||[]);
    const templateKey="zune_template_store:"+ownerId;
    let selectedTemplate="classic";
    try{selectedTemplate=store?.storefront_template||localStorage.getItem(templateKey)||"classic";}catch(_){}
    const allowed=["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"];
    const template=allowed.includes(selectedTemplate)?selectedTemplate:"classic";
    const sheet=overlay.querySelector(".z-storefront-sheet");
    sheet.setAttribute("data-zune-store-template",template);
    overlay.querySelector("#z-store-detail-name").textContent=store?.store_name||fallback;
    const logoHolder=overlay.querySelector("#z-store-detail-logo");
    if(logoHolder){const logo=store?.logo_url||store?.store_logo_url||store?.logo||"";const initials=String(store?.store_name||fallback).trim().split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"Z";logoHolder.innerHTML=logo?`<img src="${safe(logo)}" alt="${safe(store?.store_name||fallback)} logo">`:safe(initials);}
    overlay.querySelector("#z-store-detail-location").textContent=[store?.district,store?.region,store?.address].filter(Boolean).join(", ");
    overlay.querySelector("#z-store-detail-status").innerHTML=badgeMarkup(store,profile);
    overlay.querySelector("#z-storefront-count").textContent=products.length+" "+(language()==="sw"?"bidhaa":"products");
    products.forEach(item=>{item.__zuneStore=store;item.__zuneOwnerProfile=profile;});
    overlay.querySelector("#z-storefront-products").innerHTML=products.length?products.map(productCard).join(""):"";
    loadStorefrontSponsoredAds(overlay,ownerId).catch(error=>console.warn("Store page sponsored ads unavailable:",error));
    const message=overlay.querySelector("#z-store-detail-message");
    if(productsResult.error)message.textContent=language()==="sw"?"Taarifa za duka zimepatikana, lakini bidhaa hazikuweza kupakiwa.":"Store details loaded, but products could not be loaded.";
    else if(!products.length)message.textContent=language()==="sw"?"Duka hili bado halijaweka bidhaa.":"This store has not listed any products yet.";
    else message.remove();
    overlay.querySelectorAll("[data-open-store]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openStoreDetails(button.dataset.openStore);}));
    overlay.querySelectorAll("[data-save-product]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();toggleSaved(button.dataset.saveProduct);button.classList.toggle("is-saved");button.textContent=button.classList.contains("is-saved")?"♥":"♡";}));
    overlay.querySelectorAll("[data-open-product]").forEach(card=>card.addEventListener("click",event=>{if(event.target.closest("[data-save-product]"))return;const item=products.find(p=>String(p.id)===card.dataset.openProduct);if(item)openProductDetails(item);}));
  }).catch(error=>{
    console.warn("ZUNE storefront:",error);
    const message=overlay.querySelector("#z-store-detail-message");
    if(message)message.textContent=language()==="sw"?"Imeshindikana kupakia taarifa za duka. Tafadhali jaribu tena.":"Unable to load this storefront. Please try again.";
  });
}

function openProductDetails(product) {
  document.getElementById("z-product-detail-overlay")?.remove();
  const store = product.__zuneStore || null;
  const ownerProfile = product.__zuneOwnerProfile || null;
  const accountVerified = ownerProfile?.is_verified === true;
  const verified = store?.verification_status === "verified";
  const storeName = store?.store_name || product.store_name || product.seller_name || (language()==="sw"?"Muuzaji wa ZUNE":"ZUNE Seller");
  const location = [store?.district || product.district, store?.region || product.region, store?.address || product.location].filter(Boolean).slice(0,2).join(", ");
  const stock = product.stock_quantity == null ? null : Number(product.stock_quantity);
  const overlay = document.createElement("div");
  overlay.id = "z-product-detail-overlay";
  overlay.className = "z-product-detail-overlay";
  overlay.innerHTML = `
    <section class="z-product-detail-sheet" role="dialog" aria-modal="true" aria-label="${safe(product.title)}">
      <button type="button" class="z-detail-close" aria-label="Close">×</button>
      <div class="z-detail-image-wrap">${productImage(product)}</div>
      <div class="z-detail-content">
        <div class="z-product-store"><button type="button" class="z-product-store-name z-store-open" data-open-store="${safe(product.vendor_id||"")}">${safe(storeName)}</button>${accountVerified ? '<span class="z-verified-account-mark" title="Verified Account" aria-label="Verified Account"><svg viewBox="-30 -30 60 60" role="img"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ""}${verified ? '<span class="z-verified-store-mark" aria-label="Verified Store">✓</span>' : ""}</div>
        ${location ? `<div class="z-product-location">⌖ ${safe(location)}</div>` : ""}
        <h2>${safe(product.title || tx("emptyName"))}</h2>
        <p class="z-detail-price" id="z-detail-price">${money(product.price)}</p>
        <div id="z-detail-variants" class="z-detail-variants" aria-live="polite"></div>
        <div class="z-detail-rating" id="z-detail-rating" aria-live="polite">${Number(product.average_rating||product.rating_average||product.rating||0)>0 ? "★ "+Number(product.average_rating||product.rating_average||product.rating).toFixed(1)+" · "+Number(product.review_count||product.reviews_count||0)+" "+(language()==="sw"?"tathmini":"reviews") : (language()==="sw"?"Bado hakuna tathmini":"No ratings yet")}</div>
        ${product.description ? `<p class="z-detail-description">${safe(product.description)}</p>` : ""}
        ${product.category ? `<p class="z-detail-category">${safe(product.category)}</p>` : ""}
        ${stock !== null ? `<p class="z-detail-stock" id="z-detail-stock">${stock > 0 ? (language()==="sw" ? "Stock iliyopo: " : "Available stock: ") + stock : (language()==="sw" ? "Bidhaa imeisha stock" : "Out of stock")}</p>` : `<p class="z-detail-stock" id="z-detail-stock"></p>`}
        <div class="z-detail-actions">
          <button type="button" class="z-primary-button z-detail-add" ${stock !== null && stock <= 0 ? "disabled" : ""}>${tx("addCart")}</button>
          <button type="button" class="z-detail-compare" data-detail-compare>${language()==="sw"?"⇄ Linganisha":"⇄ Compare"}</button>
        </div>
        <section class="z-detail-reviews" aria-labelledby="z-detail-reviews-title">
          <div class="z-detail-reviews-heading"><h3 id="z-detail-reviews-title">${language()==="sw"?"Tathmini za wanunuzi":"Buyer reviews"}</h3><button type="button" data-detail-all-reviews>${language()==="sw"?"Zote":"See all"}</button></div>
          <div id="z-detail-reviews-list"><p class="z-detail-reviews-empty">${language()==="sw"?"Inapakia tathmini...":"Loading reviews..."}</p></div>
        </section>
        ${product.vendor_id && String(product.vendor_id)!==String(homeState.user?.id) ? `<button type="button" class="z-primary-button z-detail-message" style="margin-top:9px;background:transparent;color:var(--primary);border:1px solid var(--border)">${language()==="sw"?"Wasiliana na Seller":"Message Seller"}</button>` : ""}
      </div>
      <div class="z-detail-content z-product-recommendations" id="z-product-sponsored-recommendations">
        <div class="z-section-heading"><h2>Sponsored recommendations</h2><span class="z-sponsored-note">Sponsored</span></div>
        <div class="z-sponsored-products"><p class="z-sponsored-empty">Loading recommendations…</p></div>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  loadProductSponsoredRecommendations(overlay,product).catch(error=>{console.warn("Product sponsored recommendations:",error);overlay.querySelector("#z-product-sponsored-recommendations")?.remove();});
  const close = () => overlay.remove();
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.querySelector(".z-detail-close")?.addEventListener("click", close);
  overlay.querySelector("[data-open-store]")?.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openStoreDetails(event.currentTarget.dataset.openStore,product);});
  let availableVariants=[];
  let selectedVariant=null;
  const addButton=overlay.querySelector(".z-detail-add");
  if(addButton)addButton.disabled=true;
  supabase.from("product_variants").select("id,label,sku,attributes,price,stock_quantity").eq("product_id",product.id).eq("is_active",true).order("sort_order",{ascending:true}).then(({data,error})=>{
    if(error){console.warn("ZUNE product variants:",error);if(addButton)addButton.disabled=Number(product.stock_quantity||0)<=0;return;}
    availableVariants=data||[];
    product.__zuneHasVariants=availableVariants.length>0;
    const host=overlay.querySelector("#z-detail-variants");
    if(availableVariants.length){
      host.innerHTML='<label class="z-variant-label">'+(language()==="sw"?"Chagua aina / ukubwa / rangi":"Choose option / size / color")+'<select id="z-detail-variant-select"><option value="">'+(language()==="sw"?"Chagua chaguo":"Select an option")+'</option>'+availableVariants.map(v=>'<option value="'+safe(v.id)+'" '+(Number(v.stock_quantity)<=0?'disabled':'')+'>'+safe(v.label)+' · '+money(v.price)+(v.stock_quantity<=0?(language()==="sw"?" (Imeisha)":" (Out of stock)"):"")+'</option>').join("")+'</select></label>';
      const select=host.querySelector("select");
      select.addEventListener("change",()=>{
        selectedVariant=availableVariants.find(v=>String(v.id)===select.value)||null;
        const price=overlay.querySelector("#z-detail-price"),stockNode=overlay.querySelector("#z-detail-stock");
        if(price)price.textContent=money(selectedVariant?selectedVariant.price:product.price);
        if(stockNode)stockNode.textContent=selectedVariant?(language()==="sw"?"Stock iliyopo: ":"Available stock: ")+selectedVariant.stock_quantity:"";
        if(addButton)addButton.disabled=!selectedVariant||Number(selectedVariant.stock_quantity)<=0;
      });
      if(addButton)addButton.disabled=true;
    }else if(addButton)addButton.disabled=Number(product.stock_quantity||0)<=0;
  });
  addButton?.addEventListener("click",()=>{
    if(product.__zuneHasVariants&&!selectedVariant){alert(language()==="sw"?"Chagua aina ya bidhaa kwanza.":"Please select a product option first.");return;}
    addToCart(String(product.id),product,selectedVariant);
    close();
  });
  overlay.querySelector("[data-detail-compare]")?.addEventListener("click", async event => {
    const button=event.currentTarget;
    if(!homeState.user?.id){alert(language()==="sw"?"Ingia kwanza ili kulinganisha bidhaa.":"Please sign in to compare products.");return;}
    button.disabled=true;
    try{
      const {error}=await supabase.from("zune_comparison_items").insert({user_id:homeState.user.id,product_id:product.id});
      if(error && error.code!=="23505") throw error;
      close();
      await renderMarketplacePage("features");
      requestAnimationFrame(()=>document.getElementById("z-feature-compare")?.scrollIntoView({behavior:"smooth",block:"start"}));
    }catch(error){
      console.warn("ZUNE compare product:",error);
      button.disabled=false;
      alert(language()==="sw"?"Imeshindikana kuongeza bidhaa kwenye ulinganisho. Jaribu tena.":"Could not add this product to comparison. Please try again.");
    }
  });
  overlay.querySelector("[data-detail-all-reviews]")?.addEventListener("click",async()=>{
    close();
    await renderMarketplacePage("features");
    requestAnimationFrame(()=>document.getElementById("z-feature-reviews")?.scrollIntoView({behavior:"smooth",block:"start"}));
  });
  loadProductReviewPreview(overlay,product).catch(error=>console.warn("ZUNE product reviews:",error));
  overlay.querySelector(".z-detail-message")?.addEventListener("click",()=>openBuyerSellerChat(product));
  const onKey = event => { if (event.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
}

async function loadProductReviewPreview(overlay,product){
 const host=overlay.querySelector("#z-detail-reviews-list");if(!host)return;
 const {data,error}=await supabase.from("product_reviews")
  .select("id,rating,review_text,created_at")
  .eq("product_id",product.id).eq("moderation_status","approved").eq("is_visible",true)
  .order("created_at",{ascending:false}).limit(3);
 if(error)throw error;
 if(!data?.length){host.innerHTML='<p class="z-detail-reviews-empty">'+(language()==="sw"?"Bado hakuna tathmini zilizoidhinishwa kwa bidhaa hii.":"No approved reviews for this product yet.")+'</p>';return;}
 host.innerHTML=data.map(review=>'<article class="z-detail-review"><div class="z-detail-review-stars" aria-label="'+Number(review.rating)+' out of 5 stars">'+"★".repeat(Math.max(0,Math.min(5,Number(review.rating)||0)))+'</div><p>'+safe(review.review_text||"")+'</p><small>'+safe(review.created_at?new Intl.DateTimeFormat(language()==="sw"?"sw-TZ":"en-TZ",{dateStyle:"medium"}).format(new Date(review.created_at)):"")+'</small></article>').join("");
}

async function loadProductSponsoredRecommendations(overlay,currentProduct){
 const section=overlay.querySelector("#z-product-sponsored-recommendations"),host=section&&section.querySelector(".z-sponsored-products");
 if(!host)return;
 const now=new Date().toISOString();
 const result=await supabase.from("ad_campaigns").select("id,product_id,seller_id,placement,starts_at,ends_at").eq("status","approved").eq("placement","recommendations").neq("seller_id",currentProduct.vendor_id||"").limit(30);
 if(result.error)throw result.error;
 const live=(result.data||[]).filter(c=>String(c.product_id)!==String(currentProduct.id)&&(!c.starts_at||c.starts_at<=now)&&(!c.ends_at||c.ends_at>now));
 const ids=[...new Set(live.map(c=>c.product_id).filter(Boolean))].slice(0,homeState.maxSponsoredAdsPerPlacement||3);
 if(!ids.length){section.remove();return;}
 const productsResult=await supabase.from("products").select("*").in("id",ids).eq("moderation_status","approved").is("removed_at",null).is("seller_archived_at",null);
 if(productsResult.error)throw productsResult.error;
 const byId=new Map((productsResult.data||[]).map(p=>[String(p.id),p]));
 const rows=live.filter(c=>byId.has(String(c.product_id))).slice(0,homeState.maxSponsoredAdsPerPlacement||3);
 const vendorIds=[...new Set(rows.map(c=>byId.get(String(c.product_id)).vendor_id).filter(Boolean))];
 if(vendorIds.length){
  const results=await Promise.all([
   supabase.from("stores").select("owner_id,store_name,verification_status,logo_url").in("owner_id",vendorIds),
   supabase.from("profiles").select("id,is_verified").in("id",vendorIds)
  ]);
  const stores=new Map((results[0].data||[]).map(x=>[String(x.owner_id),x]));
  const profiles=new Map((results[1].data||[]).map(x=>[String(x.id),x]));
  rows.forEach(c=>{const p=byId.get(String(c.product_id));p.__zuneStore=stores.get(String(p.vendor_id))||null;p.__zuneOwnerProfile=profiles.get(String(p.vendor_id))||null;});
 }
 host.innerHTML=rows.map(c=>'<article class="z-sponsored-card" data-sponsored-campaign="'+safe(c.id)+'" data-sponsored-placement="recommendations"><span class="z-sponsored-label">Sponsored</span>'+productCard(byId.get(String(c.product_id)))+'</article>').join("");
 if(!rows.length){section.remove();return;}
 bindProductCards(host);bindSponsoredAdEvents();
}

async function openBuyerSellerChat(product){
 const user=homeState.user, sellerId=product?.vendor_id;
 if(!user?.id||!sellerId)return;
 if(String(user.id)===String(sellerId))return;
 document.getElementById("z-buyer-chat-overlay")?.remove();
 const overlay=document.createElement("div");overlay.id="z-buyer-chat-overlay";overlay.className="z-product-detail-overlay";
 overlay.innerHTML=`<section class="z-product-detail-sheet z-buyer-chat-sheet" role="dialog" aria-modal="true" aria-label="Seller messages"><button type="button" class="z-detail-close" aria-label="Close">×</button><div class="z-detail-content"><span class="z-account-eyebrow">${language()==="sw"?"MAZUNGUMZO YA BIDHAA":"PRODUCT CONVERSATION"}</span><h2>${safe(product.title||tx("emptyName"))}</h2><p class="z-product-location">${language()==="sw"?"Unazungumza na":"Chatting with"} ${safe(product.__zuneStore?.store_name||product.store_name||"ZUNE Seller")}</p><div id="z-buyer-chat-history" class="z-buyer-chat-history"><p>${language()==="sw"?"Inafungua mazungumzo...":"Opening conversation..."}</p></div><form id="z-buyer-chat-form" class="z-buyer-chat-compose"><textarea name="message" maxlength="4000" required placeholder="${language()==="sw"?"Andika ujumbe kwa Seller...":"Write a message to the Seller..."}"></textarea><button type="submit" class="z-primary-button">${language()==="sw"?"Tuma":"Send"} →</button></form></div></section>`;
 document.body.appendChild(overlay);
 const close=()=>{overlay.remove();document.removeEventListener("keydown",onKey);};
 const onKey=event=>{if(event.key==="Escape")close();};
 overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
 overlay.querySelector(".z-detail-close")?.addEventListener("click",close);
 document.addEventListener("keydown",onKey);
 if(!document.getElementById("zuneBuyerChatStyles")){
  const style=document.createElement("style");style.id="zuneBuyerChatStyles";style.textContent=`.z-buyer-chat-sheet{max-width:620px}.z-buyer-chat-history{display:flex;flex-direction:column;gap:9px;max-height:48vh;min-height:180px;overflow:auto;padding:12px;background:var(--background,#f5f8f6);border:1px solid var(--border);border-radius:14px}.z-buyer-chat-message{max-width:84%;align-self:flex-start;padding:9px 12px;border-radius:13px;background:var(--surface,#fff);overflow-wrap:anywhere}.z-buyer-chat-message.mine{align-self:flex-end;background:color-mix(in srgb,var(--primary) 14%,white)}.z-buyer-chat-message p{margin:0;font-size:13px;white-space:pre-wrap}.z-buyer-chat-message small{display:block;margin-top:5px;font-size:9px;color:var(--text-muted)}.z-buyer-chat-compose{display:flex;gap:9px;margin-top:12px}.z-buyer-chat-compose textarea{flex:1;min-width:0;min-height:44px;max-height:110px;padding:10px;border:1px solid var(--border);border-radius:12px;font:inherit}.z-buyer-chat-compose button{white-space:nowrap}@media(max-width:480px){.z-buyer-chat-compose{flex-direction:column}}`;
  document.head.appendChild(style);
 }
 let conversationId=null;
 const history=overlay.querySelector("#z-buyer-chat-history");
 const renderMessages=rows=>{
  history.innerHTML=rows.length?rows.map(message=>`<div class="z-buyer-chat-message ${message.sender_id===user.id?"mine":""}"><p>${safe(message.message)}</p><small>${new Date(message.created_at).toLocaleString(language()==="sw"?"sw-TZ":"en-TZ")}</small></div>`).join(""):'<p class="z-muted">'+(language()==="sw"?"Anza mazungumzo kwa kutuma ujumbe.":"Start the conversation by sending a message.")+'</p>';
  history.scrollTop=history.scrollHeight;
 };
 const refresh=async()=>{
  const result=await supabase.from("chat_messages").select("id,sender_id,message,is_read,created_at").eq("conversation_id",conversationId).order("created_at",{ascending:true}).limit(100);
  if(result.error)throw result.error;
  renderMessages(result.data||[]);
  await supabase.from("chat_messages").update({is_read:true}).eq("conversation_id",conversationId).neq("sender_id",user.id).eq("is_read",false);
 };
 try{
  let result=await supabase.from("chat_conversations").select("id").eq("buyer_id",user.id).eq("seller_id",sellerId).eq("product_id",product.id).maybeSingle();
  if(result.error)throw result.error;
  if(result.data)conversationId=result.data.id;
  else{
   result=await supabase.from("chat_conversations").insert({buyer_id:user.id,seller_id:sellerId,product_id:product.id}).select("id").single();
   if(result.error)throw result.error;conversationId=result.data.id;
  }
  await refresh();
  overlay.querySelector("#z-buyer-chat-form")?.addEventListener("submit",async event=>{
   event.preventDefault();const form=event.currentTarget,message=String(new FormData(form).get("message")||"").trim(),button=form.querySelector("button[type=submit]");
   if(!message||!conversationId||button.disabled)return;button.disabled=true;
   try{const sent=await supabase.from("chat_messages").insert({conversation_id:conversationId,sender_id:user.id,message});if(sent.error)throw sent.error;form.reset();await refresh();}
   catch(error){alert(error.message|| (language()==="sw"?"Ujumbe haukutumwa.":"Message could not be sent."));}
   finally{button.disabled=false;}
  });
 }catch(error){console.error("ZUNE buyer-seller chat:",error);history.textContent=error.message||(language()==="sw"?"Imeshindikana kufungua mazungumzo.":"Unable to open this conversation.");}
}

// --------------------------------------------
// 12. SAVE PRODUCT
// --------------------------------------------

async function toggleSaved(productId) {
  const id = String(productId);
  const userId = homeState.user?.id;
  const exists = homeState.saved.map(String).includes(id);
  if (exists) homeState.saved = homeState.saved.filter(savedId => String(savedId) !== id);
  else homeState.saved.push(id);

  const savedKey = userStorageKey("zune_saved_products");
  if (savedKey) localStorage.setItem(savedKey, JSON.stringify(homeState.saved));
  updateProductArea();

  if (!userId) return;
  try {
    if (exists) {
      const result = await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", id);
      if (result.error) throw result.error;
    } else {
      const result = await supabase.from("wishlists").insert({ user_id: userId, product_id: id });
      if (result.error && result.error.code !== "23505") throw result.error;
    }
  } catch (error) {
    console.warn("ZUNE wishlist cloud sync:", error.message);
  }
}

// --------------------------------------------
// 12. ADD TO CART
// --------------------------------------------

function addToCart(productId, productOverride = null, selectedVariant = null) {
  const id = String(productId);
  const product = productOverride && String(productOverride.id)===id ? productOverride : homeState.products.find(item => String(item.id) === id);
  if (!product) { alert(language()==="sw"?"Bidhaa haijapatikana. Jaribu tena.":"Product not found. Please try again."); return; }
  const variantId = selectedVariant?.id || null;
  if (selectedVariant && (Number(selectedVariant.stock_quantity)||0) < 1) { alert(language()==="sw"?"Chaguo hili limeisha stock.":"This option is out of stock."); return; }
  if (!selectedVariant && product.__zuneHasVariants) { alert(language()==="sw"?"Chagua aina ya bidhaa kwanza.":"Please select a product option first."); return; }
  const existing = homeState.cart.find(item => String(item.productId)===id && String(item.variantId||"")===String(variantId||""));
  if (existing) existing.quantity=Math.min(99,Math.max(1,Number(existing.quantity||1)+1));
  else homeState.cart.push({productId:id,variantId,quantity:1});
  saveCart();
  alert(tx("added"));
}

// --------------------------------------------
// 13. CHANGE CART QUANTITY
// --------------------------------------------

function homeCartItemKey(item){return String(item.productId)+"::"+String(item.variantId||"");}
function changeCartQuantity(cartKey, change) {
  const key = String(cartKey);
  const item = homeState.cart.find(cartItem => homeCartItemKey(cartItem) === key);
  if (!item) return;
  item.quantity = Number(item.quantity || 1) + change;
  if (item.quantity <= 0) homeState.cart = homeState.cart.filter(cartItem => homeCartItemKey(cartItem) !== key);
  saveCart();
}

// --------------------------------------------
// 14. REMOVE CART ITEM
// --------------------------------------------

function removeCartItem(cartKey) {
  const key=String(cartKey);
  homeState.cart=homeState.cart.filter(item=>homeCartItemKey(item)!==key);
  saveCart();
}

// --------------------------------------------
// 15. UPDATE PRODUCT AREA
// --------------------------------------------

function bindProductCards(root){
  if(!root)return;
  root.querySelectorAll("[data-save-product]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();toggleSaved(button.dataset.saveProduct);}));
  root.querySelectorAll("[data-open-store]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();const id=button.dataset.openStore;const p=homeState.products.find(x=>String(x.vendor_id)===String(id))||homeState.sponsoredProducts.find(x=>String(x.product.vendor_id)===String(id))?.product;openStoreDetails(id,p||null);}));
  root.querySelectorAll("[data-open-product]").forEach(card=>{
    const open=()=>{const product=homeState.products.find(item=>String(item.id)===card.dataset.openProduct)||homeState.sponsoredProducts.find(item=>String(item.product.id)===card.dataset.openProduct)?.product;if(product)openProductDetails(product);};
    card.addEventListener("click",event=>{if(event.target.closest("[data-save-product]"))return;open();});
    card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
  });
}
function renderProductCards(products,gridClass="z-product-grid"){
 return products.length ? '<div class="'+gridClass+'">'+products.map(productCard).join("")+"</div>" : '<div class="z-empty-state"><strong>'+tx("empty")+"</strong></div>";
}
function updateProductArea() {
  const area=document.getElementById("z-product-area");
  if(area){
    const savedIds=new Set((homeState.saved||[]).map(String));
    const hybrid=[...homeState.products].sort((a,b)=>{
      const score=p=>Number(savedIds.has(String(p.id)))*-2+Number(String(p.category||"")===String(homeState.selectedCategory||"")&&homeState.selectedCategory?2:0)+Number(p.average_rating||p.rating_average||p.rating||0)*2+Number(p.sold_count||p.sales_count||p.total_sold||0)*.25;
      return score(b)-score(a);
    });
    area.innerHTML=renderProductCards(hybrid);
  }
  const dealsHost=document.getElementById("z-flash-deals-products");
  if(dealsHost){
    const deals=[...homeState.products].filter(p=>{
      const price=Number(p.price||0),old=Number(p.compare_at_price||p.original_price||0),pct=Number(p.discount_percent||0);
      return price>0&&(pct>0||old>price);
    }).sort((a,b)=>{
      const discount=p=>{const price=Number(p.price||0),old=Number(p.compare_at_price||p.original_price||0),pct=Number(p.discount_percent||0);return pct>0?pct:(old>price?(1-price/old)*100:0);};
      return discount(b)-discount(a);
    }).slice(0,8);
    dealsHost.innerHTML=deals.length?deals.map(productCard).join(""):'<div class="z-flash-deals-empty">'+(language()==="sw"?"Hakuna Flash Deals kwa sasa. Rudi tena kuona ofa mpya.":"No active Flash Deals right now. Check back for new offers.")+'</div>';
    bindProductCards(dealsHost);
  }
  const arrivals=document.getElementById("z-new-arrivals");
  if(arrivals)arrivals.innerHTML=homeState.products.length?homeState.products.slice(0,6).map(productCard).join(""):'<div class="z-empty-state">'+tx("empty")+"</div>";
  const trending=document.getElementById("z-trending-products");
  if(trending){
    const ranked=[...homeState.products].sort((a,b)=>{
      const score=p=>Number(p.sold_count||p.sales_count||p.total_sold||0)*3+Number(p.average_rating||p.rating_average||p.rating||0)*2+Number(p.review_count||p.reviews_count||0)*.1;
      return score(b)-score(a);
    }).slice(0,8);
    trending.innerHTML=renderProductCards(ranked);
  }
  document.querySelectorAll(".z-home-content #z-product-area,.z-home-content #z-new-arrivals,.z-home-content #z-trending-products").forEach(bindProductCards);
}
// --------------------------------------------
// 16. LOADING STATUS AND RETRY
// --------------------------------------------

function updateLoadStatus() {
  const status = document.getElementById("z-load-status");

  if (!status) return;

  if (homeState.loading) {
    status.innerHTML = `
      <span>${tx("loading")}</span>
    `;
    return;
  }

  if (homeState.loadError) {
    status.innerHTML = `
      <span>${tx("loadError")}</span>
      <br>
      <button
        type="button"
        class="z-primary-button"
        id="z-retry-products"
        style="max-width:160px;margin:12px auto"
      >
        ${tx("retry")}
      </button>
    `;

    document
      .getElementById("z-retry-products")
      ?.addEventListener("click", () => {
        loadProducts(homeState.products.length === 0);
      });

    return;
  }

  if (!homeState.hasMore && homeState.products.length) {
    status.textContent = tx("end");
  } else {
    status.textContent = "";
  }
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 2/4
// SEHEMU YA 3/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 3/4
// ============================================


const ZUNE_HOME_SLIDES = [
 {k:"ZUNE MARKETPLACE",sw:"Karibu sokoni kwetu",en:"Welcome to our marketplace",sd:"Gundua bidhaa mbalimbali kutoka kwa wauzaji.",ed:"Discover products from different sellers.",sc:"Gundua bidhaa",ec:"Explore products",a:"explore",img:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85"},
 {k:"FURSA YA BIASHARA",sw:"Fungua duka lako ZUNE",en:"Open your store on ZUNE",sd:"Fikisha bidhaa zako kwa wateja wengi zaidi.",ed:"Bring your products to more customers.",sc:"Jiunge kama Seller",ec:"Become a Seller",a:"account",img:"https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1400&q=85"},
 {k:"MAKUNDI MBALIMBALI",sw:"Kila unachohitaji sehemu moja",en:"Everything in one place",sd:"Tembelea makundi na upate unachotafuta.",ed:"Browse categories and find what you need.",sc:"Angalia makundi",ec:"Browse categories",a:"categories",img:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85"},
 {k:"UNUNUZI RAHISI",sw:"Pata bidhaa unazozipenda",en:"Find products you love",sd:"Tafuta na ugundue bidhaa sokoni.",ed:"Search and discover marketplace products.",sc:"Tafuta bidhaa",ec:"Find products",a:"search",img:"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1400&q=85"},
 {k:"THAMANI BORA",sw:"Chagua kwa uhakika",en:"Shop with confidence",sd:"Linganisha bidhaa na uchague inayokufaa.",ed:"Compare products and choose what suits you.",sc:"Anza kuchunguza",ec:"Start exploring",a:"explore",img:"https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=85"},
 {k:"BIDHAA MPYA",sw:"Gundua bidhaa mpya",en:"Discover new arrivals",sd:"Angalia bidhaa mpya zinazoongezwa sokoni.",ed:"See the latest products added to ZUNE.",sc:"Tazama bidhaa",ec:"See products",a:"products",img:"https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1400&q=85"},
 {k:"JENGA BIASHARA",sw:"Panua biashara yako mtandaoni",en:"Grow your business online",sd:"Anza safari yako ya kuuza na ZUNE.",ed:"Start your selling journey with ZUNE.",sc:"Fungua akaunti",ec:"Get started",a:"account",img:"https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1400&q=85"},
 {k:"GUNDUA ZAIDI",sw:"Kuna mengi ya kugundua",en:"There is more to discover",sd:"Vinjari bidhaa kutoka makundi tofauti.",ed:"Explore products across different categories.",sc:"Gundua sasa",ec:"Discover now",a:"explore",img:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85"},
 {k:"ZUNE KWA WOTE",sw:"Nunua na uza kwa urahisi",en:"Buy and sell with ease",sd:"Soko linalowaunganisha wanunuzi na wauzaji.",ed:"A marketplace connecting buyers and sellers.",sc:"Tembelea soko",ec:"Visit marketplace",a:"products",img:"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=85"},
 {k:"ZUNE DELIVERY · FURSA KWA MADEREVA",sw:"Jiunge na timu ya madereva wa ZUNE",en:"Ride with ZUNE Delivery",sd:"Tafuta nafasi ya udereva, sajili taarifa zako na wasilisha nyaraka zako ili zikaguliwe. Anza safari yako ya kufanya delivery na ZUNE.",ed:"Apply to become a ZUNE driver, submit your details and documents for review. Start your delivery journey with ZUNE.",sc:"Ingia kama dereva",ec:"Driver sign in",a:"delivery",img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=85"},
 {k:"ZUNE STATUS",sw:"Onyesha kinachoendelea dukani kwa Status",en:"Bring your store to life with Status",sd:"Weka picha au video za bidhaa na taarifa mpya. Wateja wataziona kwenye ukurasa wa maduka maarufu; Status huisha baada ya muda.",ed:"Post product photos, short videos and store updates. Customers can view them from Featured Stores; each Status expires automatically.",sc:"Fungua Seller Dashboard",ec:"Open Seller Dashboard",a:"seller",img:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85"},
,
 {k:"FASHION & STYLE",sw:"Mtindo unaokufaa unakusubiri",en:"Find your style",sd:"Gundua mavazi, viatu na accessories kutoka maduka mbalimbali.",ed:"Explore clothing, shoes and accessories from different stores.",sc:"Gundua fashion",ec:"Explore fashion",a:"categories",img:"https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=1600&q=85"},
 {k:"HOME & LIVING",sw:"Boresha nyumba yako",en:"Make your space feel like home",sd:"Pata samani na mapambo yanayokufaa.",ed:"Discover furniture and home essentials.",sc:"Angalia bidhaa",ec:"Explore products",a:"products",img:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85"},
 {k:"BEAUTY & CARE",sw:"Jitunze kwa namna unayoipenda",en:"Your beauty, your way",sd:"Gundua bidhaa za urembo na kujitunza.",ed:"Discover beauty and personal care products.",sc:"Gundua bidhaa",ec:"Explore products",a:"products",img:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1600&q=85"},
 {k:"KIDS & FAMILY",sw:"Mahitaji ya familia sehemu moja",en:"For every member of the family",sd:"Gundua bidhaa za watoto na familia.",ed:"Find products for kids and the whole family.",sc:"Angalia bidhaa",ec:"Explore products",a:"categories",img:"https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1600&q=85"},
 {k:"SPORTS & FITNESS",sw:"Anza safari yako ya afya na fitness",en:"Move more. Feel stronger.",sd:"Pata vifaa vya michezo na mazoezi.",ed:"Explore sports and fitness essentials.",sc:"Gundua sasa",ec:"Explore now",a:"categories",img:"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=85"},
 {k:"FOOD & GROCERY",sw:"Mahitaji ya kila siku karibu nawe",en:"Everyday essentials, made easy",sd:"Gundua vyakula na bidhaa za matumizi ya kila siku.",ed:"Discover food and everyday essentials.",sc:"Angalia makundi",ec:"Browse categories",a:"categories",img:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=85"},
 {k:"TRENDING PRODUCTS",sw:"Bidhaa zinazovuma sokoni",en:"What's trending right now",sd:"Angalia bidhaa zinazovutia wanunuzi.",ed:"Explore products catching shoppers' attention.",sc:"Tazama bidhaa",ec:"See products",a:"products",img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85"},
 {k:"GIFT IDEAS",sw:"Zawadi yenye maana kwa kila tukio",en:"Make every moment special",sd:"Gundua mawazo ya zawadi kwa watu unaowajali.",ed:"Find thoughtful gift ideas for people you care about.",sc:"Gundua zawadi",ec:"Explore gift ideas",a:"explore",img:"https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1600&q=85"},
 {k:"DISCOVER ZUNE",sw:"Kuna mengi zaidi ya kugundua!",en:"There is more to discover!",sd:"Tembelea ZUNE na ugundue bidhaa, maduka na fursa mbalimbali.",ed:"Explore products, stores and opportunities across ZUNE.",sc:"Anza sasa",ec:"Start exploring",a:"explore",img:"https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=85"}
];
function renderHomeCarousel(){
 const slide=ZUNE_HOME_SLIDES[homeState.carouselIndex%ZUNE_HOME_SLIDES.length],sw=language()==="sw";
 return `<section class="z-home-carousel" id="z-home-carousel" aria-label="ZUNE promotions">
 <img class="z-slide-image" src="${safe(slide.img)}" alt="${safe(sw?slide.sw:slide.en)}" loading="${homeState.carouselIndex===0?"eager":"lazy"}" fetchpriority="${homeState.carouselIndex===0?"high":"auto"}">
 <div class="z-slide-copy"><span class="z-slide-kicker">${slide.k}</span><h2>${sw?slide.sw:slide.en}</h2><p>${sw?slide.sd:slide.ed}</p><button type="button" class="z-slide-cta" data-slide-action="${slide.a}">${sw?slide.sc:slide.ec} →</button></div>
 <div class="z-slide-controls"><div class="z-slide-dots">${ZUNE_HOME_SLIDES.map((x,i)=>`<button type="button" class="z-slide-dot ${i===homeState.carouselIndex?"active":""}" data-slide-index="${i}" aria-label="Slide ${i+1}"></button>`).join("")}</div>
 <div class="z-slide-arrows"><button type="button" class="z-slide-arrow" data-slide-prev aria-label="Previous slide">‹</button><button type="button" class="z-slide-arrow" data-slide-next aria-label="Next slide">›</button></div></div></section>`;
}
function moveHomeSlide(step){
 homeState.carouselIndex=(homeState.carouselIndex+step+ZUNE_HOME_SLIDES.length)%ZUNE_HOME_SLIDES.length;
 const old=document.getElementById("z-home-carousel");if(!old)return;
 const holder=document.createElement("div");holder.innerHTML=renderHomeCarousel();old.replaceWith(holder.firstElementChild);bindCarouselEvents();
}
function bindCarouselEvents(){
 const el=document.getElementById("z-home-carousel");if(!el)return;
 el.querySelector("[data-slide-prev]")?.addEventListener("click",()=>moveHomeSlide(-1));
 el.querySelector("[data-slide-next]")?.addEventListener("click",()=>moveHomeSlide(1));
 el.querySelectorAll("[data-slide-index]").forEach(dot=>dot.addEventListener("click",()=>{
  homeState.carouselIndex=Number(dot.dataset.slideIndex)||0;const old=document.getElementById("z-home-carousel");if(!old)return;
  const holder=document.createElement("div");holder.innerHTML=renderHomeCarousel();old.replaceWith(holder.firstElementChild);bindCarouselEvents();
 }));
 el.querySelector("[data-slide-action]")?.addEventListener("click",()=>{
  const a=el.querySelector("[data-slide-action]").dataset.slideAction;
  if(a==="delivery")window.location.assign("https://mrnehemiah.github.io/Zune-delivery-/login.html");
  else if(a==="account")window.location.assign("./account.html");
  else if(a==="seller")window.location.assign("https://mrnehemiah.github.io/zuneacts/");
  else if(a==="categories")renderMarketplacePage("explore");
  else if(a==="stores")document.getElementById("z-featured-stores")?.scrollIntoView({behavior:"smooth"});
  else if(a==="search")document.getElementById("z-home-search")?.focus();
  else document.getElementById("z-product-area")?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 let x=0;el.addEventListener("touchstart",e=>{x=e.changedTouches[0]?.clientX||0;},{passive:true});
 el.addEventListener("touchend",e=>{const d=(e.changedTouches[0]?.clientX||0)-x;if(Math.abs(d)>45)moveHomeSlide(d<0?1:-1);},{passive:true});
}
function startCarouselAutoplay(){if(homeState.carouselTimer)clearInterval(homeState.carouselTimer);homeState.carouselTimer=setInterval(()=>moveHomeSlide(1),5000);}


async function loadLiveStoreStatuses(force=false){
 if(!force&&Date.now()-homeState.statusesLoadedAt<45000)return;
 homeState.statusesLoadedAt=Date.now();
 try{
  const {data,error}=await supabase.from("zune_store_statuses").select("id,store_id,owner_id,media_url,media_type,caption,target_product_id,created_at,expires_at").eq("is_active",true).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:true}).limit(200);
  if(error)throw error;
  const grouped={};(data||[]).forEach(st=>{(grouped[String(st.owner_id)]??=[]).push(st);});
  homeState.statusByStore=grouped;
  const holder=document.getElementById("z-featured-stores");if(holder)holder.innerHTML=renderFeaturedStores();
 }catch(error){console.warn("ZUNE live statuses unavailable:",error.message);}
}
function hasSeenStoreStatuses(ownerId){
 const seen=readStorage("zune_status_seen:"+String(ownerId),[]);
 const ids=(homeState.statusByStore[String(ownerId)]||[]).map(x=>x.id);
 return ids.length>0&&ids.every(id=>seen.includes(id));
}

async function bindStatusEngagement(root,st,store){
 const card=root.querySelector(".z-status-card");if(!card)return;
 const panel=document.createElement("section");panel.className="z-status-engagement";panel.setAttribute("aria-label","Status interactions");card.appendChild(panel);
 const currentUser=homeState.user?.id||null;
 const ownerId=String(st.owner_id);
 async function refresh(){
  const [likesResult,commentsResult]=await Promise.all([
   supabase.from("zune_status_likes").select("user_id").eq("status_id",st.id),
   supabase.from("zune_status_comments").select("id,user_id,comment,created_at").eq("status_id",st.id).order("created_at",{ascending:false}).limit(20)
  ]);
  if(likesResult.error)throw likesResult.error;
  if(commentsResult.error)throw commentsResult.error;
  const likes=likesResult.data||[],comments=commentsResult.data||[];
  const liked=!!currentUser&&likes.some(x=>String(x.user_id)===String(currentUser));
  const names={};
  const ids=[...new Set(comments.map(x=>x.user_id).filter(Boolean))];
  if(ids.length){const p=await supabase.from("profiles").select("id,full_name").in("id",ids);if(!p.error)(p.data||[]).forEach(x=>names[String(x.id)]=x.full_name||"Mtumiaji ZUNE");}
  panel.innerHTML='<div class="z-status-actions"><button type="button" class="z-status-action '+(liked?'liked':'')+'" data-status-like '+(!currentUser?'disabled':'')+'>'+(liked?'♥ Ume-like':'♡ Like')+' · '+likes.length+'</button><span class="z-status-hint">💬 '+comments.length+' maoni</span><button type="button" class="z-status-action" data-status-message '+(!currentUser||String(currentUser)===ownerId?'disabled':'')+'>✉ Tuma ujumbe</button></div><div class="z-status-comments">'+(comments.length?comments.map(x=>'<div class="z-status-comment"><strong>'+safe(names[String(x.user_id)]||"Mtumiaji ZUNE")+'</strong>'+safe(x.comment)+'</div>').join(""):'<span class="z-status-hint">Bado hakuna maoni. Anza mazungumzo.</span>')+'</div><form class="z-status-comment-form"><input name="comment" maxlength="1000" placeholder="'+(currentUser?'Andika maoni...':'Ingia ili kutoa maoni')+'" '+(!currentUser?'disabled':'')+' required><button type="submit" '+(!currentUser?'disabled':'')+'>Tuma</button></form><form class="z-status-message-form"><input name="message" maxlength="2000" placeholder="Andika ujumbe kwa duka..." required><button type="submit">Tuma</button></form>';
  panel.querySelector("[data-status-like]")?.addEventListener("click",async()=>{
   if(!currentUser)return;
   const button=panel.querySelector("[data-status-like]");button.disabled=true;
   try{
    if(liked){const r=await supabase.from("zune_status_likes").delete().eq("status_id",st.id).eq("user_id",currentUser);if(r.error)throw r.error;}
    else{const r=await supabase.from("zune_status_likes").insert({status_id:st.id,user_id:currentUser});if(r.error)throw r.error;}
    await refresh();
   }catch(e){console.error("Status like:",e);alert("Imeshindikana kuhifadhi Like. Jaribu tena.");button.disabled=false;}
  });
  panel.querySelector(".z-status-comment-form")?.addEventListener("submit",async e=>{
   e.preventDefault();if(!currentUser)return;
   const input=e.currentTarget.elements.comment,comment=input.value.trim();if(!comment)return;
   const button=e.currentTarget.querySelector("button");button.disabled=true;
   try{const r=await supabase.from("zune_status_comments").insert({status_id:st.id,user_id:currentUser,comment});if(r.error)throw r.error;await refresh();}
   catch(err){console.error("Status comment:",err);alert("Imeshindikana kutuma maoni. Jaribu tena.");button.disabled=false;}
  });
  panel.querySelector("[data-status-message]")?.addEventListener("click",()=>panel.querySelector(".z-status-message-form")?.classList.toggle("open"));
  panel.querySelector(".z-status-message-form")?.addEventListener("submit",async e=>{
   e.preventDefault();if(!currentUser||String(currentUser)===ownerId)return;
   const input=e.currentTarget.elements.message,message=input.value.trim();if(!message)return;
   const button=e.currentTarget.querySelector("button");button.disabled=true;
   try{
    const conv=await supabase.from("conversations").insert({created_by:currentUser}).select("id").single();if(conv.error)throw conv.error;
    const members=await supabase.from("conversation_participants").insert([{conversation_id:conv.data.id,user_id:currentUser},{conversation_id:conv.data.id,user_id:ownerId}]);if(members.error)throw members.error;
    const sent=await supabase.from("messages").insert({conversation_id:conv.data.id,sender_id:currentUser,content:message});if(sent.error)throw sent.error;
    input.value="";panel.querySelector(".z-status-message-form")?.classList.remove("open");
    alert("Ujumbe umetumwa kwa "+safe(store?.store_name||"duka")+".");
   }catch(err){console.error("Status direct message:",err);alert("Ujumbe haujatuma. Hakikisha akaunti yako imeingia kisha jaribu tena.");button.disabled=false;}
  });
 }
 try{await refresh();}catch(error){console.warn("Status engagement unavailable:",error.message);panel.innerHTML='<span class="z-status-hint">Maoni na Likes hazijapakia. Jaribu tena baadaye.</span>';}
}

function openStoreStatus(ownerId){
 const statuses=homeState.statusByStore[String(ownerId)]||[];if(!statuses.length)return false;
 const store=(homeState.featuredStores||[]).find(x=>String(x.owner_id)===String(ownerId));let index=0,timer=null,started=0,elapsed=0,duration=5000;
 const stop=()=>{if(timer)clearInterval(timer);timer=null;};
 const close=()=>{stop();document.getElementById("z-status-viewer")?.remove();document.removeEventListener("keydown",onKey);};
 const onKey=e=>{if(e.key==="Escape")close();if(e.key==="ArrowRight")show(index+1);if(e.key==="ArrowLeft")show(index-1);};
 const show=async next=>{
  stop();if(next<0||next>=statuses.length){close();return;}index=next;elapsed=0;started=Date.now();const st=statuses[index];
  const seen=readStorage("zune_status_seen:"+String(ownerId),[]);if(!seen.includes(st.id)){seen.push(st.id);localStorage.setItem("zune_status_seen:"+String(ownerId),JSON.stringify(seen));}
  if(homeState.user?.id)supabase.from("zune_store_status_views").upsert({status_id:st.id,viewer_id:homeState.user.id},{onConflict:"status_id,viewer_id",ignoreDuplicates:true}).then(()=>{}).catch(()=>{});
  const root=document.getElementById("z-status-viewer");if(!root)return;
  const media=st.media_type==="video"?'<video class="z-status-media" src="'+safe(st.media_url)+'" autoplay muted playsinline webkit-playsinline preload="auto"></video>':st.media_type==="image"?'<img class="z-status-media" src="'+safe(st.media_url)+'" alt="Store status">':'<div class="z-status-empty-media">'+safe(st.media_url||st.caption||"ZUNE")+'</div>';
  const productAction=st.target_product_id?'<button type="button" class="z-status-product" data-status-product="'+safe(st.target_product_id)+'">Tazama Bidhaa</button>':"";
  root.innerHTML='<div class="z-status-card"><div class="z-status-progress">'+statuses.map((x,i)=>'<span class="'+(i<index?"done":"")+'"><i></i></span>').join("")+'</div><div class="z-status-top">'+(store?.logo_url?'<img src="'+safe(store.logo_url)+'" alt="">':"")+'<strong>'+safe(store?.store_name||"ZUNE Store")+'</strong><small>'+new Date(st.created_at).toLocaleString(language()==="sw"?"sw-TZ":"en-US",{hour:"numeric",minute:"2-digit"})+'</small><button class="z-status-close" type="button" aria-label="Close">×</button></div>'+media+'<div class="z-status-caption">'+safe(st.caption||"")+'</div>'+productAction+'<div class="z-status-nav"><button type="button" data-status-prev aria-label="Previous status"></button><button type="button" data-status-next aria-label="Next status"></button></div></div>';
  root.querySelector(".z-status-close")?.addEventListener("click",close);root.querySelector("[data-status-prev]")?.addEventListener("click",()=>show(index-1));root.querySelector("[data-status-next]")?.addEventListener("click",()=>show(index+1));
  await bindStatusEngagement(root,st,store);
  root.querySelector("[data-status-product]")?.addEventListener("click",async()=>{const id=st.target_product_id;const{data,error}=await supabase.from("products").select("*").eq("id",id).maybeSingle();if(error||!data)return;data.__zuneStore=store||null;close();openProductDetails(data);});
  const video=root.querySelector("video");if(video){video.addEventListener("ended",()=>show(index+1));video.addEventListener("loadedmetadata",()=>{if(Number.isFinite(video.duration)&&video.duration>0)duration=Math.max(5000,Math.min(video.duration*1000,60000));});video.addEventListener("error",()=>{console.warn("ZUNE status video failed:",video.error?.code,st.media_url);});try{const playResult=video.play();if(playResult&&typeof playResult.catch==="function")playResult.catch(error=>console.warn("ZUNE status autoplay blocked:",error.message));}catch(error){console.warn("ZUNE status playback unavailable:",error.message);} }else duration=5000;
  const ring=document.querySelector(`[data-featured-store="${CSS.escape(String(ownerId))}"] .z-featured-store-logo`);if(ring){ring.classList.remove("has-status","has-unseen-status");ring.classList.add("status-seen");}
  const bars=[...root.querySelectorAll(".z-status-progress span i")];timer=setInterval(()=>{const progress=Math.min(1,(Date.now()-started)/duration);if(bars[index])bars[index].style.width=(progress*100)+"%";if(progress>=1&&st.media_type!=="video")show(index+1);},50);
 };
 let root=document.getElementById("z-status-viewer");if(!root){root=document.createElement("div");root.id="z-status-viewer";root.className="z-status-viewer";document.body.appendChild(root);}
 document.addEventListener("keydown",onKey);show(0);return true;
}

function renderFeaturedStores(){
 const stores=homeState.featuredStores||[];
 if(!stores.length)return `<div class="z-empty-state">${language()==="sw"?"Maduka yataonekana kadri bidhaa za wauzaji zinavyopakiwa.":"Stores will appear as seller products load."}</div>`;
 return stores.slice(0,10).map(store=>{
  const name=store.store_name||"ZUNE Store";
  const storeStatuses=homeState.statusByStore[String(store.owner_id)]||[];
  const statusClass=storeStatuses.length?(hasSeenStoreStatuses(store.owner_id)?"status-seen":"has-status has-unseen-status"):"";
  const initials=String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join("")||"Z";
  const logo=store.logo_url||store.store_logo_url||store.logo||"";
  const logoMarkup=logo?`<img src="${safe(logo)}" alt="${safe(name)} logo" loading="lazy" onerror="this.remove()">`:safe(initials);
  return `<button type="button" class="z-featured-store" data-featured-store="${safe(store.owner_id)}" aria-label="${safe(name)}"><span class="z-featured-store-logo ${statusClass}" aria-hidden="true">${logoMarkup}</span><strong>${safe(name)} ${["verified","approved"].includes(String(store.verification_status||"").toLowerCase())?`<span class="store-verified" title="Verified Store" aria-label="Verified Store">✓</span>`:""}</strong><small>${safe([store.district,store.region].filter(Boolean).join(", ")|| (language()==="sw"?"Duka la ZUNE":"ZUNE Store"))}</small></button>`;
 }).join("");
}

// --------------------------------------------
// 17. RENDER CATEGORIES
// --------------------------------------------

function renderCategories() {
  const categories = homeState.categories || [];
  return `
    <div class="z-category-directory z-home-category-images">
      ${categories.slice(0,8).map((category,index) => `
        <button type="button" class="z-home-category-card ${String(homeState.selectedCategory)===String(category.name)?"active":""}" data-category="${safe(category.name)}" aria-label="${safe(category.name)}">
          <img src="${categoryImage(category.name,index)}" alt="" loading="lazy" decoding="async">
          <span class="z-home-category-shade"></span><strong>${safe(category.name)}</strong><span class="z-home-category-arrow" aria-hidden="true">↗</span>
        </button>
      `).join("")}
    </div>
  `;
}

function ensureHomeVisualEnhancements(){
  if(document.getElementById("zune-home-visual-enhancements"))return;
  const style=document.createElement("style");style.id="zune-home-visual-enhancements";
  style.textContent=`
    .z-home-category-images{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px!important;margin:0 0 18px}
    .z-home-category-card{position:relative;isolation:isolate;overflow:hidden;display:block;min-width:0;aspect-ratio:1/1.12;padding:0;border:2px solid transparent;border-radius:15px;background:#dfe8e2;color:#fff;text-align:left;cursor:pointer;box-shadow:0 4px 13px rgba(13,49,32,.09)}
    .z-home-category-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
    .z-home-category-card:active img{transform:scale(1.06)}
    .z-home-category-card.active{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 22%,transparent)}
    .z-home-category-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02) 20%,rgba(0,0,0,.72) 100%)}
    .z-home-category-card strong{position:absolute;left:7px;right:22px;bottom:9px;color:#fff;font-size:clamp(9px,2.5vw,12px);font-weight:900;line-height:1.15;text-shadow:0 1px 5px #000;overflow-wrap:anywhere}
    .z-home-category-arrow{position:absolute;right:6px;bottom:6px;display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:rgba(255,255,255,.22);font-size:12px}
    .z-flash-deals-section{margin:22px 0 24px;padding:15px 13px 13px;border:1px solid #f0d7b6;border-radius:19px;background:linear-gradient(135deg,#fff8ed 0%,#fff 72%);box-shadow:0 8px 22px rgba(131,75,20,.06)}
    .z-flash-deals-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}
    .z-flash-deals-kicker{display:block;margin-bottom:5px;color:#a45a14;font-size:8px;font-weight:950;letter-spacing:1.5px}
    .z-flash-deals-heading h2{margin:0;color:#432a13;font-size:18px;font-weight:950}
    .z-flash-deals-heading p{margin:5px 0 0;color:#92765a;font-size:10px;line-height:1.4}
    .z-flash-deals-pill{flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#e87924;color:#fff;font-size:9px;font-weight:950;letter-spacing:.6px}
    .z-flash-deals-section .z-product-row{padding-bottom:4px}
    .z-flash-deals-empty{padding:18px 12px;border:1px dashed #ead3b8;border-radius:13px;color:#8e7458;text-align:center;font-size:11px;line-height:1.5}
    @media(max-width:390px){.z-home-category-images{gap:7px!important}.z-home-category-card{border-radius:11px}.z-home-category-card strong{left:5px;bottom:7px;font-size:9px}.z-flash-deals-section{padding:12px 9px}}
    @media(min-width:700px){.z-home-category-images{grid-template-columns:repeat(8,minmax(0,1fr));gap:12px!important}.z-home-category-card{aspect-ratio:1/1.08}.z-flash-deals-section{padding:20px}}
    @media(prefers-reduced-motion:reduce){.z-home-category-card img{transition:none}}
  `;
  document.head.appendChild(style);
}

function ensurePremiumSearchStyles(){
 if(document.getElementById("zune-premium-search-styles"))return;
 const style=document.createElement("style");style.id="zune-premium-search-styles";
 style.textContent=`
 .z-search-premium{position:relative;margin:10px 0 5px}
 .z-search-premium-box{display:flex!important;align-items:center;gap:7px;min-height:54px;padding:0 10px!important;border:1px solid #dce9e1!important;border-radius:17px!important;background:#fff!important;box-shadow:0 6px 20px rgba(15,65,39,.08)!important}
 .z-search-premium-box>input[type=search]{flex:1;min-width:0;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;font-size:13px!important}
 .z-search-tool{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border:0;border-radius:10px;background:#eff7f1;color:#147343;font-size:19px;font-weight:800;cursor:pointer}
 .z-search-filter-trigger{background:#e7f3eb}
 .z-search-tool.is-listening{background:#d9f4e3;animation:zuneSearchPulse 1s ease-in-out infinite}
 @keyframes zuneSearchPulse{50%{box-shadow:0 0 0 6px rgba(17,142,77,.13)}}
 .z-search-hint{padding:5px 4px 0;color:#829188;font-size:10px}
 .z-search-suggestions{z-index:60}
 .z-search-filter-overlay,.z-search-image-preview{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:14px;background:rgba(8,25,16,.52);backdrop-filter:blur(4px)}
 .z-search-filter-sheet,.z-search-image-sheet{width:min(100%,520px);max-height:88vh;overflow:auto;padding:20px;border-radius:23px 23px 17px 17px;background:#fff;color:#17251c;box-shadow:0 18px 60px #0003}
 .z-search-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}
 .z-search-sheet-head h3{margin:0;font-size:19px;font-weight:900}
 .z-search-sheet-close{width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f2;font-size:22px}
 .z-search-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .z-search-filter-field{display:flex;flex-direction:column;gap:6px;color:#59675e;font-size:11px;font-weight:700}
 .z-search-filter-field input,.z-search-filter-field select{width:100%;min-height:43px;padding:0 11px;border:1px solid #dce6df;border-radius:11px;background:#fff;color:#17251c;font-size:13px}
 .z-search-filter-check{display:flex;align-items:center;gap:9px;margin:15px 0;color:#33463a;font-size:13px}
 .z-search-filter-actions{display:flex;gap:9px;margin-top:18px}
 .z-search-filter-actions button{flex:1;min-height:45px;border:0;border-radius:12px;font-weight:800}
 .z-search-filter-reset{background:#f0f4f1;color:#425348}
 .z-search-filter-apply{background:#087b45;color:#fff}
 .z-search-active-count{display:inline-grid;place-items:center;min-width:17px;height:17px;margin-left:3px;border-radius:50%;background:#087b45;color:white;font-size:10px}
 .z-search-image-preview img{display:block;width:100%;max-height:42vh;object-fit:contain;border-radius:14px;background:#f2f5f3}
 .z-search-image-note{margin:12px 0;color:#69786e;font-size:12px;line-height:1.5}
 .z-search-image-upload{display:block;width:100%;padding:13px;border:1px dashed #9bb9a5;border-radius:12px;text-align:center;color:#147343;font-weight:800}
 @media(min-width:700px){.z-search-filter-overlay,.z-search-image-preview{align-items:center}.z-search-filter-sheet,.z-search-image-sheet{border-radius:22px}}
 `;
 document.head.appendChild(style);
}

// --------------------------------------------
// 18. HOME PAGE
// --------------------------------------------

function renderHomePage() {
  return `
    <div class="z-home">

      <header class="z-home-header">

        <div class="z-home-top">

          <div class="z-home-brand">
            <div class="zune-logo">ⓏⓊⓃⒺ</div>
          </div>

          <div class="z-home-actions">

            <button
              type="button"
              class="z-icon-button"
              data-open-cart
              aria-label="${tx("cart")}"
            >
              ${zIcon("cart")}
              <span class="z-cart-badge" data-cart-count hidden>0</span>
            </button>

          </div>

        </div>

        <div class="z-search-premium" id="z-search-premium">
          <label class="z-search-box z-search-premium-box">
            ${zIcon("search")}
            <input id="z-home-search" type="search" placeholder="${tx("search")}" value="${safe(homeState.search)}" autocomplete="off" aria-controls="z-search-suggestions" aria-expanded="false">
            <button type="button" class="z-search-tool" id="z-search-image" aria-label="${language()==="sw"?"Tafuta kwa picha":"Search by image"}" title="${language()==="sw"?"Tafuta kwa picha":"Search by image"}">▧</button>
            <button type="button" class="z-search-tool" id="z-search-voice" aria-label="${language()==="sw"?"Tafuta kwa sauti":"Voice search"}" title="${language()==="sw"?"Tafuta kwa sauti":"Voice search"}">♩</button>
            <button type="button" class="z-search-tool z-search-filter-trigger" id="z-search-filter" aria-label="${language()==="sw"?"Chuja bidhaa":"Filter products"}" title="${language()==="sw"?"Chuja bidhaa":"Filter products"}">☷</button>
            <input type="file" id="z-search-image-file" accept="image/*" hidden>
            <div class="z-search-suggestions" id="z-search-suggestions" role="listbox"></div>
          </label>
          <div class="z-search-hint">${language()==="sw"?"Tafuta bidhaa, duka au chapa":"Search products, stores or brands"}</div>
        </div>

      </header>

      <main class="z-home-content">

        ${renderHomeCarousel()}



        <section>

          <div class="z-section-heading">
            <h2>${tx("categories")}</h2>
            <button type="button" class="z-all-categories" data-open-categories>${tx("allCategories")} →</button>
          </div>

          <div id="z-category-area">
            ${renderCategories()}
          </div>

        </section>

        <section id="z-featured-stores-section">
          <div class="z-section-heading"><h2>${language()==="sw"?"Maduka Maarufu":"Featured Stores"}</h2></div>
          <div class="z-featured-stores" id="z-featured-stores">${renderFeaturedStores()}</div>
        </section>

        <section id="z-sponsored-stores-section"><div class="z-section-heading"><h2>${language()==="sw"?"Maduka Yaliyodhaminiwa":"Sponsored Stores"}</h2></div><div id="z-sponsored-stores" class="z-sponsored-stores"></div></section>

        <section id="z-sponsored-products-section">
          <div class="z-section-heading"><h2>${language()==="sw"?"Bidhaa Zilizodhaminiwa":"Sponsored Products"}</h2><span class="z-sponsored-note">${language()==="sw"?"Matangazo":"Ads"}</span></div>
          <div class="z-sponsored-products" id="z-sponsored-products"><div class="z-sponsored-empty">${language()==="sw"?"Inapakia matangazo…":"Loading sponsored products…"}</div></div>
        </section>

        <section id="z-flash-deals-section" class="z-flash-deals-section">
          <div class="z-flash-deals-heading">
            <div><span class="z-flash-deals-kicker">ZUNE • LIMITED OFFERS</span><h2>⚡ Flash Deals</h2><p>${language()==="sw"?"Ofa maalumu kwenye bidhaa zenye punguzo.":"Special offers on products with active discounts."}</p></div>
            <span class="z-flash-deals-pill">${language()==="sw"?"OFA":"DEALS"}</span>
          </div>
          <div id="z-flash-deals-products" class="z-product-row"><div class="z-empty-state">${language()==="sw"?"Inatafuta ofa...":"Finding active deals..."}</div></div>
        </section>
        <section>
          <div class="z-section-heading"><h2>${language()==="sw"?"Bidhaa Mpya":"New Arrivals"}</h2><button type="button" class="z-all-categories" data-view-all-products>${language()==="sw"?"Zote":"View All"} →</button></div>
          <div id="z-new-arrivals" class="z-product-row">${homeState.products.slice(0,6).map(productCard).join("")}</div>
        </section>
        <section>
          <div class="z-section-heading"><h2>Trending Products</h2></div>
          <div id="z-trending-products" class="z-product-grid"></div>
        </section>
        <section>
          <div class="z-section-heading"><h2>${language()==="sw"?"Smart Hybrid — Imependekezwa kwako":"Smart Hybrid — Recommended for You"}</h2></div>
          <div id="z-product-area">${homeState.products.length?`<div class="z-product-grid">${homeState.products.map(productCard).join("")}</div>`:""}</div>
          <div class="z-load-status" id="z-load-status"></div><div id="z-scroll-trigger"></div>
        </section>

      </main>

    </div>
  `;
}

// --------------------------------------------
// 19. CATEGORY EVENTS
// --------------------------------------------

function bindCategoryEvents() {
  const area = document.getElementById("z-category-area");

  if (!area) return;

  area.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", async () => {
      homeState.selectedCategory = button.dataset.category || "";

      homeState.page = 0;
      homeState.products = [];
      homeState.hasMore = true;

      const categories = document.getElementById("z-category-area");

      if (categories) {
        categories.innerHTML = renderCategories();
        bindCategoryEvents();
      }

      await loadProducts(true);
    });
  });
}

// --------------------------------------------
// 20. SEARCH EVENTS
// --------------------------------------------

function openSearchFilterSheet(){
 document.getElementById("z-search-filter-overlay")?.remove();
 const f=homeState.searchFilters,sw=language()==="sw";
 const overlay=document.createElement("div");overlay.id="z-search-filter-overlay";overlay.className="z-search-filter-overlay";
 overlay.innerHTML=`<section class="z-search-filter-sheet" role="dialog" aria-modal="true" aria-label="${sw?"Chuja bidhaa":"Filter products"}">
  <div class="z-search-sheet-head"><h3>${sw?"Chuja bidhaa":"Filter products"}</h3><button type="button" class="z-search-sheet-close" aria-label="Close">×</button></div>
  <div class="z-search-filter-grid">
   <label class="z-search-filter-field">${sw?"Bei ya chini (TSh)":"Minimum price (TSh)"}<input id="z-filter-min" type="number" min="0" inputmode="numeric" value="${safe(f.minPrice)}" placeholder="0"></label>
   <label class="z-search-filter-field">${sw?"Bei ya juu (TSh)":"Maximum price (TSh)"}<input id="z-filter-max" type="number" min="0" inputmode="numeric" value="${safe(f.maxPrice)}" placeholder="—"></label>
   <label class="z-search-filter-field" style="grid-column:1/-1">${sw?"Panga matokeo":"Sort results"}<select id="z-filter-sort">
    <option value="newest" ${f.sort==="newest"?"selected":""}>${sw?"Mpya kwanza":"Newest first"}</option>
    <option value="price_low" ${f.sort==="price_low"?"selected":""}>${sw?"Bei: ndogo hadi kubwa":"Price: low to high"}</option>
    <option value="price_high" ${f.sort==="price_high"?"selected":""}>${sw?"Bei: kubwa hadi ndogo":"Price: high to low"}</option>
   </select></label>
  </div>
  <label class="z-search-filter-check"><input id="z-filter-stock" type="checkbox" ${f.inStock?"checked":""}> ${sw?"Bidhaa zilizopo stokini":"In-stock products only"}</label>
  <label class="z-search-filter-check"><input id="z-filter-verified" type="checkbox" ${f.verifiedOnly?"checked":""}> ${sw?"Maduka yaliyothibitishwa pekee":"Verified stores only"}</label>
  <div class="z-search-filter-actions"><button type="button" class="z-search-filter-reset" id="z-filter-reset">${sw?"Futa vichujio":"Reset"}</button><button type="button" class="z-search-filter-apply" id="z-filter-apply">${sw?"Tumia vichujio":"Apply filters"}</button></div>
 </section>`;
 document.body.appendChild(overlay);
 const close=()=>overlay.remove();
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
 overlay.querySelector(".z-search-sheet-close").addEventListener("click",close);
 overlay.querySelector("#z-filter-reset").addEventListener("click",()=>{
  overlay.querySelector("#z-filter-min").value="";overlay.querySelector("#z-filter-max").value="";
  overlay.querySelector("#z-filter-sort").value="newest";overlay.querySelector("#z-filter-stock").checked=false;overlay.querySelector("#z-filter-verified").checked=false;
 });
 overlay.querySelector("#z-filter-apply").addEventListener("click",async()=>{
  const min=overlay.querySelector("#z-filter-min").value.trim(),max=overlay.querySelector("#z-filter-max").value.trim();
  if(min&&max&&Number(min)>Number(max)){alert(sw?"Bei ya chini haiwezi kuzidi bei ya juu.":"Minimum price cannot exceed maximum price.");return;}
  homeState.searchFilters={minPrice:min,maxPrice:max,sort:overlay.querySelector("#z-filter-sort").value,inStock:overlay.querySelector("#z-filter-stock").checked,verifiedOnly:overlay.querySelector("#z-filter-verified").checked};
  close();homeState.page=0;homeState.products=[];homeState.hasMore=true;await loadProducts(true);
 });
}

function openSearchImagePicker(){
 const picker=document.getElementById("z-search-image-file");picker?.click();
}

function imageSearchUrls(product){
 let images=Array.isArray(product.image_urls)?product.image_urls:[];
 if(typeof product.image_urls==="string"){try{const parsed=JSON.parse(product.image_urls);if(Array.isArray(parsed))images=parsed;}catch(_){images=product.image_urls.trim()?[product.image_urls.trim()]:[];}}
 images=images.map(item=>typeof item==="string"?item:(item&&typeof item==="object"?(item.url||item.publicUrl||item.public_url||item.src||""):"")).filter(Boolean);
 if(product.image_url&&!images.includes(product.image_url))images.unshift(product.image_url);
 return [...new Set(images)];
}
function imageDescriptor(image){
 const size=32,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(image,0,0,size,size);
 const pixels=ctx.getImageData(0,0,size,size).data,gray=[];
 let red=0,green=0,blue=0,count=0;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  let r=0,g=0,b=0,n=0;
  for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++){const i=(((y*4+yy)*size)+(x*4+xx))*4;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];n++;}
  r/=n;g/=n;b/=n;gray.push(.299*r+.587*g+.114*b);red+=r;green+=g;blue+=b;count++;
 }
 const mean=gray.reduce((a,b)=>a+b,0)/gray.length;
 return {bits:gray.map(v=>v>=mean?1:0),color:[red/count,green/count,blue/count]};
}
function imageDistance(a,b){
 let different=0;for(let i=0;i<a.bits.length;i++)if(a.bits[i]!==b.bits[i])different++;
 const color=Math.sqrt((a.color[0]-b.color[0])**2+(a.color[1]-b.color[1])**2+(a.color[2]-b.color[2])**2)/441.67;
 return different/64*.78+color*.22;
}
function loadImageForSearch(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.crossOrigin="anonymous";image.decoding="async";
  const timer=setTimeout(()=>{image.src="";reject(new Error("Image timeout"));},9000);
  image.onload=()=>{clearTimeout(timer);try{resolve(imageDescriptor(image));}catch(error){reject(error);}};
  image.onerror=()=>{clearTimeout(timer);reject(new Error("Image unavailable for visual comparison"));};
  image.src=url;
 });
}
async function runVisualProductSearch(file,overlay,previewUrl){
 const status=overlay.querySelector(".z-search-image-note"),results=overlay.querySelector(".z-search-image-results"),run=overlay.querySelector("#z-search-image-run");
 run.disabled=true;run.textContent=language()==="sw"?"Inalinganisha picha...":"Matching images...";
 status.textContent=language()==="sw"?"Inachambua picha na kulinganisha na picha za bidhaa zilizopo...":"Analyzing your image and comparing it with marketplace product photos...";
 results.innerHTML="";
 try{
  const uploaded=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{try{resolve(imageDescriptor(image));}catch(e){reject(e);}};image.onerror=()=>reject(new Error("Could not read selected image"));image.src=previewUrl;});
  const {data,error}=await supabase.from("products").select("id,title,price,image_url,image_urls,vendor_id,stock_quantity,moderation_status").eq("moderation_status","approved").gt("stock_quantity",0).limit(80);
  if(error)throw error;
  const candidates=(data||[]).filter(p=>imageSearchUrls(p).length);
  let cursor=0,matched=[],unavailable=0;
  async function worker(){
   while(cursor<candidates.length){
    const product=candidates[cursor++];
    try{
     const descriptor=await loadImageForSearch(imageSearchUrls(product)[0]);
     matched.push({product,score:imageDistance(uploaded,descriptor)});
    }catch(_){unavailable++;}
   }
  }
  await Promise.all(Array.from({length:Math.min(5,candidates.length)},()=>worker()));
  matched.sort((a,b)=>a.score-b.score);
  const top=matched.filter(item=>item.score<.43).slice(0,12);
  if(!top.length){
   status.textContent=language()==="sw"?"Hakuna bidhaa inayofanana vya kutosha kwenye picha zilizopo. Jaribu picha nyingine iliyo wazi.":"No close visual matches were found in the available product photos. Try a clearer image.";
   results.innerHTML='<div class="z-image-search-empty">⌕<br>'+ (language()==="sw"?"Hakuna bidhaa zinazofanana kwa sasa.":"No similar products found yet.")+'</div>';
  }else{
   status.textContent=(language()==="sw"?"Bidhaa zinazofanana zaidi: ":"Closest visual matches: ")+top.length+(unavailable?" · "+unavailable+(language()==="sw"?" picha hazikuweza kuchambuliwa":" images could not be checked"):"");
   results.innerHTML=top.map((item,index)=>'<button type="button" class="z-image-search-result" data-image-result="'+safe(item.product.id)+'"><span class="z-image-search-thumb">'+productImage(item.product)+'</span><span class="z-image-search-copy"><strong>'+safe(item.product.title||"Product")+'</strong><small>'+money(item.product.price)+'</small></span><span class="z-image-search-score">'+Math.max(1,Math.round((1-item.score)*100))+'%</span></button>').join("");
   results.querySelectorAll("[data-image-result]").forEach(button=>button.addEventListener("click",()=>{
    const product=top.find(item=>String(item.product.id)===button.dataset.imageResult)?.product;
    if(product){overlay.remove();openProductDetails(product);}
   }));
  }
 }catch(error){
  console.error("ZUNE visual search:",error);
  status.textContent=language()==="sw"?"Imeshindikana kuchambua picha. Hakikisha picha na muunganisho viko sawa, kisha jaribu tena.":"Image matching failed. Check the image and connection, then try again.";
  results.innerHTML='<div class="z-image-search-empty">'+(language()==="sw"?"Tafadhali jaribu tena.":"Please try again.")+'</div>';
 }finally{run.disabled=false;run.textContent=language()==="sw"?"Tafuta bidhaa zinazofanana":"Find similar products";}
}
function showSearchImagePreview(file){
 if(!file)return;
 if(!file.type.startsWith("image/")){alert(language()==="sw"?"Chagua faili la picha.":"Please choose an image file.");return;}
 if(file.size>8*1024*1024){alert(language()==="sw"?"Picha iwe chini ya 8MB.":"Please choose an image under 8MB.");return;}
 const reader=new FileReader();
 reader.onload=()=>{
  document.getElementById("z-search-image-preview")?.remove();
  const previewUrl=String(reader.result),overlay=document.createElement("div");overlay.id="z-search-image-preview";overlay.className="z-search-image-preview";
  overlay.innerHTML='<section class="z-search-image-sheet" role="dialog" aria-modal="true" aria-label="Image search"><div class="z-search-sheet-head"><h3>'+(language()==="sw"?"Tafuta kwa picha":"Search by image")+'</h3><button type="button" class="z-search-sheet-close" aria-label="Close">×</button></div><img src="'+previewUrl+'" alt="Selected search image"><p class="z-search-image-note">'+(language()==="sw"?"Picha imechaguliwa. ZUNE italinganisha mwonekano wake na picha za bidhaa zilizopo.":"Image selected. ZUNE will compare its visual appearance with available product photos.")+'</p><div class="z-search-image-results"></div><button type="button" class="z-search-filter-apply" style="width:100%;min-height:46px;border:0;border-radius:12px" id="z-search-image-run">'+(language()==="sw"?"Tafuta bidhaa zinazofanana":"Find similar products")+'</button></section>';
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  overlay.querySelector(".z-search-sheet-close").addEventListener("click",close);
  overlay.querySelector("#z-search-image-run").addEventListener("click",()=>runVisualProductSearch(file,overlay,previewUrl));
 };
 reader.readAsDataURL(file);
}
function startVoiceSearch(input){
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SpeechRecognition){alert(language()==="sw"?"Kivinjari hiki hakitumii voice search. Jaribu Chrome.":"Voice search is not supported by this browser. Try Chrome.");return;}
 const recognition=new SpeechRecognition();recognition.lang=language()==="sw"?"sw-TZ":"en-TZ";recognition.interimResults=false;recognition.maxAlternatives=1;
 const button=document.getElementById("z-search-voice");button?.classList.add("is-listening");
 recognition.onresult=event=>{const transcript=event.results?.[0]?.[0]?.transcript||"";input.value=transcript;input.dispatchEvent(new Event("input",{bubbles:true}));};
 recognition.onerror=()=>alert(language()==="sw"?"Imeshindikana kusikia sauti. Ruhusu microphone kisha jaribu tena.":"Voice search failed. Allow microphone access and try again.");
 recognition.onend=()=>button?.classList.remove("is-listening");
 try{recognition.start();}catch(error){button?.classList.remove("is-listening");}
}

function bindSearchEvents() {
 const input=document.getElementById("z-home-search");if(!input)return;
 let searchTimeout,suggestionRequest=0;const suggestionProducts=new Map();const suggestionBox=document.getElementById("z-search-suggestions");
 const historyKey="zune_search_history:"+(homeState.user?.id||"guest");
 const readHistory=()=>{try{return JSON.parse(localStorage.getItem(historyKey)||"[]").filter(x=>typeof x==="string").slice(0,6);}catch(_){return[];}};
 const saveHistory=value=>{const q=String(value||"").trim();if(q.length<2)return;const next=[q,...readHistory().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,6);try{localStorage.setItem(historyKey,JSON.stringify(next));}catch(_){}};
 const closeSuggestions=()=>{suggestionBox?.classList.remove("open");input.setAttribute("aria-expanded","false");};
 const runSearch=async value=>{
  const q=String(value||"").trim();if(!q)return;
  clearTimeout(searchTimeout);input.value=q;homeState.search=q;homeState.selectedVendor="";homeState.selectedCategory="";homeState.page=0;homeState.products=[];homeState.hasMore=true;saveHistory(q);closeSuggestions();input.blur();await loadProducts(true);
 };
 const renderSuggestions=async()=>{
  if(!suggestionBox)return;const q=input.value.trim();const request=++suggestionRequest;
  if(q.length<2){const history=readHistory();suggestionBox.innerHTML=history.length?'<div class="z-search-suggestion" style="font-weight:800;cursor:default">'+(language()==="sw"?"Ulichotafuta hivi karibuni":"Recent searches")+'</div>'+history.map(item=>'<button type="button" class="z-search-suggestion" data-search-history="'+safe(item)+'">◷ <span>'+safe(item)+'</span></button>').join(""):"";suggestionBox.classList.toggle("open",history.length>0);input.setAttribute("aria-expanded",history.length?"true":"false");return;}
  const needle=q.toLowerCase();
  const localProducts=homeState.products.filter(p=>String(p.title||"").toLowerCase().includes(needle)).slice(0,5);
  const localStores=homeState.featuredStores.filter(st=>String(st.store_name||"").toLowerCase().includes(needle)).slice(0,3);
  suggestionBox.innerHTML='<div class="z-search-suggestion" style="cursor:default;color:#718078">'+(language()==="sw"?"Inatafuta...":"Searching...")+'</div>';suggestionBox.classList.add("open");input.setAttribute("aria-expanded","true");
  let products=localProducts,stores=localStores;
  try{
   const [pResult,sResult]=await Promise.all([
    supabase.from("products").select("*").ilike("title","%"+q.replace(/[,%()]/g," ")+"%").limit(5),
    supabase.from("stores").select("owner_id,store_name,verification_status,logo_url").ilike("store_name","%"+q.replace(/[,%()]/g," ")+"%").limit(3)
   ]);
   if(request!==suggestionRequest)return;
   if(!pResult.error){const byId=new Map(localProducts.map(p=>[String(p.id),p]));(pResult.data||[]).forEach(p=>byId.set(String(p.id),p));products=[...byId.values()].slice(0,5);}
   if(!sResult.error){const byId=new Map(localStores.map(st=>[String(st.owner_id),st]));(sResult.data||[]).forEach(st=>byId.set(String(st.owner_id),st));stores=[...byId.values()].slice(0,3);}
  }catch(error){console.warn("ZUNE search suggestions:",error.message);}
  if(request!==suggestionRequest)return;
  suggestionProducts.clear();products.forEach(p=>suggestionProducts.set(String(p.id),p));
  const productRows=products.map(p=>'<button type="button" class="z-search-suggestion" data-suggest-product="'+safe(p.id)+'">⌕ <span>'+safe(p.title||"Bidhaa")+'<small>'+money(p.price)+'</small></span></button>');
  const storeRows=stores.map(st=>{const name=st.store_name||"Duka";const initials=String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join("")||"Z";const logo=st.logo_url||st.store_logo_url||st.logo||"";const avatar=logo?'<img src="'+safe(logo)+'" alt="" loading="lazy" onerror="this.remove()">' : "";return '<button type="button" class="z-search-suggestion z-search-store-suggestion" data-suggest-store="'+safe(st.owner_id)+'"><span class="z-search-store-avatar">'+avatar+'<span class="z-search-store-fallback" '+''+' aria-hidden="true">'+safe(initials)+'</span></span><span>'+safe(name)+'<small>'+(language()==="sw"?"Duka":"Store")+(["verified","approved"].includes(String(st.verification_status||"").toLowerCase())?' · ✓ Verified':'')+'</small></span></button>';}).join("");
  const viewAll='<button type="button" class="z-search-suggestion" data-search-all="'+safe(q)+'" style="justify-content:center;color:#087a55;font-weight:800;border-top:1px solid #e6eee8">'+(language()==="sw"?"Ona matokeo yote ya “"+safe(q)+"” →":"View all results for “"+safe(q)+"” →")+'</button>';
  suggestionBox.innerHTML=(productRows.length?'<div class="z-search-suggestion" style="cursor:default;font-weight:800">'+(language()==="sw"?"Bidhaa":"Products")+'</div>'+productRows.join(""):"")+(storeRows.length?'<div class="z-search-suggestion" style="cursor:default;font-weight:800">'+(language()==="sw"?"Maduka":"Stores")+'</div>'+storeRows.join(""):"")+(productRows.length||storeRows.length?viewAll:'<div class="z-search-suggestion" style="cursor:default">'+(language()==="sw"?"Hakuna pendekezo. Bonyeza Enter kuona matokeo yote.":"No suggestions. Press Enter to see all results.")+'</div>'+viewAll);
 };
 input.addEventListener("input",()=>{
  renderSuggestions();clearTimeout(searchTimeout);
  searchTimeout=setTimeout(async()=>{const q=input.value.trim();if(q.length<2)return;homeState.search=q;homeState.selectedVendor="";homeState.selectedCategory="";homeState.products=[];homeState.page=0;homeState.hasMore=true;await loadProducts(true);},450);
 });
 suggestionBox?.addEventListener("click",event=>{
  const all=event.target.closest("[data-search-all]");if(all){runSearch(all.dataset.searchAll);return;}
  const history=event.target.closest("[data-search-history]");if(history){input.value=history.dataset.searchHistory;runSearch(history.dataset.searchHistory);return;}
  const p=event.target.closest("[data-suggest-product]");
  if(p){const product=suggestionProducts.get(String(p.dataset.suggestProduct))||homeState.products.find(x=>String(x.id)===p.dataset.suggestProduct);if(product)openProductDetails(product);else runSearch(input.value);closeSuggestions();return;}
  const st=event.target.closest("[data-suggest-store]");
  if(st){const ownerId=st.dataset.suggestStore;closeSuggestions();input.blur();if(ownerId)openStoreDetails(ownerId);}
 });
 input.addEventListener("keydown",event=>{
  if(event.key==="Escape"){closeSuggestions();return;}
  if(event.key==="Enter"){event.preventDefault();runSearch(input.value);}
 });
 document.addEventListener("click",event=>{if(!event.target.closest(".z-search-premium")&&!event.target.closest(".z-search-box"))closeSuggestions();},{passive:true});
 document.getElementById("z-search-filter")?.addEventListener("click",openSearchFilterSheet);
 document.getElementById("z-search-image")?.addEventListener("click",openSearchImagePicker);
 document.getElementById("z-search-image-file")?.addEventListener("change",event=>{showSearchImagePreview(event.target.files?.[0]);event.target.value="";});
 document.getElementById("z-search-voice")?.addEventListener("click",()=>startVoiceSearch(input));
}
 
// --------------------------------------------
// 21. HOME EVENTS
// --------------------------------------------

function bindHomeEvents() {
  bindCategoryEvents();
  bindSearchEvents();
  bindCarouselEvents();
  startCarouselAutoplay();
  loadLiveStoreStatuses();
  document.querySelector("[data-open-categories]")?.addEventListener("click", () => renderMarketplacePage("categories"));
  document.querySelector("[data-view-all-products]")?.addEventListener("click",()=>renderMarketplacePage("explore"));
  // Delegate clicks from the stable section so async status refreshes can
  // replace the store buttons without removing their click behavior.
  const featuredSection=document.getElementById("z-featured-stores-section");
  if(featuredSection&&!featuredSection.dataset.statusClickBound){
    featuredSection.dataset.statusClickBound="1";
    featuredSection.addEventListener("click",event=>{
      const button=event.target.closest("[data-featured-store]");
      if(!button||!featuredSection.contains(button))return;
      const ownerId=button.dataset.featuredStore;
      if(!ownerId)return;
      if(openStoreStatus(ownerId))return;
      openStoreDetails(ownerId);
    });
  }

  document.querySelector("[data-open-cart]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("cart");
    });

  updateProductArea();
  updateLoadStatus();
}

// --------------------------------------------
// 22. BOTTOM NAVIGATION
// --------------------------------------------

function ensureMarketplaceNavigationStyles() {
  if (document.getElementById("zune-marketplace-navigation-responsive")) return;
  const style = document.createElement("style");
  style.id = "zune-marketplace-navigation-responsive";
  style.textContent = `
    @media (min-width: 760px) {
      .z-marketplace { padding-top: 64px; }
      .z-marketplace .z-bottom-nav {
        top: 0; bottom: auto; left: 0; right: 0;
        justify-content: center; gap: 18px;
        padding: 9px 20px;
        border-top: 0; border-bottom: 1px solid var(--border, #e4ebe7);
        box-shadow: 0 6px 22px rgba(0,0,0,.07);
        backdrop-filter: blur(16px);
      }
      .z-marketplace .z-nav-item {
        flex: 0 0 auto; min-width: 94px; min-height: 44px;
        flex-direction: row; gap: 8px; font-size: 12px;
      }
      .z-marketplace .z-nav-icon { width: 32px; height: 30px; }
      .z-marketplace .z-home-header { top: 64px; }
    }
    @media (max-width: 759px) {
      .z-marketplace { padding-top: 0; }
      .z-marketplace .z-bottom-nav { top: auto; bottom: 0; }
      .z-marketplace .z-home-header { top: 0; }
    }
    .z-marketplace .z-nav-item[data-nav="live"] { font-weight: 850; }
  `;
  document.head.appendChild(style);
}

function renderBottomNavigation() {
  ensureMarketplaceNavigationStyles();
  const items = [
    {
      id: "home",
      label: tx("home"),
      icon: "home"
    },
    {
      id: "explore",
      label: tx("explore"),
      icon: "explore"
    },
    {
      id: "cart",
      label: tx("cart"),
      icon: "cart"
    },
    {
      id: "saved",
      label: tx("saved"),
      icon: "saved"
    },
    {
      id: "me",
      label: tx("me"),
      icon: "account"
    }
  ];

  return `
    <nav class="z-bottom-nav" aria-label="Main navigation">

      ${items.map(item => `
        <button
          type="button"
          class="z-nav-item ${
            homeState.activeTab === item.id ? "active" : ""
          }"
          data-nav="${item.id}"
        >

          <span class="z-nav-icon">

            ${zIcon(item.icon)}

            ${
              item.id === "cart"
                ? `<span class="z-cart-badge" data-cart-count hidden>0</span>`
                : ""
            }

          </span>

          <span>${item.label}</span>

        </button>
      `).join("")}

    </nav>
  `;
}

// --------------------------------------------
// 23. NAVIGATION EVENTS
// --------------------------------------------

function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.nav;

      // Account is a dedicated standalone page.
      if (page === "me") {
        window.location.assign("./account.html");
        return;
      }
      if (page === "live" && !window.location.pathname.endsWith("/live.html")) {
        window.location.assign("./live.html?tab=live");
        return;
      }
      if (page !== "live" && window.location.pathname.endsWith("/live.html")) {
        window.location.assign("./index.html?tab=" + encodeURIComponent(page));
        return;
      }

      renderMarketplacePage(page);
    });
  });
}

// --------------------------------------------
// 24. INFINITE SCROLL
// --------------------------------------------

function observeInfiniteScroll() {
  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
  }

  const trigger = document.getElementById("z-scroll-trigger");

  if (!trigger || !("IntersectionObserver" in window)) {
    return;
  }

  homeState.observer = new IntersectionObserver(entries => {
    const entry = entries[0];

    if (
      entry.isIntersecting &&
      !homeState.loading &&
      homeState.hasMore &&
      !homeState.loadError
    ) {
      loadProducts(false);
    }

  }, {
    root: null,
    rootMargin: "350px",
    threshold: 0
  });

  homeState.observer.observe(trigger);
}

// --------------------------------------------
// 25. EXPLORE PAGE
// --------------------------------------------

function categoryImage(categoryName, index = 0) {
  const name = String(categoryName || "").toLowerCase();
  const photoRules = [
    [/fashion|clothing|apparel|nguo|mavazi/i, "photo-1483985988355-763728e1935b"],
    [/electronic|simu|phone|computer|kompyuta|gadget|tv/i, "photo-1511707171634-5f897ff02aa9"],
    [/beauty|makeup|cosmetic|urembo|skincare|ngozi/i, "photo-1596462502278-27bfdc403348"],
    [/home|nyumbani|samani|furniture|kitchen|jikoni|decor/i, "photo-1600210492486-724fe5c67fb0"],
    [/shoe|viatu|sneaker|boot|sandal/i, "photo-1542291026-7eec264c27ff"],
    [/food|vyakula|grocery|chakula|matunda|mboga/i, "photo-1542838132-92c53300491e"],
    [/sport|fitness|mazoezi|gym/i, "photo-1461896836934-ffe607ba8211"],
    [/accessor|watch|saa|bag|mkoba|jewelry|jewellery/i, "photo-1523275335684-37898b6baf30"],
    [/baby|mtoto|kids|watoto|toy|chezea/i, "photo-1516627145497-ae6968895b74"],
    [/book|kitabu|stationery|school|elimu/i, "photo-1507842217343-583bb7270b66"],
    [/car|auto|gari|motor|pikipiki|spare/i, "photo-1503376780353-7e6692767b70"],
    [/health|afya|medical|dawa/i, "photo-1576091160399-112ba8d25d1d"]
  ];
  const matched = photoRules.find(([pattern]) => pattern.test(name));
  const fallback = [
    "photo-1523275335684-37898b6baf30",
    "photo-1529139574466-a303027c1d8b",
    "photo-1490481651871-ab68de25d43d",
    "photo-1542291026-7eec264c27ff",
    "photo-1511707171634-5f897ff02aa9",
    "photo-1600210492486-724fe5c67fb0",
    "photo-1596462502278-27bfdc403348",
    "photo-1542838132-92c53300491e"
  ];
  const photoId = matched ? matched[1] : fallback[index % fallback.length];
  return "https://images.unsplash.com/" + photoId + "?auto=format&fit=crop&w=520&q=82";
}

function renderCategoriesPage() {
  const categories = homeState.categories || [];
  return `
    <section class="z-home z-all-categories-page">
      <header class="z-home-header">
        <div class="z-home-top">
          <div class="zune-logo">ⓏⓊⓃⒺ</div>
          <button type="button" class="z-all-categories" data-back-home>← ${tx("explore")}</button>
        </div>
        <label class="z-search-box z-category-search">
          ${zIcon("search")}
          <input id="z-all-categories-search" type="search" placeholder="${language()==="sw"?"Tafuta kundi...":"Search categories..."}">
        </label>
      </header>
      <main class="z-home-content">
        <div class="z-category-page-intro">
          <span>${language()==="sw"?"GUNDUA ZUNE":"DISCOVER ZUNE"}</span>
          <h1 class="z-page-title">${tx("categories")}</h1>
          <p>${language()==="sw"?"Chagua kundi ili kuona bidhaa zake.":"Choose a category to explore its products."}</p>
        </div>
        <div class="z-categories-image-grid" id="z-all-categories-grid">
          ${categories.map((category,index) => `
            <button type="button" class="z-category-image-card" data-category-page="${safe(category.name)}" data-category-name="${safe(category.name.toLowerCase())}">
              <img src="${categoryImage(category.name,index)}" alt="${safe(category.name)}" loading="lazy" decoding="async">
              <span class="z-category-image-shade"></span>
              <strong>${safe(category.name)}</strong>
              <span class="z-category-image-arrow">↗</span>
            </button>
          `).join("")}
        </div>
        ${categories.length ? "" : `<div class="z-empty-state" style="margin-top:14px">${tx("empty")}</div>`}
      </main>
    </section>
  `;
}

function bindCategoriesPage() {
  document.querySelectorAll("[data-category-page]").forEach(button => {
    button.addEventListener("click", async () => {
      homeState.selectedCategory = button.dataset.categoryPage || "";
      homeState.selectedVendor = "";
      homeState.search = "";
      homeState.page = 0;
      homeState.products = [];
      homeState.hasMore = true;
      await renderMarketplacePage("explore");
      await loadProducts(true);
    });
  });
  const search = document.getElementById("z-all-categories-search");
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll("[data-category-name]").forEach(card => {
      card.hidden = !card.dataset.categoryName.includes(query);
    });
  });
  document.querySelector("[data-back-home]")?.addEventListener("click", () => {
    renderMarketplacePage("explore");
  });
}

function renderExplorePage() {
  const categories = (homeState.categories || []).slice(0, 8);
  return `
    <section class="z-home z-explore-redesign">
      <header class="z-home-header">
        <div class="z-home-top">
          <div class="zune-logo">ⓏⓊⓃⒺ</div>
        </div>
        <label class="z-search-box">
          ${zIcon("search")}
          <input id="z-explore-search" type="search" placeholder="${tx("search")}" value="${safe(homeState.search)}">
        </label>
      </header>
      <main class="z-home-content">
        <div class="z-explore-intro">
          <span>${language()==="sw"?"GUNDUA ZUNE":"DISCOVER ZUNE"}</span>
          <h1 class="z-page-title">${tx("exploreTitle")}</h1>
          <p>${language()==="sw"?"Bidhaa na maduka unayoweza kuyapenda.":"Products and stores worth discovering."}</p>
        </div>

        <section class="z-explore-categories-section">
          <div class="z-section-heading z-explore-section-heading">
            <h2>${tx("categories")}</h2>
            <button type="button" class="z-explore-see-all" id="z-explore-see-all">${language()==="sw"?"Angalia Zote":"View all"} <span>→</span></button>
          </div>
          <div id="z-explore-category-area" class="z-explore-category-grid">
            ${categories.map((category,index) => `
              <button type="button" class="z-explore-category-card ${String(homeState.selectedCategory)===String(category.name)?"active":""}" data-category="${safe(category.name)}">
                <img src="${categoryImage(category.name,index)}" alt="${safe(category.name)}" loading="lazy" decoding="async">
                <span class="z-explore-category-shade"></span>
                <strong>${safe(category.name)}</strong>
              </button>
            `).join("")}
          </div>
        </section>

        <section id="z-explore-sponsored-section" class="z-explore-sponsored-section">
          <div class="z-section-heading"><h2>${language()==="sw"?"Matangazo Yanayokufaa":"Sponsored for You"}</h2></div>
          <div id="z-explore-sponsored-products" class="z-sponsored-products"></div>
        </section>

        <div class="z-explore-products-heading">
          <h2>${language()==="sw"?"Bidhaa za kugundua":"Discover products"}</h2>
        </div>
        <div id="z-product-area">
          ${homeState.products.length ? `<div class="z-product-grid">${homeState.products.map(productCard).join("")}</div>` : ""}
        </div>
        <div class="z-load-status" id="z-load-status"></div>
        <div id="z-scroll-trigger"></div>
      </main>
    </section>
  `;
}

// --------------------------------------------
// 26. EXPLORE EVENTS
// --------------------------------------------

function bindExploreEvents() {
  const categoryArea = document.getElementById("z-explore-category-area");
  categoryArea?.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", async () => {
      homeState.selectedCategory = button.dataset.category || "";
      homeState.selectedVendor = "";
      homeState.search = "";
      homeState.products = [];
      homeState.page = 0;
      homeState.hasMore = true;
      await loadProducts(true);
      categoryArea.querySelectorAll("[data-category]").forEach(item => {
        item.classList.toggle("active", item.dataset.category === homeState.selectedCategory);
      });
    });
  });
  document.getElementById("z-explore-see-all")?.addEventListener("click", () => {
    renderMarketplacePage("categories");
  });
  const input = document.getElementById("z-explore-search");
  if (input) {
    let searchTimeout;
    input.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        homeState.search = input.value.trim();
        homeState.selectedCategory = "";
        homeState.products = [];
        homeState.page = 0;
        homeState.hasMore = true;
        await loadProducts(true);
      }, 450);
    });
  }
  updateProductArea();
  updateLoadStatus();
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 3/4
// SEHEMU YA 4/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 4/4
// ============================================

// --------------------------------------------
// 27. CART PAGE
// --------------------------------------------

function renderCartPage() {
  if (!cartModule) return `<section class="z-cart-loading" role="status" aria-live="polite"><p>Inapakia kikapu...</p></section>`;
  return cartModule.renderCartPage({
    cart: homeState.cart,
    products: homeState.cartProducts,
    language: language(),
    loading: homeState.cartProductsLoading,
    error: homeState.cartProductsError
  });
}

function bindCartEvents() {
  if (!cartModule) return;
  cartModule.bindCartEvents(document, {
    onQuantityChange: (productId, change) => {
      changeCartQuantity(productId, change);
      renderMarketplacePage("cart");
    },
    onRemove: productId => {
      removeCartItem(productId);
      renderMarketplacePage("cart");
    },
    onContinueShopping: () => renderMarketplacePage("home"),
    onCheckout: () => window.location.assign("./checkout.html"),
    onRetry: () => {
      homeState.cartProductsKey = "";
      homeState.cartProductsLoading = false;
      homeState.cartProductsError = false;
      renderMarketplacePage("cart");
    }
  });

  const key = homeState.cart.map(item => homeCartItemKey(item)).sort().join("|");
  if (key === homeState.cartProductsKey || homeState.cartProductsLoading) return;

  homeState.cartProductsLoading = true;
  homeState.cartProductsError = false;
  cartModule.loadCartProducts(homeState.cart).then(products => {
    homeState.cartProducts = products;
    homeState.cartProductsKey = key;
  }).catch(error => {
    console.error("ZUNE cart products error:", error);
    homeState.cartProductsError = true;
    homeState.cartProductsKey = key;
  }).finally(() => {
    homeState.cartProductsLoading = false;
    if (homeState.activeTab === "cart") renderMarketplacePage("cart");
  });
}

// --------------------------------------------
// LIVE SHOPPING — MARKETPLACE PAGE
// --------------------------------------------

function ensureLiveShoppingStyles() {
  if (document.getElementById("zune-live-shopping-page-styles")) return;
  const style = document.createElement("style");
  style.id = "zune-live-shopping-page-styles";
  style.textContent = `
    .z-live-page{max-width:1180px;margin:0 auto;padding:20px 15px 125px}
    .z-live-hero{position:relative;overflow:hidden;padding:26px 22px;border-radius:24px;background:radial-gradient(circle at 85% 15%,rgba(255,255,255,.2),transparent 32%),linear-gradient(135deg,#062f25,#087a55 58%,#0b9a68);color:#fff;box-shadow:0 16px 35px rgba(5,75,48,.2)}
    .z-live-kicker{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff18;font-size:10px;font-weight:900;letter-spacing:1.4px}
    .z-live-pulse{width:8px;height:8px;border-radius:50%;background:#ff4b55;box-shadow:0 0 0 5px #ff4b5530}
    .z-live-hero h1{margin:15px 0 8px;font-size:clamp(27px,5vw,42px);font-weight:950;line-height:1.08;letter-spacing:-1px;color:#fff}
    .z-live-hero p{max-width:560px;color:#e0f3e9;font-size:13px;line-height:1.6}
    .z-live-section{margin-top:24px}
    .z-live-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
    .z-live-section-head h2{font-size:17px;font-weight:900}
    .z-live-section-head span{color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:1px}
    .z-live-empty{display:flex;align-items:center;gap:14px;padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow)}
    .z-live-empty-icon{width:48px;height:48px;flex:0 0 48px;display:grid;place-items:center;border-radius:15px;background:color-mix(in srgb,var(--primary) 10%,var(--surface));color:var(--primary);font-size:23px}
    .z-live-empty strong{display:block;margin-bottom:4px;font-size:13px}
    .z-live-empty p{color:var(--text-muted);font-size:11px;line-height:1.5}
    .z-live-page .z-live-tabs{display:flex;gap:8px;overflow:auto;padding:2px 0 5px}
    .z-live-page .z-live-tab{flex:0 0 auto;padding:9px 13px;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--text);font-size:11px;font-weight:800}
    .z-live-page .z-live-tab.active{border-color:var(--primary);background:var(--primary);color:#fff}
    .z-live-refresh{margin-top:12px;padding:11px 16px;border:1px solid #ffffff55;border-radius:12px;background:#ffffff1c;color:#fff;font-size:12px;font-weight:900;cursor:pointer;backdrop-filter:blur(10px)}
    .z-live-refresh:hover{background:#ffffff30;transform:translateY(-1px)}
    .z-live-broadcast-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:14px}
    .z-live-broadcast-card{min-width:0;overflow:hidden;padding:16px;border:1px solid var(--border);border-radius:20px;background:linear-gradient(145deg,var(--surface),color-mix(in srgb,var(--surface) 90%,var(--primary) 10%));box-shadow:var(--shadow);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
    .z-live-broadcast-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--primary) 45%,var(--border));box-shadow:0 14px 30px rgba(0,0,0,.09)}
    .z-live-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
    .z-live-status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:color-mix(in srgb,var(--primary) 10%,var(--surface));color:var(--primary);font-size:9px;font-weight:950;letter-spacing:.6px}
    .z-live-status.is-live{background:#e9233d18;color:#e9233d}
    .z-live-status.is-past{background:color-mix(in srgb,var(--text-muted) 12%,var(--surface));color:var(--text-muted)}
    .z-live-card-date{color:var(--text-muted);font-size:10px;font-weight:700;text-align:right}
    .z-live-broadcast-card h3{margin:0 0 6px;color:var(--text);font-size:16px;font-weight:900;line-height:1.35}
    .z-live-store-name{margin:0 0 8px;color:var(--primary);font-size:11px;font-weight:850}
    .z-live-description{margin:0 0 12px;color:var(--text-muted);font-size:11px;line-height:1.55}
    .z-live-card-actions{display:flex;align-items:center;gap:8px;margin-top:14px}
    .z-live-watch-button{width:100%;padding:11px 14px;border:0;border-radius:12px;background:var(--primary);color:#fff;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 7px 16px color-mix(in srgb,var(--primary) 22%,transparent)}
    .z-live-watch-button:hover{filter:brightness(1.08);transform:translateY(-1px)}
    .z-live-player-panel{margin:22px 0;padding:16px;border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:var(--shadow)}
    .z-live-player-panel>.z-live-section-head h2{font-size:19px;font-weight:950}
    #z-live-close-player{padding:8px 11px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-weight:800}
    .z-live-video-wrap{position:relative;width:100%;overflow:hidden;aspect-ratio:16/9;border-radius:16px;background:#050807;box-shadow:0 12px 30px rgba(0,0,0,.2)}
    .z-live-video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    .z-live-player-store{margin:12px 0 4px;color:var(--text-muted);font-size:12px}
    .z-live-pinned-products{margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}
    .z-live-pinned-products>strong{display:block;margin-bottom:10px;font-size:12px;font-weight:900}
    .z-live-product-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:9px}
    .z-live-product{display:flex;align-items:center;gap:10px;min-width:0;padding:9px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
    .z-live-product>img{width:54px;height:54px;flex:0 0 54px;object-fit:cover;border-radius:10px;background:var(--border)}
    .z-live-product-info{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}
    .z-live-product-info b{overflow:hidden;color:var(--text);font-size:11px;text-overflow:ellipsis;white-space:nowrap}
    .z-live-product-info span{color:var(--primary);font-size:11px;font-weight:900}
    .z-live-product>button{width:32px;height:32px;flex:0 0 32px;border:0;border-radius:10px;background:var(--primary);color:#fff;font-size:20px;font-weight:900}
    .z-live-feed-error{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:13px;border:1px solid #e5484d55;border-radius:14px;background:#e5484d0c;color:var(--text);font-size:11px}
    .z-live-feed-error button{padding:8px 11px;border:0;border-radius:9px;background:var(--primary);color:#fff;font-weight:850}
    @media(max-width:520px){.z-live-page{padding:14px 12px 110px}.z-live-hero{padding:22px 17px;border-radius:20px}.z-live-player-panel{padding:11px;border-radius:17px}.z-live-broadcast-grid{grid-template-columns:1fr}.z-live-broadcast-card{padding:14px}}
    .z-live-player-meta{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 16px;color:var(--text-muted);font-size:12px}
    .z-live-player-meta strong{color:var(--text);font-weight:900}
    .z-live-viewer-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
    .z-live-viewer-controls button{border:1px solid var(--border);border-radius:999px;padding:9px 13px;background:var(--surface);color:var(--text);font-size:12px;font-weight:850;cursor:pointer}
    .z-live-viewer-controls button.primary{background:var(--primary);border-color:var(--primary);color:#fff}
    .z-live-viewer-controls button.liked{background:#fff0f3;border-color:#ef476f;color:#d62958}
    .z-live-swipe-hint{margin:5px 0 0;color:var(--text-muted);font-size:10px;text-align:center}
    .z-live-mini-player{position:fixed;z-index:9998;right:14px;bottom:88px;width:min(310px,calc(100vw - 28px));padding:9px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 18px 48px #0005}
    .z-live-mini-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:11px}
    .z-live-mini-head>div{display:flex;gap:5px}
    .z-live-mini-head button{width:28px;height:26px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-weight:900}
    .z-live-mini-video{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:10px;background:#050505}
    .z-live-mini-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    .z-live-gift-count{font-size:10px;color:var(--primary);font-weight:900}
    .z-live-video-wrap{touch-action:pan-y}
    .z-live-chat-panel{margin:18px 0;padding:14px;border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow)}
    .z-live-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .z-live-chat-head h3{font-size:15px;font-weight:900}
    .z-live-chat-head span,.z-live-chat-note{color:var(--text-muted);font-size:10px}
    .z-live-chat-desktop iframe{display:block;width:100%;height:430px;border:0;border-radius:12px;background:#fff}
    .z-live-chat-mobile{display:none}
    .z-live-chat-mobile>button{width:100%;padding:12px 14px;border:0;border-radius:12px;background:var(--primary);color:#fff;text-align:center;font-size:12px;font-weight:900;cursor:pointer}
    .z-live-chat-mobile-panel[hidden]{display:none!important}
    .z-live-chat-mobile-panel iframe{display:block;width:100%;height:min(55svh,480px);min-height:320px;margin-top:10px;border:0;border-radius:12px;background:#fff}
    .z-live-chat-mobile-panel>a{display:inline-flex;margin-top:8px;padding:9px 12px;border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:11px;font-weight:850;text-decoration:none}
    .z-live-chat-note{margin-top:9px;line-height:1.5}
    @media(max-width:759px){.z-live-chat-desktop{display:none}.z-live-chat-mobile{display:block}}
    @media(min-width:760px){.z-live-page{padding:28px 24px 60px}.z-live-hero{padding:38px}.z-live-empty{padding:22px}}
    /* Immersive, one-stream-at-a-time viewer. The close control returns to the Live directory. */
    .z-live-immersive{background:#050807!important;color:#fff!important}
    .z-live-immersive .z-live-page{max-width:100%;min-height:calc(100svh - 70px);padding:0 0 24px}
    .z-live-immersive .z-live-hero,.z-live-immersive>.z-live-page>.z-live-tabs,.z-live-immersive .z-live-section{display:none!important}
    .z-live-immersive .z-live-player-panel{position:relative;display:flex;flex-direction:column;gap:10px;min-height:calc(100svh - 82px);margin:0;padding:12px 12px 22px;border:0;border-radius:0;background:#050807;color:#fff;box-shadow:none}
    .z-live-immersive .z-live-player-panel>.z-live-section-head{position:sticky;top:0;z-index:4;margin:0;padding:5px 0 9px;background:#050807}
    .z-live-immersive .z-live-player-panel>.z-live-section-head h2{color:#fff;font-size:16px;line-height:1.3}
    .z-live-immersive #z-live-close-player{flex:0 0 auto;border-color:#ffffff44;background:#ffffff18;color:#fff}
    .z-live-immersive .z-live-video-wrap{flex:1 0 auto;min-height:min(58svh,620px);max-height:72svh;aspect-ratio:auto;border-radius:16px}
    .z-live-immersive .z-live-player-store,.z-live-immersive .z-live-player-meta{color:#e3eee8}
    .z-live-immersive .z-live-viewer-controls{display:flex;flex-wrap:wrap;gap:7px}
    .z-live-immersive .z-live-viewer-controls button{min-height:39px;padding:8px 11px;border:1px solid #ffffff38;border-radius:999px;background:#ffffff16;color:#fff;font-size:11px;font-weight:850}
    .z-live-immersive .z-live-viewer-controls button.liked{background:#d92e5b;border-color:#d92e5b}
    .z-live-immersive .z-live-swipe-hint{color:#d6e6dd;font-size:10px;line-height:1.5}
    .z-live-immersive .z-live-gift-count{display:block;margin-top:4px;color:#8de2ba}
    .z-live-immersive .z-live-chat-panel{margin:8px 0 0;background:#101915;border-color:#ffffff25;color:#fff}
    .z-live-immersive .z-live-chat-head h3{color:#fff}
    .z-live-immersive .z-live-chat-head span,.z-live-immersive .z-live-chat-note{color:#c1d1c8}
    .z-live-immersive .z-live-pinned-products{border-color:#ffffff28}
    .z-live-immersive .z-live-pinned-products>strong{color:#fff}
    .z-live-immersive .z-live-product{background:#101915;border-color:#ffffff25}
    .z-live-immersive .z-live-product-info b{color:#fff}
    @media(max-width:759px){
      .z-live-immersive .z-live-page{padding-bottom:12px}
      .z-live-immersive .z-live-player-panel{min-height:calc(100svh - 62px);padding:9px 10px 18px}
      .z-live-immersive .z-live-video-wrap{min-height:52svh;max-height:66svh}
      .z-live-immersive .z-live-viewer-controls button{flex:1 1 calc(33.333% - 7px)}
    }
    @media(prefers-reduced-motion:reduce){.z-live-immersive *{scroll-behavior:auto!important;transition:none!important}}
  `;
  document.head.appendChild(style);
}

function liveBroadcastCard(item, sw) {
  const storeName = safe(item.store?.name || "ZUNE Seller");
  const products = Array.isArray(item.products) ? item.products : [];
  const dateValue = item.section === "live" ? item.actual_start_time : item.scheduled_start_time;
  const dateLabel = dateValue ? new Date(dateValue).toLocaleString(sw ? "sw-TZ" : "en-TZ", { dateStyle:"medium", timeStyle:"short" }) : "";
  const isLive = item.section === "live";
  const isPast = item.section === "past";
  return `
    <article class="z-live-broadcast-card">
      <div class="z-live-card-top">
        <span class="z-live-status ${isLive ? "is-live" : isPast ? "is-past" : "is-upcoming"}">${isLive ? "● LIVE NOW" : isPast ? (sw ? "IMEMALIZIKA" : "ENDED") : (sw ? "INAYOKUJA" : "UPCOMING")}</span>
        <span class="z-live-card-date">${safe(dateLabel)}</span>
      </div>
      <h3>${safe(item.title)}</h3>
      <p class="z-live-store-name">${storeName}</p>
      ${item.description ? `<p class="z-live-description">${safe(item.description)}</p>` : ""}
      <div class="z-live-card-actions">
        <button type="button" class="z-live-watch-button" data-live-watch="${safe(item.id)}">${isPast ? (sw ? "Tazama rekodi" : "Watch replay") : isLive ? (sw ? "Tazama Live" : "Watch Live") : (sw ? "Angalia taarifa" : "View details")}</button>
      </div>
      ${products.length ? `
        <div class="z-live-pinned-products">
          <strong>${sw ? "Bidhaa kwenye matangazo" : "Products in this Live"}</strong>
          <div class="z-live-product-row">
            ${products.map(product => `
              <div class="z-live-product">
                ${product.image_url ? `<img src="${safe(product.image_url)}" alt="${safe(product.title)}" loading="lazy">` : ""}
                <div class="z-live-product-info"><b>${safe(product.title)}</b><span>${money(product.price)}</span></div>
                <button type="button" data-live-add-product="${safe(product.id)}" aria-label="${sw ? "Ongeza kikapuni" : "Add to cart"}">+</button>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </article>
  `;
}

function preserveLiveMiniPlayer() {
  const player = document.querySelector("#z-live-player .z-live-video-wrap iframe");
  if (!player) return;
  let mini = document.getElementById("z-live-mini-player");
  if (!mini) {
    mini = document.createElement("aside");
    mini.id = "z-live-mini-player";
    mini.className = "z-live-mini-player";
    mini.innerHTML = `<div class="z-live-mini-head"><strong>${language()==="sw"?"ZUNE Live inaendelea":"ZUNE Live is playing"}</strong><div><button type="button" data-mini-expand aria-label="Expand Live">↗</button><button type="button" data-mini-close aria-label="Close Live">×</button></div></div><div class="z-live-mini-video"></div>`;
    document.body.appendChild(mini);
  }
  mini.querySelector(".z-live-mini-video")?.appendChild(player);
  homeState.liveMiniPlayer = true;
}

function renderLiveMiniPlayer() {
  if (!homeState.liveMiniPlayer) return;
  const mini = document.getElementById("z-live-mini-player");
  if (!mini) return;
  mini.querySelector("[data-mini-expand]")?.addEventListener("click", () => renderMarketplacePage("live"));
  mini.querySelector("[data-mini-close]")?.addEventListener("click", () => closeLiveMiniPlayer(true));
}

function closeLiveMiniPlayer(clearSelection = true) {
  document.getElementById("z-live-mini-player")?.remove();
  homeState.liveMiniPlayer = false;
  if (clearSelection) homeState.liveSelectedId = "";
}

function moveLiveSelection(direction) {
  const liveItems = (homeState.liveBroadcasts || []).filter(item => item.section === "live");
  if (liveItems.length < 2) return;
  const currentIndex = liveItems.findIndex(item => String(item.id) === String(homeState.liveSelectedId));
  const nextIndex = (Math.max(0, currentIndex) + direction + liveItems.length) % liveItems.length;
  homeState.liveSelectedId = String(liveItems[nextIndex].id);
  renderMarketplacePage("live");
  document.getElementById("z-live-player")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderLivePage() {
  ensureLiveShoppingStyles();
  const sw = language() === "sw";
  const items = homeState.liveBroadcasts || [];
  const selected = items.find(item => String(item.id) === String(homeState.liveSelectedId));
  const live = items.filter(item => item.section === "live");
  const upcoming = items.filter(item => item.section === "upcoming");
  const past = items.filter(item => item.section === "past");
  const section = (id, title, subtitle, rows, empty) => `
    <section class="z-live-section" id="z-live-section-${id}">
      <div class="z-live-section-head"><h2>${title}</h2><span>${subtitle}</span></div>
      ${rows.length ? `<div class="z-live-broadcast-grid">${rows.map(item => liveBroadcastCard(item, sw)).join("")}</div>` : `<div class="z-live-empty"><span class="z-live-empty-icon">${id==="now"?"●":id==="upcoming"?"◷":"↺"}</span><div><strong>${sw ? "Hakuna matangazo kwa sasa" : "Nothing to show yet"}</strong><p>${empty}</p></div></div>`}
    </section>`;
  const selectedProducts = selected?.products || [];
  const videoId = /^[a-zA-Z0-9_-]{6,20}$/.test(selected?.youtube_video_id || "") ? selected.youtube_video_id : "";
  return `
    <section class="z-home z-live-shopping ${selected?.section === "live" ? "z-live-immersive" : ""}"><main class="z-live-page">
      <header class="z-live-hero">
        <span class="z-live-kicker"><i class="z-live-pulse"></i> ZUNE LIVE SHOPPING</span>
        <h1>${sw ? "Nunua ukiwa unatazama Live." : "Shop while you watch Live."}</h1>
        <p>${sw ? "Tazama wauzaji wakionyesha bidhaa moja kwa moja, uliza maswali na gundua bidhaa unazoweza kununua." : "Watch sellers showcase products, ask questions and discover items you can buy."}</p>
        <button type="button" class="z-live-refresh" id="z-live-refresh">${sw ? "↻ Sasisha matangazo" : "↻ Refresh broadcasts"}</button>
      </header>
      <nav class="z-live-tabs" aria-label="Live sections">
        <button type="button" class="z-live-tab" data-live-scroll="now">${sw ? "Live sasa" : "Live now"} (${live.length})</button>
        <button type="button" class="z-live-tab" data-live-scroll="upcoming">${sw ? "Yanayokuja" : "Upcoming"} (${upcoming.length})</button>
        <button type="button" class="z-live-tab" data-live-scroll="past">${sw ? "Zilizopita" : "Past"} (${past.length})</button>
      </nav>
      ${homeState.liveLoading && !homeState.liveLoaded ? `<div class="z-live-empty"><div><strong>${sw ? "Inapakia matangazo..." : "Loading broadcasts..."}</strong></div></div>` : ""}
      ${homeState.liveError ? `<div class="z-live-feed-error" role="alert">${safe(homeState.liveError)} <button type="button" id="z-live-retry">${sw ? "Jaribu tena" : "Try again"}</button></div>` : ""}
      ${selected ? `
        <section class="z-live-player-panel" id="z-live-player">
          <div class="z-live-section-head z-live-swipe-zone" data-live-swipe-zone tabindex="0" role="group" aria-label="${sw ? "Eneo la kubadilisha matangazo ya Live" : "Live stream navigation area"}"><h2>${safe(selected.title)}</h2><button type="button" id="z-live-close-player">${sw ? "Funga" : "Close"} ×</button></div>
          ${videoId ? `<div class="z-live-video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0" title="${safe(selected.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>` : `<p>${sw ? "Video ya matangazo haya haipatikani kwa sasa." : "The video for this broadcast is not available yet."}</p>`}
          <p class="z-live-player-store">${sw ? "Duka:" : "Store:"} <strong>${safe(selected.store?.name || "ZUNE Seller")}</strong></p>
          <div class="z-live-player-meta">
            <span>👁 ${sw ? "Watazamaji:" : "Viewers:"} <strong>${selected.concurrent_viewers == null ? (sw ? "Haipatikani" : "Unavailable") : new Intl.NumberFormat(sw ? "sw-TZ" : "en-TZ").format(Number(selected.concurrent_viewers))}</strong></span>
          </div>
          ${selected.section === "live" ? `
            <div class="z-live-viewer-controls" aria-label="Live viewer controls">
              <button type="button" data-live-prev>↑ ${sw ? "Live iliyotangulia" : "Previous Live"}</button>
              <button type="button" data-live-next>↓ ${sw ? "Live inayofuata" : "Next Live"}</button>
              <button type="button" data-live-like class="${homeState.liveLikedIds.has(String(selected.id)) ? "liked" : ""}">${homeState.liveLikedIds.has(String(selected.id)) ? "♥" : "♡"} ${sw ? "Penda" : "Like"}</button>
              <button type="button" data-live-gift="👏">👏 ${sw ? "Makofi" : "Applause"}</button>
              <button type="button" data-live-gift="⭐">⭐ ${sw ? "Nyota" : "Star"}</button>
              <button type="button" data-live-gift="❤️">❤️ ${sw ? "Moyo" : "Heart"}</button>
            </div>
            <p class="z-live-swipe-hint">${sw ? "Telezesha juu kuona Live inayofuata, au chini kurudi iliyotangulia." : "Swipe up for the next Live, or down for the previous one."} <span class="z-live-gift-count" id="z-live-gift-count">${Number(homeState.liveGiftCounts[String(selected.id)] || 0)} ${sw ? "zawadi za bure zimetumwa kwenye kipindi hiki" : "free gifts sent in this session"}</span></p>
          ` : ""}
          ${selected.section === "live" && videoId ? `
            <section class="z-live-chat-panel" aria-label="YouTube Live Chat">
              <div class="z-live-chat-head"><h3>💬 ${sw ? "Mazungumzo ya Live" : "Live chat"}</h3><span>${sw ? "Mazungumzo ya YouTube" : "YouTube chat"}</span></div>
              <div class="z-live-chat-desktop">
                <iframe src="https://www.youtube.com/live_chat?v=${videoId}&embed_domain=mrnehemiah.github.io" title="YouTube Live Chat" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
              </div>
              <div class="z-live-chat-mobile">
                <button type="button" data-live-chat-toggle aria-expanded="false">${sw ? "Fungua mazungumzo ndani ya ZUNE ↓" : "Open chat inside ZUNE ↓"}</button>
                <div class="z-live-chat-mobile-panel" data-live-chat-panel hidden>
                  <iframe data-live-chat-frame data-src="https://www.youtube.com/live_chat?is_popout=1&v=${safe(videoId)}&embed_domain=mrnehemiah.github.io" src="about:blank" title="YouTube Live Chat" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                  <a href="https://www.youtube.com/live_chat?v=${safe(videoId)}" target="_blank" rel="noopener noreferrer">${sw ? "Fungua kwenye YouTube ikiwa chat haionekani" : "Open in YouTube if chat does not load"} ↗</a>
                </div>
              </div>
              <p class="z-live-chat-note">${sw ? "Ingia kwenye akaunti ya YouTube ili kutuma ujumbe. Ikiwa iframe haitumiki kwenye kifaa chako, tumia kiungo cha YouTube." : "Sign in to YouTube to send messages. If the embedded chat is not supported on your device, use the YouTube link."}</p>
            </section>` : ""}
          ${selectedProducts.length ? `<div class="z-live-pinned-products"><strong>${sw ? "Nunua bidhaa zinazoonyeshwa" : "Shop featured products"}</strong><div class="z-live-product-row">${selectedProducts.map(product => `<div class="z-live-product">${product.image_url ? `<img src="${safe(product.image_url)}" alt="${safe(product.title)}" loading="lazy">` : ""}<div class="z-live-product-info"><b>${safe(product.title)}</b><span>${money(product.price)}</span></div><button type="button" data-live-add-product="${safe(product.id)}">+</button></div>`).join("")}</div></div>` : ""}
        </section>` : ""}
      ${section("now", sw ? "LIVE SASA" : "LIVE NOW", sw ? "MATANGAZO YANAYOENDELEA" : "STREAMING RIGHT NOW", live, sw ? "Matangazo ya moja kwa moja yataonekana hapa yakianza." : "Public broadcasts will appear here when sellers go live.")}
      ${section("upcoming", sw ? "YANAYOKUJA" : "UPCOMING", sw ? "RATIBA YA MATANGAZO" : "SCHEDULED BROADCASTS", upcoming, sw ? "Matangazo ya umma yaliyopangwa yataonekana hapa." : "Upcoming public broadcasts will appear here.")}
      ${section("past", sw ? "ZILIZOPITA" : "PAST LIVE", sw ? "REKODI ZA MATANGAZO" : "RECENT REPLAYS", past, sw ? "Rekodi za matangazo ya umma zitaonekana hapa." : "Public replay listings will appear here.")}
    </main></section>`;
}

async function loadMarketplaceLiveFeed(force = false) {
  if (homeState.liveLoading || (homeState.liveLoaded && !force)) return;
  homeState.liveLoading = true;
  homeState.liveError = "";
  if (homeState.activeTab === "live") renderMarketplacePage("live");
  try {
    const { data, error } = await supabase.functions.invoke("marketplace-live", { body: {} });
    if (error) throw error;
    if (!data?.ok || !Array.isArray(data.broadcasts)) throw new Error(data?.error || "Live feed response was invalid");
    const previousSelection = String(homeState.liveSelectedId || "");
    homeState.liveBroadcasts = data.broadcasts;
    data.broadcasts.forEach(item => { homeState.liveGiftCounts[String(item.id)] = Number(item.gift_count || 0); });
    homeState.liveLoaded = true;
    if (previousSelection) {
      const current = homeState.liveBroadcasts.find(item => String(item.id) === previousSelection);
      if (!current) {
        const nextLive = homeState.liveBroadcasts.find(item => item.section === "live");
        homeState.liveSelectedId = nextLive ? String(nextLive.id) : "";
      } else if (current.section !== "live") {
        const nextLive = homeState.liveBroadcasts.find(item => item.section === "live" && String(item.id) !== previousSelection);
        if (nextLive) homeState.liveSelectedId = String(nextLive.id);
      }
    }
  } catch (error) {
    console.error("ZUNE Marketplace Live feed:", error);
    homeState.liveError = language() === "sw" ? "Imeshindikana kupakia matangazo. Hakikisha intaneti ipo kisha jaribu tena." : "Could not load Live broadcasts. Check your connection and try again.";
    homeState.liveLoaded = true;
  } finally {
    homeState.liveLoading = false;
    if (homeState.activeTab === "live") renderMarketplacePage("live");
  }
}

function bindLivePage() {
  if (!homeState.liveLoaded && !homeState.liveLoading) loadMarketplaceLiveFeed();
  if (!homeState.liveAutoNextTimer) {
    homeState.liveAutoNextTimer = window.setInterval(async () => {
      if (homeState.activeTab !== "live") {
        window.clearInterval(homeState.liveAutoNextTimer);
        homeState.liveAutoNextTimer = null;
        return;
      }
      const previousId = String(homeState.liveSelectedId || "");
      const previous = homeState.liveBroadcasts.find(item => String(item.id) === previousId);
      if (!previous || previous.section !== "live") return;
      homeState.liveLoaded = false;
      await loadMarketplaceLiveFeed(true);
      const current = homeState.liveBroadcasts.find(item => String(item.id) === previousId);
      if (current?.section === "live") return;
      const next = homeState.liveBroadcasts.find(item => item.section === "live" && String(item.id) !== previousId);
      homeState.liveSelectedId = next ? String(next.id) : "";
      renderMarketplacePage("live");
      if (next) document.getElementById("z-live-player")?.scrollIntoView({behavior:"smooth",block:"start"});
    }, 30000);
  }
  document.getElementById("z-live-refresh")?.addEventListener("click", () => {
    homeState.liveLoaded = false;
    loadMarketplaceLiveFeed(true);
  });
  document.getElementById("z-live-retry")?.addEventListener("click", () => {
    homeState.liveLoaded = false;
    loadMarketplaceLiveFeed(true);
  });
  document.querySelectorAll("[data-live-scroll]").forEach(button => button.addEventListener("click", () => {
    document.getElementById("z-live-section-" + button.dataset.liveScroll)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  document.querySelectorAll("[data-live-watch]").forEach(button => button.addEventListener("click", () => {
    homeState.liveSelectedId = button.dataset.liveWatch || "";
    renderMarketplacePage("live");
    document.getElementById("z-live-player")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  document.querySelector("[data-live-prev]")?.addEventListener("click", () => moveLiveSelection(-1));
  document.querySelector("[data-live-next]")?.addEventListener("click", () => moveLiveSelection(1));
  document.querySelector("[data-live-like]")?.addEventListener("click", () => {
    const id = String(homeState.liveSelectedId);
    if (homeState.liveLikedIds.has(id)) homeState.liveLikedIds.delete(id); else homeState.liveLikedIds.add(id);
    renderMarketplacePage("live");
  });
  document.querySelectorAll("[data-live-gift]").forEach(button => button.addEventListener("click", () => {
    const broadcastId = String(homeState.liveSelectedId || "");
    const giftType = ({ "👏":"applause", "⭐":"star", "❤️":"heart" })[button.dataset.liveGift];
    if (!broadcastId || !giftType || button.disabled) return;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = language() === "sw" ? "Inatuma…" : "Sending…";
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData?.user) throw new Error(language() === "sw" ? "Ingia kwenye akaunti yako ili kutuma zawadi." : "Sign in to send a gift.");
        const { data, error } = await supabase.rpc("zune_send_live_gift", {
          p_broadcast_id: broadcastId,
          p_gift_type: giftType
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.message || (language() === "sw" ? "Zawadi haikutumwa." : "Gift was not sent."));
        homeState.liveGiftCounts[broadcastId] = Number(data.gift_count || (Number(homeState.liveGiftCounts[broadcastId] || 0) + 1));
        const count = document.getElementById("z-live-gift-count");
        if (count) count.textContent = `${homeState.liveGiftCounts[broadcastId]} ${language() === "sw" ? "zawadi zimetumwa kwenye kipindi hiki" : "gifts sent in this Live"}`;
        button.textContent = language() === "sw" ? "Imetumwa ✓" : "Sent ✓";
      } catch (error) {
        console.warn("ZUNE Live gift:", error);
        button.textContent = originalLabel;
        window.alert(error?.message || (language() === "sw" ? "Imeshindikana kutuma zawadi. Jaribu tena." : "Could not send the gift. Try again."));
      } finally {
        window.setTimeout(() => { if (button.isConnected) { button.disabled = false; button.textContent = originalLabel; } }, 900);
      }
    })();
  }));
  // Use ZUNE-owned controls for gestures; YouTube iframe touch events do not bubble here.
  document.querySelectorAll("#z-live-player [data-live-swipe-zone]").forEach(zone => {
    let startY = null;
    let startX = null;
    zone.addEventListener("touchstart", event => {
      if (event.target?.closest?.("button,a,input,select,textarea")) { startY = null; startX = null; return; }
      startY = event.touches?.[0]?.clientY ?? null;
      startX = event.touches?.[0]?.clientX ?? null;
    }, {passive:true});
    zone.addEventListener("touchend", event => {
      if (startY === null || startX === null) return;
      const endY = event.changedTouches?.[0]?.clientY ?? startY;
      const endX = event.changedTouches?.[0]?.clientX ?? startX;
      const deltaY = startY - endY;
      const deltaX = Math.abs(startX - endX);
      startY = null;
      startX = null;
      if (Math.abs(deltaY) > 55 && Math.abs(deltaY) > deltaX * 1.2) moveLiveSelection(deltaY > 0 ? 1 : -1);
    }, {passive:true});
    zone.addEventListener("touchcancel", () => { startY = null; startX = null; }, {passive:true});
    zone.addEventListener("keydown", event => {
      if (event.target?.closest?.("button,a,input,select,textarea")) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveLiveSelection(event.key === "ArrowUp" ? 1 : -1);
      }
    });
  });
  document.querySelector("[data-live-chat-toggle]")?.addEventListener("click", event => {
    const button = event.currentTarget;
    const panel = document.querySelector("[data-live-chat-panel]");
    const frame = panel?.querySelector("[data-live-chat-frame]");
    const expanded = button.getAttribute("aria-expanded") === "true";
    if (!panel) return;
    panel.hidden = expanded;
    button.setAttribute("aria-expanded", String(!expanded));
    button.textContent = expanded
      ? (language() === "sw" ? "Fungua mazungumzo ndani ya ZUNE ↓" : "Open chat inside ZUNE ↓")
      : (language() === "sw" ? "Funga mazungumzo ↑" : "Close chat ↑");
    if (!expanded && frame?.dataset.src && frame.getAttribute("src") === "about:blank") {
      frame.setAttribute("src", frame.dataset.src);
    }
  });
  document.getElementById("z-live-close-player")?.addEventListener("click", () => {
    homeState.liveSelectedId = "";
    renderMarketplacePage("live");
  });
  document.querySelectorAll("[data-live-add-product]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.liveAddProduct;
    const product = homeState.liveBroadcasts.flatMap(item => item.products || []).find(item => String(item.id) === String(id));
    if (product) addToCart(product.id, product);
  }));
}

// --------------------------------------------
// 29. SAVED PAGE
// --------------------------------------------

function renderSavedPage() {
  const savedIds = homeState.saved.map(String);

  const products = homeState.products.filter(product =>
    savedIds.includes(String(product.id))
  );

  return `
    <section class="z-home">

      <main class="z-home-content">

        <h1 class="z-page-title">
          ${tx("savedTitle")}
        </h1>

        ${
          products.length
            ? `
              <div id="z-product-area">
                <div class="z-product-grid">
                  ${products.map(productCard).join("")}
                </div>
              </div>
            `
            : `
              <div class="z-empty-state">

                <div class="z-empty-icon">♡</div>

                <h2>${tx("noSaved")}</h2>

                <p>${tx("noSavedText")}</p>

                <button
                  type="button"
                  class="z-primary-button"
                  data-go-home
                >
                  ${tx("exploreProducts")}
                </button>

              </div>
            `
        }

      </main>

    </section>
  `;
}

// --------------------------------------------
// 30. SAVED EVENTS
// --------------------------------------------

function bindSavedEvents() {
  document.querySelectorAll("[data-go-home]").forEach(button => {
    button.addEventListener("click", () => {
      renderMarketplacePage("home");
    });
  });

  updateProductArea();
}

// --------------------------------------------
// 31. ACCOUNT PAGE
// --------------------------------------------

function renderSellerApplicationForm() {
  const sw = language() === "sw";
  const label = (a,b) => sw ? a : b;
  return `<form class="z-seller-form" id="z-seller-application-form">
    <label>${label("Jina la duka *","Store name *")}<input name="store_name" required maxlength="120"></label>
    <label>${label("Jina kamili la mmiliki *","Owner's full name *")}<input name="owner_name" required maxlength="120"></label>
    <label>${label("Namba ya simu *","Phone number *")}<input name="phone" type="tel" required maxlength="30"></label>
    <label>${label("Nchi *","Country *")}<input name="country" required maxlength="80" value="Tanzania"></label>
    <label>${label("Jiji *","City *")}<input name="city" required maxlength="100"></label>
    <label>${label("Aina ya biashara","Business category")}<input name="category" maxlength="100"></label>
    <label>${label("Mkoa","Region")}<input name="region" maxlength="100"></label>
    <label>${label("Wilaya","District")}<input name="district" maxlength="100"></label>
    <label>${label("Anwani ya biashara","Business address")}<textarea name="address" rows="2" maxlength="500"></textarea></label>
    <label>${label("Namba ya TIN (si lazima)","TIN number (optional)")}<input name="tin_number" maxlength="80" autocomplete="off" placeholder="${label("Unaweza kuacha wazi","You may leave this blank")}"></label>
    <p class="z-account-message">${label("TIN si sharti. Unaweza kutuma maombi ya kuwa Seller hata kama huna TIN.","TIN is not required. You can submit your Seller application even if you do not have a TIN.")}</p>
    <button type="submit" class="z-primary-button" id="z-seller-submit">${label("Tuma maombi","Submit application")}</button>
    <p class="z-account-message" id="z-seller-form-message" aria-live="polite"></p>
  </form>`;
}

const ZUNE_THEMES = [
  { id: "emerald", sw: "Emerald", en: "Emerald Green", color: "#087A55" },
  { id: "luxury", sw: "Luxury Dark", en: "Luxury Dark", color: "#C69B36" },
  { id: "ocean", sw: "Ocean Blue", en: "Ocean Blue", color: "#1676C5" },
  { id: "royal", sw: "Royal Purple", en: "Royal Purple", color: "#7546B8" },
  { id: "nature", sw: "Nature", en: "Nature", color: "#426B3D" },
  { id: "blossom", sw: "Blossom Pink", en: "Blossom Pink", color: "#D94F83" },
  { id: "sunset", sw: "Sunset", en: "Sunset", color: "#D65B3C" },
  { id: "minimal", sw: "Minimal Light", en: "Minimal Light", color: "#424B57" }
];

function applyZuneTheme(themeId) {
  const valid = ZUNE_THEMES.some(theme => theme.id === themeId);
  const selected = valid ? themeId : "emerald";
  document.documentElement.setAttribute("data-theme", selected);
  try { localStorage.setItem("zune_theme", selected); } catch (error) {
    console.warn("ZUNE theme preference could not be saved:", error);
  }
}

function renderThemeSettings() {
  const sw = language() === "sw";
  const selected = localStorage.getItem("zune_theme") || "emerald";
  return `<section class="z-seller-panel z-theme-panel">
    <h2>${sw ? "Muonekano wa ZUNE" : "ZUNE Appearance"}</h2>
    <p>${sw ? "Chagua rangi na muonekano unaoupenda. Chaguo lako litahifadhiwa kwenye kifaa hiki." : "Choose the colors and appearance you prefer. Your choice will be saved on this device."}</p>
    <div class="z-theme-grid">
      ${ZUNE_THEMES.map(theme => `<button type="button" class="z-theme-option ${selected === theme.id ? "active" : ""}" data-zune-theme="${theme.id}" aria-pressed="${selected === theme.id}">
        <span class="z-theme-swatch" style="--theme-swatch:${theme.color}"></span>
        <span>${sw ? theme.sw : theme.en}</span>
        <span class="z-theme-check">${selected === theme.id ? "✓" : ""}</span>
      </button>`).join("")}
    </div>
  </section>`;
}

function renderAccountPage() {
  const user = homeState.user;
  const sw = language() === "sw";
  const label = (a,b) => sw ? a : b;
  const email = user?.email || "";
  const name = homeState.accountProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0] || "ZUNE Customer";
  const role = homeState.accountProfile?.role || "buyer";
  const isSeller = role === "vendor";
  const application = homeState.sellerApplication;
  const initials = name.trim().split(/\s+/).slice(0,2).map(part => part.charAt(0)).join("").toUpperCase();
  let sellerContent = "";
  if (isSeller) {
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("BIASHARA YANGU","MY BUSINESS")}</span><h2>${label("Duka lako liko tayari","Your store is ready")}</h2><p>${label("Maombi yako yameidhinishwa.","Your application is approved.")}</p><div class="z-seller-status approved"><strong>✓ ${label("Umeidhinishwa","Approved")}</strong><span>${label("Sasa unaweza kusimamia duka lako kupitia dashboard.","Manage your store from the dashboard.")}</span></div><button type="button" class="z-primary-button" data-open-seller-dashboard>${label("Fungua Seller Dashboard","Open Seller Dashboard")} →</button></section>`;
  } else if (application) {
    const status = String(application.status || "pending").toLowerCase();
    let title = label("Maombi yametumwa","Application submitted");
    let detail = label("Maombi yako yanasubiri kupitia Admin Mkuu.","Your application is awaiting Admin Mkuu review.");
    let statusClass = "pending";
    if (status === "approved") { title = label("Maombi yameidhinishwa","Application approved"); detail = label("Akaunti yako inasubiri kusasishwa kuwa muuzaji.","Your account is awaiting seller-role update."); statusClass = "approved"; }
    if (status === "rejected") { title = label("Maombi yamekataliwa","Application rejected"); detail = application.admin_note || label("Wasiliana na msaada kwa maelezo zaidi.","Contact support for more information."); statusClass = "rejected"; }
    if (["more_info_required","needs_information","more_information"].includes(status)) { title = label("Tunahitaji maelezo zaidi","More information required"); detail = application.admin_note || label("Tafadhali wasiliana na msaada.","Please contact support."); statusClass = "review"; }
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("OMBI LA MUUZAJI","SELLER APPLICATION")}</span><h2>${title}</h2><p>${safe(detail)}</p><div class="z-seller-status ${statusClass}"><strong>${label("Hali ya maombi","Application status")}: ${safe(status.replace(/_/g," "))}</strong></div>${status === "rejected" ? renderSellerApplicationForm() : ""}</section>`;
  } else {
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("BIASHARA YANGU","MY BUSINESS")}</span><h2>${label("Fungua duka lako ZUNE","Open your ZUNE store")}</h2><p>${label("Omba kuwa Seller na uanze kuuza bidhaa zako kwenye Marketplace.","Apply to become a Seller and start selling on ZUNE Marketplace.")}</p>${renderSellerApplicationForm()}</section>`;
  }
  let customerVerificationContent = "";
  if (role === "buyer") {
    const request = homeState.customerVerificationRequest;
    const requestStatus = String(request?.status || "").toLowerCase();
    const customerVerified = homeState.accountProfile?.is_verified === true;
    let statusMarkup = "";
    if (customerVerified) {
      statusMarkup = `<div class="z-seller-status approved"><strong>✓ Verified Account</strong><span>${label("Akaunti yako ya mteja imethibitishwa.","Your customer account is verified.")}</span></div>`;
    } else if (requestStatus === "pending") {
      statusMarkup = `<div class="z-seller-status pending"><strong>${label("Ombi linasubiri ukaguzi","Request pending review")}</strong><span>${label("Admin Mkuu atakagua ombi lako.","Admin Mkuu will review your request.")}</span></div>`;
    } else if (requestStatus === "rejected") {
      statusMarkup = `<div class="z-seller-status rejected"><strong>${label("Ombi limekataliwa","Request rejected")}</strong><span>${safe(request.rejection_reason || label("Unaweza kutuma ombi jipya.","You may submit a new request."))}</span></div>`;
    } else if (["more_info_required","needs_information","more_information"].includes(requestStatus)) {
      statusMarkup = `<div class="z-seller-status review"><strong>${label("Taarifa zaidi zinahitajika","More information required")}</strong><span>${safe(request.rejection_reason || label("Sasisha taarifa zako kisha tuma tena.","Update your details and submit again."))}</span></div>`;
    }
    customerVerificationContent = `<section class="z-account-seller z-account-section z-account-verification"><span class="z-account-eyebrow">${label("CUSTOMER VERIFICATION","CUSTOMER VERIFICATION")}</span><h2>${label("Uthibitisho wa mteja","Customer verification")}</h2><p>${label("Omba Verified Account. Beji ya orange itaonekana baada ya Admin Mkuu kuidhinisha ombi lako.","Request Verified Account. The orange badge appears after Admin Mkuu approves your request.")}</p>${statusMarkup}${customerVerified || (requestStatus === "pending" && request?.document_path) ? "" : `<form id="z-customer-verification-form" class="z-seller-form"><label>${label("Jina lako kamili","Your full name")}<input name="full_name" maxlength="140" required value="${safe(name)}"></label><label>${label("Picha ya kitambulisho (mbele)","Identity document image (front)")}<input name="identity_document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><p class="z-account-message">${label("JPG, PNG, WEBP au PDF. Ukubwa usizidi MB 10. Picha itaonekana kwa Admin Mkuu pekee.","JPG, PNG, WEBP or PDF. Maximum 10 MB. Only Admin Mkuu can view this document.")}</p><button type="submit" class="z-primary-button" id="z-customer-verification-submit">${label("Omba Verified Account","Apply for Verified Account")}</button><p class="z-account-message" id="z-customer-verification-message" role="status"></p></form>`}</section>`;
  }

  return `<section class="z-home z-account-page"><main class="z-home-content">
    <div class="z-account-heading"><div><span class="z-account-eyebrow">${label("NAFASI YAKO","YOUR SPACE")}</span><h1 class="z-page-title">${label("Akaunti yangu","My account")}</h1></div><span class="z-account-heading-mark">ⓏⓊⓃⒺ</span></div>
    <section class="z-account-hero" data-account-profile role="button" tabindex="0" aria-label="${label("Fungua taarifa binafsi","Open personal information")}">${homeState.accountProfile?.avatar_display_url ? `<img class="z-account-avatar" src="${safe(homeState.accountProfile.avatar_display_url)}" alt="Profile photo">` : `<div class="z-account-avatar">${safe(initials || "Z")}</div>`}<div class="z-account-identity"><span class="z-account-eyebrow">${label("KARIBU TENA","WELCOME BACK")}</span><h2>${safe(name)}</h2><p>${safe(email)}</p>${role === "buyer" && homeState.accountProfile?.is_verified ? `<span class="z-account-verified"><svg viewBox="-30 -30 60 60" role="img" aria-label="Verified Account"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Verified Account</span></span>` : ""}</div><span class="z-account-role ${isSeller ? "vendor" : ""}">${isSeller ? label("MUUZAJI","SELLER") : label("MTEJA","CUSTOMER")}</span></section>
    ${homeState.accountLoading ? `<p class="z-account-message">${label("Inapakia taarifa za akaunti...","Loading account details...")}</p>` : ""}
    ${homeState.accountError ? `<p class="z-account-message" role="alert">${safe(homeState.accountError)}</p>` : ""}
    <section class="z-account-section"><div class="z-account-section-heading"><div><span class="z-account-eyebrow">${label("SHUGHULI ZA MANUNUZI","SHOPPING ACTIVITY")}</span><h2>${label("Manunuzi yangu","My shopping")}</h2></div></div><div class="z-account-shortcuts">
      <button type="button" class="z-account-shortcut" data-account-orders><span class="shortcut-icon">▤</span><span><strong>${label("Oda zangu","My orders")}</strong><small>${label("Angalia na fuatilia oda zako","View and track your orders")}</small></span><b>›</b></button>
      <button type="button" class="z-account-shortcut" data-account-saved><span class="shortcut-icon saved">♡</span><span><strong>${label("Zilizohifadhiwa","Saved items")}</strong><small>${label("Bidhaa ulizopenda","Your favourites")}</small></span><b>›</b></button>
      <button type="button" class="z-account-shortcut" data-account-cart><span class="shortcut-icon">🛒</span><span><strong>${label("Kikapu changu","My cart")}</strong><small>${label("Bidhaa ulizochagua","Items you selected")}</small></span><b>›</b></button>
    </div></section>
    <section class="z-account-section"><div class="z-account-section-heading"><div><span class="z-account-eyebrow">${label("ZUNE SHOPPING TOOLS","ZUNE SHOPPING TOOLS")}</span><h2>${label("Zana za ununuzi","Shopping tools")}</h2></div></div>
      <button type="button" class="z-account-menu-row" data-account-shopping-tools><span class="shortcut-icon">✦</span><span><strong>${label("ZUNE Shopping Tools","ZUNE Shopping Tools")}</strong><small>${label("Wishlist, kulinganisha bidhaa, reviews, alerts, rewards na zaidi","Wishlist, product comparison, reviews, alerts, rewards and more")}</small></span><b>›</b></button>
    </section>
    ${customerVerificationContent}
    ${sellerContent}
    ${renderThemeSettings()}
    <section class="z-account-section"><div class="z-account-section-heading"><div><span class="z-account-eyebrow">${label("AKAUNTI NA USALAMA","ACCOUNT & SECURITY")}</span><h2>${label("Mipangilio ya akaunti","Account settings")}</h2></div></div>
      <button type="button" class="z-account-menu-row" data-open-settings="personal"><span class="shortcut-icon">👤</span><span><strong>${label("Taarifa binafsi","Personal information")}</strong><small>${label("Jina, picha na taarifa zako","Name, photo and your details")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="security"><span class="shortcut-icon">🔐</span><span><strong>${label("Usalama na nenosiri","Security & password")}</strong><small>${label("Linda akaunti yako","Keep your account secure")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="notifications"><span class="shortcut-icon">🔔</span><span><strong>${label("Taarifa na arifa","Notifications")}</strong><small>${label("Simamia taarifa za akaunti","Manage account notifications")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="contact"><span class="shortcut-icon">❔</span><span><strong>${label("Msaada na huduma kwa wateja","Help & support")}</strong><small>${label("Wasiliana na timu ya ZUNE","Contact the ZUNE team")}</small></span><b>›</b></button>
    </section>
    <button type="button" class="z-account-logout" id="z-logout-button">↪ ${tx("logout")}</button><p class="z-account-version">ⓏⓊⓃⒺ MARKETPLACE · 2.0</p>
  </main></section>`;
}
async function loadAccountDetails() {
  const user = homeState.user;
  if (!user?.id || homeState.accountLoadedFor === user.id || homeState.accountLoading) return;
  homeState.accountLoading = true;
  homeState.accountError = "";
  try {
    const [profile, application, verification] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,is_verified,avatar_path").eq("id",user.id).maybeSingle(),
      supabase.from("seller_applications").select("id,store_name,status,admin_note,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("verified_badge_requests").select("id,status,rejection_reason,document_path,created_at").eq("user_id",user.id).eq("verification_type","customer").order("created_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    if (profile.error) throw profile.error;
    if (application.error) throw application.error;
    if (verification.error) throw verification.error;
    homeState.accountProfile = profile.data || null;
    if (homeState.accountProfile?.avatar_path) { const {data:avatarBlob,error:avatarError}=await supabase.storage.from("zune-avatars").download(homeState.accountProfile.avatar_path); if (!avatarError && avatarBlob) homeState.accountProfile.avatar_display_url=URL.createObjectURL(avatarBlob); }
    homeState.sellerApplication = application.data || null;
    homeState.customerVerificationRequest = verification.data || null;
    homeState.accountLoadedFor = user.id;
  } catch (error) {
    console.error("ZUNE account load error:",error);
    homeState.accountError = language() === "sw" ? "Imeshindikana kupakia taarifa za akaunti." : "Unable to load account details.";
    // Zuia ukurasa kujirudia kuomba data bila mwisho hitilafu ikitokea.
    homeState.accountLoadedFor = user.id;
  } finally {
    homeState.accountLoading = false;
    if (homeState.activeTab === "me") renderMarketplacePage("me");
  }
}


function navigateWithZuneWave(destination) {
  if (homeState.accountNavigating) return;
  homeState.accountNavigating = true;
  const overlay = document.createElement("div");
  overlay.className = "zune-wave-transition active";
  overlay.setAttribute("role","status");
  overlay.setAttribute("aria-label",language()==="sw"?"Inafungua ukurasa":"Opening page");
  overlay.innerHTML = '<div class="zune-wave-wordmark" aria-hidden="true"><span style="--letter-index:0">Ⓩ</span><span style="--letter-index:1">Ⓤ</span><span style="--letter-index:2">Ⓝ</span><span style="--letter-index:3">Ⓔ</span></div><div class="zune-wave-caption">ZUNE MARKETPLACE</div>';
  document.body.appendChild(overlay);
  window.setTimeout(() => {
    try { destination(); }
    finally { overlay.remove(); homeState.accountNavigating = false; }
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 850);
}

function bindAccountEvents() {
  document.querySelectorAll("[data-zune-theme]").forEach(button => {
    button.addEventListener("click", () => {
      applyZuneTheme(button.dataset.zuneTheme);
      document.querySelectorAll("[data-zune-theme]").forEach(option => {
        const active = option.dataset.zuneTheme === button.dataset.zuneTheme;
        option.classList.toggle("active", active);
        option.setAttribute("aria-pressed", String(active));
        const check = option.querySelector(".z-theme-check");
        if (check) check.textContent = active ? "✓" : "";
      });
    });
  });
  document.querySelector("[data-open-seller-dashboard]")?.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("https://mrnehemiah.github.io/zuneacts/")));
  document.querySelector("[data-account-profile]")?.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("./settings.html?section=personal")));
  document.querySelector("[data-account-profile]")?.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();navigateWithZuneWave(()=>window.location.assign("./settings.html?section=personal"));}});
  document.querySelectorAll("[data-open-settings]").forEach(button=>button.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("./settings.html?section="+encodeURIComponent(button.dataset.openSettings||"personal")))));
  document.querySelector("[data-account-orders]")?.addEventListener("click",()=>navigateWithZuneWave(()=>{const app=homeState.app;app.innerHTML=`<section class="z-home z-account-page"><main class="z-home-content"><button type="button" class="z-primary-button" id="z-orders-back">← ${language()==="sw"?"Rudi Akaunti":"Back to Account"}</button><h1 class="z-page-title">${language()==="sw"?"Oda zangu":"My Orders"}</h1><section class="z-account-section"><p>${language()==="sw"?"Oda zako zitaonekana hapa baada ya kufanya manunuzi.":"Your orders will appear here after you make a purchase."}</p></section></main></section>`;document.getElementById("z-orders-back")?.addEventListener("click",()=>renderMarketplacePage("me"));}));
  document.querySelector("[data-account-saved]")?.addEventListener("click",()=>navigateWithZuneWave(()=>renderMarketplacePage("saved")));
  document.querySelector("[data-account-cart]")?.addEventListener("click",()=>navigateWithZuneWave(()=>renderMarketplacePage("cart")));
  document.querySelector("[data-account-shopping-tools]")?.addEventListener("click",()=>navigateWithZuneWave(()=>renderMarketplacePage("features")));
  document.getElementById("z-logout-button")?.addEventListener("click",async()=>{
    if (typeof homeState.onLogout === "function") { await homeState.onLogout(); return; }
    const {error} = await supabase.auth.signOut({scope: "local"}); if (error) alert(error.message);
  });
  document.getElementById("z-customer-verification-form")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const user = homeState.user;
    const form = event.currentTarget;
    const message = document.getElementById("z-customer-verification-message");
    const submit = document.getElementById("z-customer-verification-submit");
    const formData = new FormData(form);
    const full_name = String(formData.get("full_name") || "").trim();
    const documentFile = formData.get("identity_document");
    if (!user?.id || homeState.accountProfile?.role !== "buyer") {
      if (message) message.textContent = language()==="sw" ? "Verification hii inapatikana kwa akaunti za Customer pekee." : "This verification is only available to customer accounts.";
      return;
    }
    if (full_name.length < 3 || !(documentFile instanceof File) || !documentFile.size) {
      if (message) message.textContent = language()==="sw" ? "Weka jina lako kamili." : "Enter your full name.";
      return;
    }
    if (documentFile.size > 10*1024*1024 || !["image/jpeg","image/png","image/webp","application/pdf"].includes(documentFile.type)) { if(message) message.textContent=language()==="sw"?"Chagua JPG, PNG, WEBP au PDF isiyozidi MB 10.":"Choose JPG, PNG, WEBP or PDF up to 10 MB."; return; }
    if (submit) { submit.disabled = true; submit.textContent = language()==="sw" ? "Inatuma ombi..." : "Submitting..."; }
    if (message) message.textContent = "";
    try {
      const extension = documentFile.type === "application/pdf" ? "pdf" : documentFile.type.split("/")[1].replace("jpeg","jpg");
      const documentPath = user.id + "/customer/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + extension;
      const upload = await supabase.storage.from("zune-verification-documents").upload(documentPath, documentFile, {contentType:documentFile.type,upsert:false});
      if (upload.error) throw upload.error;
      if (homeState.customerVerificationRequest?.status === "pending" && !homeState.customerVerificationRequest.document_path) {
        const {data,error}=await supabase.rpc("zune_attach_verification_document",{p_request_id:homeState.customerVerificationRequest.id,p_document_path:documentPath});
        if(error)throw error;
        homeState.customerVerificationRequest=data;
        renderMarketplacePage("me");
        return;
      }
      const { data, error } = await supabase.from("verified_badge_requests").insert({
        user_id: user.id, full_name, business_name: null, verification_type: "customer", document_path: documentPath, status: "pending"
      }).select("id,status,rejection_reason,document_path,created_at").single();
      if (error) throw error;
      homeState.customerVerificationRequest = data;
      renderMarketplacePage("me");
    } catch (error) {
      console.error("ZUNE customer verification:", error);
      if (message) message.textContent = error.message || (language()==="sw" ? "Imeshindikana kutuma ombi. Jaribu tena." : "Could not submit request. Please try again.");
      if (submit) { submit.disabled = false; submit.textContent = language()==="sw" ? "Omba Verified Account" : "Apply for Verified Account"; }
    }
  });
  document.getElementById("z-seller-application-form")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const user = homeState.user;
    const form = event.currentTarget;
    const message = document.getElementById("z-seller-form-message");
    const submit = document.getElementById("z-seller-submit");
    if (!user?.id) { if(message) message.textContent = language()==="sw" ? "Ingia kwanza ili kutuma maombi." : "Please sign in before applying."; return; }
    const data = new FormData(form);
    const store = String(data.get("store_name")||"").trim();
    const payload = {user_id:user.id,store_name:store,business_name:store,owner_name:String(data.get("owner_name")||"").trim(),phone:String(data.get("phone")||"").trim(),country:String(data.get("country")||"").trim(),city:String(data.get("city")||"").trim(),email:user.email||null,category:String(data.get("category")||"").trim()||null,region:String(data.get("region")||"").trim()||null,district:String(data.get("district")||"").trim()||null,address:String(data.get("address")||"").trim()||null,tin_number:String(data.get("tin_number")||"").trim()||null,status:"pending"};
    if(submit) submit.disabled = true;
    if(message) message.textContent = language()==="sw" ? "Inatuma maombi..." : "Submitting application...";
    try {
      const {data:inserted,error} = await supabase.from("seller_applications").insert(payload).select("id,store_name,status,admin_note,created_at").single();
      if(error) throw error;
      homeState.sellerApplication = inserted; homeState.accountLoadedFor = user.id; renderMarketplacePage("me");
    } catch(error) {
      console.error("ZUNE seller application error:",error);
      if(message) message.textContent = error.message || (language()==="sw" ? "Imeshindikana kutuma maombi. Jaribu tena." : "Could not submit application. Please try again.");
      if(submit) submit.disabled = false;
    }
  });
  if(homeState.accountLoadedFor !== homeState.user?.id && !homeState.accountLoading) loadAccountDetails();
}

// 33. MAIN PAGE RENDERER
// --------------------------------------------


/* Apply the signed-in customer's selected template to the live Marketplace UI. */
function applyMarketplaceTemplate() {
  const id = homeState.user?.id;
  let selected = "classic";
  try { if (id) selected = localStorage.getItem("zune_template_customer:" + id) || "classic"; } catch (_) {}
  const allowed = ["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"];
  const template = allowed.includes(selected) ? selected : "classic";
  const marketplace = homeState.app?.querySelector(".z-marketplace");
  if (marketplace) marketplace.setAttribute("data-zune-template", template);
  if (document.getElementById("zuneMarketplaceTemplateStyles")) return;
  const style = document.createElement("style");
  style.id = "zuneMarketplaceTemplateStyles";
  style.textContent = `
    .z-marketplace[data-zune-template="editorial"] .z-home-content{max-width:1240px}.z-marketplace[data-zune-template="editorial"] .z-home-carousel{border-radius:4px;min-height:285px}.z-marketplace[data-zune-template="editorial"] .z-section-heading h2{font-family:Georgia,serif;font-size:20px}.z-marketplace[data-zune-template="editorial"] .z-product-grid{gap:18px}.z-marketplace[data-zune-template="editorial"] .z-product-card{border-radius:5px;box-shadow:none}.z-marketplace[data-zune-template="editorial"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="hero"] .z-home-content{max-width:1180px}.z-marketplace[data-zune-template="hero"] .z-home-carousel,.z-marketplace[data-zune-template="hero"] .z-slide-copy{min-height:340px}.z-marketplace[data-zune-template="hero"] .z-home-carousel{border-radius:26px}.z-marketplace[data-zune-template="hero"] .z-home-welcome{display:none}
    .z-marketplace[data-zune-template="compact"] .z-home-header{padding:8px 12px}.z-marketplace[data-zune-template="compact"] .z-home-top{margin-bottom:8px}.z-marketplace[data-zune-template="compact"] .z-icon-button{width:35px;height:35px;border-radius:10px}.z-marketplace[data-zune-template="compact"] .z-search-box{min-height:40px}.z-marketplace[data-zune-template="compact"] .z-home-content{padding:10px}.z-marketplace[data-zune-template="compact"] .z-home-carousel,.z-marketplace[data-zune-template="compact"] .z-slide-copy{min-height:150px}.z-marketplace[data-zune-template="compact"] .z-product-grid{gap:7px}.z-marketplace[data-zune-template="compact"] .z-product-card{border-radius:10px}.z-marketplace[data-zune-template="compact"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="boutique"] .z-home-header{background:#28211f;color:#fff;border:0}.z-marketplace[data-zune-template="boutique"] .z-home-header .z-icon-button{background:#3a302d;color:#fff;border-color:#51443f}.z-marketplace[data-zune-template="boutique"] .zune-logo{color:#e5c6a8}.z-marketplace[data-zune-template="boutique"] .z-home-carousel{border-radius:30px 5px 30px 5px}.z-marketplace[data-zune-template="boutique"] .z-product-card{border-radius:4px;box-shadow:none}.z-marketplace[data-zune-template="boutique"] .z-product-media{aspect-ratio:4/5}
    .z-marketplace[data-zune-template="catalog"] .z-home-content{max-width:1300px}.z-marketplace[data-zune-template="catalog"] .z-category-directory{grid-template-columns:repeat(4,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-card{border-radius:9px}.z-marketplace[data-zune-template="catalog"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="stories"] .z-home-carousel{border-radius:26px 26px 8px 8px}.z-marketplace[data-zune-template="stories"] .z-category-directory .z-category{min-height:70px;border-radius:18px;white-space:normal}.z-marketplace[data-zune-template="stories"] .z-product-row{grid-auto-columns:minmax(180px,55%)}.z-marketplace[data-zune-template="stories"] .z-product-card{border-radius:22px}
    .z-marketplace[data-zune-template="minimal"] .z-home-header{box-shadow:none;border:0;background:var(--background)}.z-marketplace[data-zune-template="minimal"] .z-icon-button{border:0;background:transparent}.z-marketplace[data-zune-template="minimal"] .z-home-carousel{border-radius:0;min-height:185px}.z-marketplace[data-zune-template="minimal"] .z-slide-copy{min-height:185px}.z-marketplace[data-zune-template="minimal"] .z-product-card{border:0;border-radius:0;box-shadow:none}.z-marketplace[data-zune-template="minimal"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="deals"] .z-home-carousel{min-height:255px;border:3px solid #f0a33b}.z-marketplace[data-zune-template="deals"] .z-product-card{border-radius:12px}.z-marketplace[data-zune-template="deals"] .z-product-flag.discount{font-size:10px;padding:6px 9px}
    .z-marketplace[data-zune-template="showcase"] .z-home-content{max-width:1240px}.z-marketplace[data-zune-template="showcase"] .z-home-carousel,.z-marketplace[data-zune-template="showcase"] .z-slide-copy{min-height:310px}.z-marketplace[data-zune-template="showcase"] .z-home-carousel{border-radius:24px}.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.z-marketplace[data-zune-template="showcase"] .z-product-card{border-radius:20px}.z-marketplace[data-zune-template="showcase"] .z-product-media{aspect-ratio:1/1.08}
    @media(min-width:760px){.z-marketplace[data-zune-template="catalog"] .z-product-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:520px){.z-marketplace[data-zune-template="catalog"] .z-category-directory{grid-template-columns:repeat(2,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-grid,.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    /* Full-surface template system: themes apply to every Marketplace view, not only Home. */
    .z-marketplace{--z-template-radius:16px;--z-template-shadow:0 8px 26px rgba(18,35,28,.07)}
    .z-marketplace[data-zune-template="classic"]{--background:#f5f8f6;--surface:#fff;--text:#17251f;--text-muted:#718078;--border:#e2ebe5;--primary:#087a55;--z-template-radius:16px}
    .z-marketplace[data-zune-template="editorial"]{--background:#f7f4ef;--surface:#fffdf9;--text:#29251f;--text-muted:#82786d;--border:#e8e0d5;--primary:#8a5b38;--z-template-radius:5px;--z-template-shadow:0 2px 10px rgba(41,37,31,.05);font-family:Georgia,serif}
    .z-marketplace[data-zune-template="hero"]{--background:#101d35;--surface:#192a49;--text:#f4f7ff;--text-muted:#bdc9df;--border:#314565;--primary:#e9b85d;--z-template-radius:22px;--z-template-shadow:0 12px 32px rgba(0,0,0,.2)}
    .z-marketplace[data-zune-template="compact"]{--background:#f2f5f7;--surface:#fff;--text:#1e2933;--text-muted:#71808c;--border:#e0e6eb;--primary:#286b8f;--z-template-radius:9px;--z-template-shadow:0 2px 8px rgba(20,35,45,.05)}
    .z-marketplace[data-zune-template="boutique"]{--background:#f4eee8;--surface:#fffaf5;--text:#34251f;--text-muted:#8a766c;--border:#e8d9cf;--primary:#9a6048;--z-template-radius:4px;--z-template-shadow:0 5px 18px rgba(65,39,28,.08)}
    .z-marketplace[data-zune-template="catalog"]{--background:#f1f5fa;--surface:#fff;--text:#1e2c40;--text-muted:#718198;--border:#dce5f0;--primary:#2864a4;--z-template-radius:10px;--z-template-shadow:0 3px 12px rgba(30,60,95,.07)}
    .z-marketplace[data-zune-template="stories"]{--background:#f7f2fa;--surface:#fff;--text:#30233a;--text-muted:#85748e;--border:#eadff0;--primary:#8b55a5;--z-template-radius:22px;--z-template-shadow:0 8px 24px rgba(75,42,91,.08)}
    .z-marketplace[data-zune-template="minimal"]{--background:#fff;--surface:#fff;--text:#202020;--text-muted:#858585;--border:#ededed;--primary:#333;--z-template-radius:0;--z-template-shadow:none}
    .z-marketplace[data-zune-template="deals"]{--background:#fff8ed;--surface:#fff;--text:#382817;--text-muted:#927b61;--border:#f1dfc5;--primary:#d87519;--z-template-radius:12px;--z-template-shadow:0 5px 18px rgba(154,91,22,.09)}
    .z-marketplace[data-zune-template="showcase"]{--background:#111820;--surface:#1b2732;--text:#f3f6f8;--text-muted:#b4c0c9;--border:#35434e;--primary:#d6aa58;--z-template-radius:20px;--z-template-shadow:0 12px 30px rgba(0,0,0,.22)}
    .z-marketplace{background:var(--background);color:var(--text);min-height:100vh}
    .z-marketplace .z-home,.z-marketplace .z-home-content{background:var(--background);color:var(--text)}
    .z-marketplace .z-home-content{border-color:var(--border)}
    .z-marketplace .z-home-header,.z-marketplace .z-bottom-nav,.z-marketplace .z-account-section,.z-marketplace .z-empty-state,.z-marketplace .z-category-directory,.z-marketplace .z-search-results,.z-marketplace .z-cart-panel,.z-marketplace .z-order-summary{background:var(--surface);color:var(--text);border-color:var(--border)}
    .z-marketplace .z-section-heading h1,.z-marketplace .z-section-heading h2,.z-marketplace .z-page-title,.z-marketplace .z-account-section h2{color:var(--text)}
    .z-marketplace .z-product-card,.z-marketplace .z-category,.z-marketplace .z-account-shortcut,.z-marketplace .z-cart-item,.z-marketplace .z-seller-status{background:var(--surface);color:var(--text);border-color:var(--border);border-radius:var(--z-template-radius);box-shadow:var(--z-template-shadow)}
    .z-marketplace .z-product-card{overflow:hidden}
    .z-marketplace .z-product-card button,.z-marketplace .z-primary-button,.z-marketplace .z-search-submit{border-radius:var(--z-template-radius)}
    .z-marketplace .z-product-card h3,.z-marketplace .z-product-card strong,.z-marketplace .z-product-card .z-product-title{color:var(--text)}
    .z-marketplace .z-product-card p,.z-marketplace .z-product-card small,.z-marketplace .z-muted{color:var(--text-muted)}
    .z-marketplace .z-icon-button,.z-marketplace .z-bottom-nav button{color:var(--text);border-color:var(--border)}
    .z-marketplace .z-bottom-nav{border-top:1px solid var(--border)}
    .z-marketplace .z-home-carousel{border-radius:var(--z-template-radius);overflow:hidden}
    .z-marketplace .z-category{transition:transform .18s ease,box-shadow .18s ease}
    .z-marketplace .z-category:active,.z-marketplace .z-product-card:active{transform:scale(.99)}
    .z-marketplace[data-zune-template="hero"] .z-home-header,.z-marketplace[data-zune-template="showcase"] .z-home-header{background:var(--surface);color:var(--text);border-color:var(--border)}
    .z-marketplace[data-zune-template="hero"] .z-primary-button,.z-marketplace[data-zune-template="showcase"] .z-primary-button{background:var(--primary);color:#17202a}
    .z-marketplace[data-zune-template="minimal"] .z-product-card,.z-marketplace[data-zune-template="minimal"] .z-account-section{box-shadow:none}
    .z-marketplace[data-zune-template="compact"] .z-product-card{border-radius:8px}
    .z-marketplace[data-zune-template="stories"] .z-category{border-radius:22px}
    @media(prefers-reduced-motion:reduce){.z-marketplace .z-category{transition:none}}

    /* Animated Tanzania flag edge for Marketplace product cards. */
    .z-marketplace .z-product-card,
    .z-storefront-sheet .z-product-card{
      border:2px solid transparent !important;
      background-color:transparent !important;
      background-image:
        linear-gradient(var(--surface,#fff),var(--surface,#fff)),
        linear-gradient(135deg,#159447 0 34%,#f6d21a 34% 40%,#171717 40% 60%,#f6d21a 60% 66%,#168bd2 66% 100%) !important;
      background-origin:padding-box,border-box !important;
      background-clip:padding-box,border-box !important;
      background-size:100% 100%,260% 260% !important;
      background-position:center,0% 50% !important;
      animation:zuneTanzaniaFlagEdge 7s ease-in-out infinite !important;
    }
    @keyframes zuneTanzaniaFlagEdge{
      0%,100%{background-position:center,0% 50%}
      50%{background-position:center,100% 50%}
    }
    @media(prefers-reduced-motion:reduce){
      .z-marketplace .z-product-card,
      .z-storefront-sheet .z-product-card{animation:none !important}
    }


  `;
  document.head.appendChild(style);
}

/* Robust animated Tanzania-flag border overlay for all Marketplace product cards. */
function ensureZuneProductFlagMotion(){
  if(document.getElementById("zune-product-flag-motion"))return;
  const style=document.createElement("style");
  style.id="zune-product-flag-motion";
  style.textContent=`
    /* Match the animated Tanzania-flag edge used by ZUNEACTS product cards. */
    .z-marketplace .z-product-card,
    .z-storefront-sheet .z-product-card{
      border:2px solid transparent!important;
      background:
        linear-gradient(var(--surface,#fff),var(--surface,#fff)) padding-box,
        linear-gradient(135deg,
          #1eb53a 0%,#1eb53a 22%,
          #fcd116 22%,#fcd116 27%,
          #111 27%,#111 70%,
          #fcd116 70%,#fcd116 75%,
          #00a3dd 75%,#00a3dd 100%) border-box!important;
      background-size:auto,260% 260%!important;
      background-position:0 0,0% 50%!important;
      animation:zuneTanzaniaFlagFlow 7s ease-in-out infinite!important;
    }
    .z-marketplace .z-product-card:hover,
    .z-storefront-sheet .z-product-card:hover{
      background-position:0 0,100% 50%!important;
      box-shadow:0 12px 28px #153d2918;
    }
    @keyframes zuneTanzaniaFlagFlow{
      0%{background-position:0 0,0% 50%}
      50%{background-position:0 0,100% 50%}
      100%{background-position:0 0,0% 50%}
    }
    @media(prefers-reduced-motion:reduce){
      .z-marketplace .z-product-card,
      .z-storefront-sheet .z-product-card{animation:none!important}
    }
  `;
  document.head.appendChild(style);
}

async function renderMarketplacePage(page) {
  if (homeState.activeTab === "live" && page !== "live" && homeState.liveAutoNextTimer) {
    window.clearInterval(homeState.liveAutoNextTimer);
    homeState.liveAutoNextTimer = null;
  }
  if (homeState.activeTab === "live" && page !== "live" && homeState.liveSelectedId) preserveLiveMiniPlayer();
  if (page === "live" && homeState.liveMiniPlayer) closeLiveMiniPlayer(false);
  ensureZuneProductFlagMotion();
  ensureHomeVisualEnhancements();
  ensurePremiumSearchStyles();
  homeState.activeTab = page;
  if (page !== "home" && homeState.carouselTimer) {
    clearInterval(homeState.carouselTimer);
    homeState.carouselTimer = null;
  }

  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
  }

  const app = homeState.app;

  if (!app) return;

  if (page === "seller") {
    window.location.assign("https://mrnehemiah.github.io/zuneacts/");
    return;
  }

  let content;

  switch (page) {
    case "home":
      content = renderHomePage();
      break;

    case "explore":
      content = renderExplorePage();
      break;

    case "categories":
      content = renderCategoriesPage();
      break;

    case "live":
      content = renderLivePage();
      break;

    case "cart":
      if (!cartModule) {
        app.innerHTML = '<section class="z-cart-loading" role="status" aria-live="polite"><div class="zune-wave"><span>Ⓩ</span><span>Ⓤ</span><span>Ⓝ</span><span>Ⓔ</span></div><p>Inapakia kikapu...</p></section>';
        try {
          cartModule = await import("./cart.js?v=product-variants-cart-2");
        } catch (error) {
          console.error("ZUNE cart module could not be loaded:", error);
          app.innerHTML = '<section class="z-cart-loading" role="alert"><h2>Kikapu hakijafunguka</h2><p>Tafadhali jaribu tena.</p><button type="button" id="z-cart-retry">Jaribu tena</button></section>';
          app.querySelector("#z-cart-retry")?.addEventListener("click", () => renderMarketplacePage("cart"));
          return;
        }
        if (homeState.activeTab !== "cart") return;
      }
      content = renderCartPage();
      break;

    case "saved":
      content = renderSavedPage();
      break;

    case "me":
      content = renderAccountPage();
      break;

    case "features":
      content = '<div id="z-feature-suite-root"></div>';
      break;

    default:
      homeState.activeTab = "home";
      content = renderHomePage();
  }

  app.innerHTML = `
    <div class="z-marketplace">

      ${content}

      ${renderBottomNavigation()}

    </div>
  `;

  if (homeState.activeTab !== "live") renderLiveMiniPlayer();
  applyMarketplaceTemplate();
  renderSponsoredPlacementBlocks();
  bindSponsoredAdEvents();
  bindNavigation();
  app.querySelectorAll("[data-open-features]").forEach(button => {
    button.addEventListener("click", () => renderMarketplacePage("features"));
  });

  switch (homeState.activeTab) {
    case "home":
      bindHomeEvents();
      observeInfiniteScroll();
      break;

    case "explore":
      bindExploreEvents();
      observeInfiniteScroll();
      break;

    case "categories":
      bindCategoriesPage();
      break;

    case "live":
      bindLivePage();
      break;

    case "cart":
      bindCartEvents();
      break;

    case "saved":
      bindSavedEvents();
      break;

    case "me":
      bindAccountEvents();
      break;

    case "features":
      try {
        const featureModule = await import("./marketplace-features.js?v=20261123-3d-suite-v2");
        await featureModule.mountMarketplaceFeatures({
          root: app.querySelector("#z-feature-suite-root"),
          user: homeState.user,
          language: language(),
          onHome: () => renderMarketplacePage("home"),
          onOpenProduct: product => openProductDetails(product)
        });
      } catch (error) {
        console.error("ZUNE feature suite could not be loaded:", error);
        const featureRoot = app.querySelector("#z-feature-suite-root");
        if (featureRoot) featureRoot.innerHTML = '<section class="z-empty-state"><h2>Vipengele havijafunguka</h2><p>Tafadhali jaribu tena.</p></section>';
      }
      break;
  }

  updateCartBadges();
}

// --------------------------------------------
// 34. INITIALIZE MARKETPLACE
// --------------------------------------------

export async function renderMarketplaceHome({
  app,
  user,
  onLogout
}) {
  if (!app) {
    console.error("ZUNE: App container haijapatikana.");
    return;
  }

  homeState.app = app;
  homeState.user = user || null;
  homeState.onLogout = onLogout || null;
  // Cart na Wishlist ni za akaunti iliyoingia pekee; cloud ndiyo chanzo kikuu baada ya migration ya kwanza.
  homeState.saved = readUserStorage("zune_saved_products", []);
  homeState.cart = readUserStorage("zune_cart", []);
  if (homeState.user?.id) {
    const userId = homeState.user.id;
    const marker = "zune_collections_cloud_ready:" + userId;
    try {
      const [cloudCart, cloudSaved] = await Promise.all([
        supabase.from("cart_items").select("product_id,variant_id,quantity").eq("user_id", userId),
        supabase.from("wishlists").select("product_id").eq("user_id", userId)
      ]);
      if (cloudCart.error) throw cloudCart.error;
      if (cloudSaved.error) throw cloudSaved.error;
      if (localStorage.getItem(marker) !== "1") {
        const cartMap = new Map((cloudCart.data || []).map(row => [String(row.product_id)+"::"+String(row.variant_id||""), { productId: row.product_id, variantId:row.variant_id||null, quantity: Number(row.quantity) || 1 }]));
        homeState.cart.forEach(item => {
          const id = String(item.productId)+"::"+String(item.variantId||""), existing = cartMap.get(id);
          cartMap.set(id, { productId: item.productId, variantId:item.variantId||null, quantity: Math.max(Number(item.quantity) || 1, existing?.quantity || 1) });
        });
        homeState.cart = [...cartMap.values()];
        await saveCart();
        const cartCheck = await supabase.from("cart_items").select("product_id").eq("user_id", userId);
        if (cartCheck.error) throw cartCheck.error;
        if ((cartCheck.data || []).length !== homeState.cart.length) throw new Error("Cart cloud sync verification failed");

        const savedSet = new Set((cloudSaved.data || []).map(row => String(row.product_id)));
        homeState.saved.forEach(id => savedSet.add(String(id)));
        homeState.saved = [...savedSet];
        const cloudSavedSet = new Set((cloudSaved.data || []).map(row => String(row.product_id)));
        for (const id of homeState.saved.filter(value => !cloudSavedSet.has(String(value)))) {
          const result = await supabase.from("wishlists").insert({ user_id: userId, product_id: id });
          if (result.error && result.error.code !== "23505") throw result.error;
        }
        localStorage.setItem(marker, "1");
      } else {
        homeState.cart = (cloudCart.data || []).map(row => ({ productId: row.product_id, variantId:row.variant_id||null, quantity: row.quantity }));
        homeState.saved = (cloudSaved.data || []).map(row => row.product_id);
      }
      localStorage.setItem("zune_cart:" + userId, JSON.stringify(homeState.cart));
      localStorage.setItem("zune_saved_products:" + userId, JSON.stringify(homeState.saved));
    } catch (error) {
      console.warn("ZUNE cloud collections load; using this device cache:", error.message);
    }
  }
  homeState.cartProducts = [];
  homeState.cartProductsKey = "";
  homeState.cartProductsLoading = false;
  homeState.cartProductsError = false;

  applyZuneTheme(localStorage.getItem("zune_theme") || "emerald");
  addHomeStyles();

  // Fungua tab iliyoombwa na kiungo cha Account, kama ipo.
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  const allowedTabs = new Set(["home", "live", "explore", "categories", "cart", "saved", "me", "features"]);
  const initialTab = allowedTabs.has(requestedTab) ? requestedTab : "home";

  // Onyesha ukurasa ulioombwa mara moja.
  renderMarketplacePage(initialTab);

  // Pakia categories na bidhaa.
  await Promise.all([
    loadCategories(),
    loadProducts(true)
  ]);

  // Sasisha tab ileile baada ya data kupatikana.
  if (homeState.activeTab === initialTab) {
    renderMarketplacePage(initialTab);
  }
}

// ============================================
// MWISHO WA HOME.JS
// ZUNE MARKETPLACE 2.0
// ============================================