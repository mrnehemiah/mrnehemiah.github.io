import { supabase } from "./supabase.js?v=phase6-push-token-ownership-20261128";

const CART_KEY   = "zune_cart";

function cartStorageKey(userId) {
  return userId ? `${CART_KEY}:${userId}` : null;
}
const LANG_KEY   = "zune_language";
const THEME_KEY  = "zune_theme";
const MAX_QTY    = 99;
const QUERY_CHUNK = 100; // kikomo cha .in() cha Supabase
let cartCloudQueue = Promise.resolve();

const TEXT = {
  sw: {
    title: "Kikapu chako",
    subtitle: "Bidhaa ulizochagua kununua",
    items: "Bidhaa",
    empty: "Kikapu kiko tupu",
    emptyText: "Bado hujaongeza bidhaa kwenye kikapu chako. Endelea kuchunguza bidhaa na uweke unazozipenda hapa.",
    continue: "Endelea kununua",
    remove: "Ondoa",
    quantity: "Idadi",
    summary: "Muhtasari wa kikapu",
    subtotal: "Jumla ndogo",
    total: "Jumla ya bidhaa",
    checkout: "Endelea kulipia",
    checkoutNote: "Unaweza kuendelea kwenye checkout na kuchagua njia ya malipo inayopatikana.",
    loading: "Inapakia bidhaa za kikapu...",
    loadError: "Imeshindikana kupakia baadhi ya bidhaa. Tafadhali jaribu tena.",
    unavailable: "Bidhaa hii haipatikani kwa sasa.",
    retry: "Jaribu tena",
    unit: "Bei ya bidhaa",
    lineTotal: "Jumla",
    increaseQty: "Ongeza idadi",
    decreaseQty: "Punguza idadi"
  },
  en: {
    title: "Your shopping cart",
    subtitle: "Products you have selected",
    items: "Items",
    empty: "Your cart is empty",
    emptyText: "You have not added anything yet. Continue exploring and add products you would like to buy.",
    continue: "Continue shopping",
    remove: "Remove",
    quantity: "Quantity",
    summary: "Cart summary",
    subtotal: "Subtotal",
    total: "Items total",
    checkout: "Continue to checkout",
    checkoutNote: "Continue to checkout and choose an available payment method.",
    loading: "Loading cart products...",
    loadError: "Some cart products could not be loaded. Please try again.",
    unavailable: "This product is currently unavailable.",
    retry: "Try again",
    unit: "Unit price",
    lineTotal: "Line total",
    increaseQty: "Increase quantity",
    decreaseQty: "Decrease quantity"
  }
};

function text(language, key) {
  return TEXT[language === "en" ? "en" : "sw"][key] || key;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

/* ---------- Pesa: formatter cache + rounding ---------- */
const moneyFormatters = new Map();

function money(value, language) {
  const locale = language === "en" ? "en-TZ" : "sw-TZ";
  let fmt = moneyFormatters.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    moneyFormatters.set(locale, fmt);
  }
  return fmt.format(Math.round(Number(value) || 0)) + " TSh";
}

/* ---------- Storage ---------- */
function normalizeItem(item) {
  if (!item || item.productId == null) return null;
  const raw = Number(item.quantity);
  const quantity = Math.min(MAX_QTY, Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 1)));
  return { productId: item.productId, variantId: item.variantId || null, quantity };
}

export function readCart(userId) {
  const key = cartStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter(item => item && item.quantity > 0);
  } catch (error) {
    console.warn("ZUNE cart storage read failed:", error);
    return [];
  }
}

async function persistCartToCloud(cart, userId) {
  if (!userId) return;
  const removed = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (removed.error) throw removed.error;
  if (cart.length) {
    const rows = cart.map(item => ({ user_id: userId, product_id: item.productId, variant_id: item.variantId || null, quantity: item.quantity }));
    const saved = await supabase.from("cart_items").insert(rows);
    if (saved.error) throw saved.error;
  }
}

export function writeCart(cart, userId) {
  const normalized = (Array.isArray(cart) ? cart : [])
    .map(normalizeItem)
    .filter(item => item && item.quantity > 0);
  const key = cartStorageKey(userId);
  try {
    if (key) localStorage.setItem(key, JSON.stringify(normalized));
  } catch (error) {
    console.warn("ZUNE cart storage write failed:", error);
  }
  syncCartCountBadges(normalized);
  cartCloudQueue = cartCloudQueue.then(() => persistCartToCloud(normalized, userId)).catch(error => console.warn("ZUNE cart cloud sync:", error.message));
  return normalized;
}

export function syncCartCountBadges(cart = []) {
  const count = (cart || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });
}

/* ---------- Data ---------- */
export async function loadCartProducts(cart = []) {
  const ids = [...new Set((cart || []).map(i => String(i.productId)).filter(Boolean))];
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += QUERY_CHUNK) chunks.push(ids.slice(i, i + QUERY_CHUNK));

  const settled = await Promise.allSettled(
    chunks.map(chunk => supabase.from("products").select("*").in("id", chunk))
  );

  const products = [];
  const errors = [];
  for (const result of settled) {
    if (result.status === "rejected") { errors.push(result.reason); continue; }
    const { data, error } = result.value;
    if (error) { errors.push(error); continue; }
    if (data) products.push(...data);
  }

  if (!products.length && errors.length) throw errors[0];
  if (errors.length) console.warn("ZUNE cart: baadhi ya bidhaa hazikupakiwa", errors);
  if (products.length) {
    const {data:variants,error:variantError}=await supabase.from("product_variants").select("id,product_id,label,sku,attributes,price,stock_quantity,is_active").in("product_id",products.map(p=>p.id)).eq("is_active",true);
    if (variantError) console.warn("ZUNE cart variants:",variantError.message);
    const byProduct=new Map();
    (variants||[]).forEach(v=>{if(!byProduct.has(String(v.product_id)))byProduct.set(String(v.product_id),[]);byProduct.get(String(v.product_id)).push(v);});
    products.forEach(p=>p.__zuneVariants=byProduct.get(String(p.id))||[]);
  }
  return products;
}

function cartItemKey(item){return String(item?.productId||"")+"::"+String(item?.variantId||"");}

function computeTotals(cart, products) {
  const byId = new Map((products || []).map(p => [String(p.id), p]));
  const rows = (cart || []).map(item => {
    const product = byId.get(String(item.productId)) || null;
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const variant = product && item.variantId ? (product.__zuneVariants||[]).find(v=>String(v.id)===String(item.variantId))||null : null;
    const rawUnitPrice = variant ? Number(variant.price||0) : Number(product?.price||0);
    const discountPercent = Math.min(100,Math.max(0,Number(product?.discount_percent||0)));
    const unitPrice = Math.round(rawUnitPrice*(1-discountPercent/100)*100)/100;
    return { productId:item.productId, variantId:item.variantId||null, cartKey:cartItemKey(item), quantity, product, variant, unitPrice, lineTotal:product?unitPrice*quantity:0 };
  });
  const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const count = rows.reduce((sum, r) => sum + r.quantity, 0);
  return { rows, subtotal, count };
}

/* ---------- Rendering ---------- */
export function renderCartPage({ language = "sw" } = {}) {
  const message = language === "en"
    ? "The previous cart layout has been removed. A completely new cart is being built."
    : "Muundo wa zamani wa Cart umeondolewa. Cart mpya kabisa inajengwa.";
  const home = language === "en" ? "Back to marketplace" : "Rudi sokoni";
  return `
    <section class="z-cart-reset" aria-live="polite">
      <div class="z-cart-reset-mark" aria-hidden="true">Ⓩ</div>
      <p>${message}</p>
      <a href="./index.html">${home}</a>
    </section>`;
}

/* ---------- Events (delegation + idempotent) ---------- */
const boundRoots = new WeakMap();

export function bindCartEvents(root = document, handlers = {}) {
  // Epuka kuunganisha listener mara mbili
  const prev = boundRoots.get(root);
  if (prev) prev();

  const onClick = event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const minus = target.closest("[data-cart-minus]");
    if (minus && !minus.disabled) return handlers.onQuantityChange?.(minus.dataset.cartMinus, -1);

    const plus = target.closest("[data-cart-plus]");
    if (plus && !plus.disabled) return handlers.onQuantityChange?.(plus.dataset.cartPlus, 1);

    const remove = target.closest("[data-cart-remove]");
    if (remove) return handlers.onRemove?.(remove.dataset.cartRemove);

    if (target.closest("[data-cart-continue]")) return handlers.onContinueShopping?.();
    if (target.closest("[data-cart-checkout]")) return handlers.onCheckout?.([...root.querySelectorAll("[data-cart-select]:checked")].map(el => el.dataset.cartSelect));
    if (target.closest("[data-cart-remove-selected]")) return handlers.onRemoveSelected?.([...root.querySelectorAll("[data-cart-select]:checked")].map(el => el.dataset.cartSelect));
    if (target.closest("[data-cart-retry]")) return handlers.onRetry?.();
  };
  const onChange = event => {
    const target=event.target; if(!(target instanceof Element)) return;
    if(target.matches("[data-cart-select-all]")) root.querySelectorAll("[data-cart-select]").forEach(el=>{el.checked=target.checked;});
    if(target.matches("[data-cart-select]")) { const all=[...root.querySelectorAll("[data-cart-select]")]; const master=root.querySelector("[data-cart-select-all]"); if(master) master.checked=all.length>0&&all.every(el=>el.checked); }
    handlers.onSelectionChange?.();
  };
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  const unbind = () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("change", onChange);
    if (boundRoots.get(root) === unbind) boundRoots.delete(root);
  };
  boundRoots.set(root, unbind);
  return unbind;
}

/* ---------- Standalone mount ---------- */
const mountedRoots = new WeakMap();

export async function mountStandaloneCart(root) {
  if (!root) return;
  const language = localStorage.getItem(LANG_KEY) === "en" ? "en" : "sw";
  document.documentElement.lang = language;
  root.innerHTML = renderCartPage({ language });
  root.setAttribute("aria-busy", "false");
}
