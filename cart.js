import "./cart-smart-features.js?v=20261128-smart-3d";
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

/* ---------- Premium 3D Cart renderer ---------- */
const icon = (name, size=20) => {
  const paths = {
    cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    shop:'<path d="M3 9 4.5 3h15L21 9"/><path d="M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-6h6v6"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
    bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    sparkle:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>'
  };
  return `<svg class="z3-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.bag}</svg>`;
};
const storeName = row => row.product?.store_name || row.product?.seller_name || row.product?.vendor_name || "ZUNE Store";
const productImage = p => p?.image_url || p?.image || (Array.isArray(p?.images) ? p.images[0] : "") || "";
export function renderCartPage({ cart = [], products = [], language = "sw", loading = false, error = false } = {}) {
  const en = language === "en";
  const t = key => text(language,key);
  const {rows,subtotal,count}=computeTotals(cart,products);
  const groups=new Map();
  rows.forEach(row=>{const p=row.product||{};const key=String(p.store_id||p.seller_id||p.user_id||storeName(row));if(!groups.has(key))groups.set(key,{name:storeName(row),rows:[]});groups.get(key).rows.push(row);});
  const selectedCount=rows.length;
  const fmt=n=>money(n,language);
  const productMarkup=row=>{
    const p=row.product;
    if(!p)return `<article class="z3-item z3-item-missing"><div class="z3-product-placeholder">${icon("bag",30)}</div><div class="z3-product-main"><strong>${t("unavailable")}</strong><small>${escapeHTML(row.productId)}</small></div><button class="z3-icon-button z3-remove" data-cart-remove="${escapeHTML(row.cartKey)}" aria-label="${t("remove")}">${icon("trash")}</button></article>`;
    const image=productImage(p), title=escapeHTML(p.title||p.name||(en?"Product":"Bidhaa"));
    return `<article class="z3-item" data-cart-row="${escapeHTML(row.cartKey)}">
      <label class="z3-check-wrap"><input type="checkbox" data-cart-select="${escapeHTML(row.cartKey)}" checked aria-label="${en?"Select item":"Chagua bidhaa"}"><span></span></label>
      ${image?`<img class="z3-product-image" src="${escapeHTML(image)}" alt="${title}" loading="lazy">`:`<div class="z3-product-placeholder">${icon("bag",30)}</div>`}
      <div class="z3-product-main"><div class="z3-product-title-row"><strong>${title}</strong><button class="z3-icon-button z3-remove-inline" data-cart-remove="${escapeHTML(row.cartKey)}" aria-label="${t("remove")}">${icon("trash",17)}</button></div>
      <div class="z3-store-line">${icon("shield",13)}<span>${escapeHTML(storeName(row))}</span>${p.is_verified||p.store_verified||p.seller_verified?`<span class="z3-verified">${icon("check",10)}</span>`:""}</div>
      ${row.variant?`<small class="z3-variant">${escapeHTML(row.variant.label||"")}</small>`:""}
      <div class="z3-item-bottom"><strong class="z3-price">${fmt(row.unitPrice)}</strong><div class="z3-qty" role="group" aria-label="${t("quantity")}"><button data-cart-minus="${escapeHTML(row.cartKey)}" aria-label="${t("decreaseQty")}" ${row.quantity<=1?"disabled":""}>${icon("minus",14)}</button><b>${row.quantity}</b><button data-cart-plus="${escapeHTML(row.cartKey)}" aria-label="${t("increaseQty")}" ${row.quantity>=Math.min(MAX_QTY,Number(row.variant?.stock_quantity??MAX_QTY))?"disabled":""}>${icon("plus",14)}</button></div></div>
      </div><strong class="z3-line-total">${fmt(row.lineTotal)}</strong>
    </article>`;
  };
  if(!cart.length)return `<section class="z3-cart"><header class="z3-header"><a class="z3-back" href="./index.html">${icon("back")}</a><a class="z3-wordmark" href="./index.html">ⓏⓊⓃⒺ</a><span class="z3-header-icon">${icon("cart",21)}</span></header><main class="z3-main"><div class="z3-hero"><div><span class="z3-kicker">ZUNE MARKETPLACE</span><h1>${en?"Your Cart":"Kikapu Chako"}</h1><p>${en?"Everything you love, in one place.":"Bidhaa ulizochagua, sehemu moja."}</p></div><div class="z3-hero-orb">${icon("bag",34)}</div></div><section class="z3-empty"><div class="z3-empty-orb">${icon("cart",42)}</div><h2>${t("empty")}</h2><p>${t("emptyText")}</p><a href="./index.html" class="z3-primary">${icon("shop",18)} ${t("continue")}</a></section></main></section>`;
  const storeSections=[...groups.values()].map(g=>`<section class="z3-store"><header class="z3-store-head"><span class="z3-store-icon">${icon("shop",17)}</span><div><strong>${escapeHTML(g.name)}</strong><small>${g.rows.length} ${en?"items":"bidhaa"}</small></div><span class="z3-store-shield">${icon("shield",17)}</span></header>${g.rows.map(productMarkup).join("")}</section>`).join("");
  return `<section class="z3-cart"><header class="z3-header"><a class="z3-back" href="./index.html" aria-label="Back">${icon("back")}</a><a class="z3-wordmark" href="./index.html">ⓏⓊⓃⒺ</a><span class="z3-header-count">${count} ${en?"items":"bidhaa"}</span></header>
  <main class="z3-main"><div class="z3-hero"><div><span class="z3-kicker">ⓏⓊⓃⒺ MARKETPLACE</span><h1>${en?"My Cart":"Kikapu Changu"}</h1><p>${count} ${en?"items selected":"bidhaa zimechaguliwa"}</p></div><div class="z3-hero-orb">${icon("cart",34)}<i>${count}</i></div></div>
  ${loading?`<div class="z3-notice">${t("loading")}</div>`:""}${error?`<div class="z3-error">${t("loadError")} <button data-cart-retry>${t("retry")}</button></div>`:""}
  <div class="z3-content"><section class="z3-products"><div class="z3-selection"><label class="z3-check-wrap"><input type="checkbox" data-cart-select-all checked><span></span></label><strong>${en?"Select all products":"Chagua bidhaa zote"}</strong><button data-cart-remove-selected>${icon("trash",15)} ${en?"Remove selected":"Ondoa zilizochaguliwa"}</button></div>${storeSections}</section>
  <aside class="z3-summary"><div class="z3-summary-heading"><span class="z3-summary-icon">${icon("bag",19)}</span><div><h2>${t("summary")}</h2><small>${en?"Secure order overview":"Muhtasari wa oda yako"}</small></div></div><div class="z3-summary-row"><span>${t("items")}</span><b>${count}</b></div><div class="z3-summary-row"><span>${t("subtotal")}</span><b data-cart-subtotal>${fmt(subtotal)}</b></div><div class="z3-summary-row"><span>${en?"Delivery fee":"Gharama ya delivery"}</span><b class="z3-muted">${en?"Calculated next":"Itahesabiwa"}</b></div><div class="z3-total"><span>${t("total")}</span><strong data-cart-total>${fmt(subtotal)}</strong></div><button class="z3-primary z3-checkout" data-cart-checkout>${icon("lock",17)} ${t("checkout")} ${icon("arrow",17)}</button><p class="z3-secure-note">${icon("shield",13)} ${en?"Your cart is private and secure":"Kikapu chako kinalindwa kwenye akaunti yako"}</p><a href="./index.html" class="z3-continue">${icon("shop",16)} ${t("continue")}</a></aside></div></main>
  <nav class="z3-mobile-bar"><div><small>${en?"Items total":"Jumla ya bidhaa"}</small><strong data-cart-total-mobile>${fmt(subtotal)}</strong></div><button data-cart-checkout>${t("checkout")} ${icon("arrow",16)}</button></nav></section>`;
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
  if(!root)return;
  const previous=mountedRoots.get(root);if(previous)previous();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError)throw authError;
  if(!user?.id){root.innerHTML='<section class="z3-cart"><div class="z3-login"><div class="z3-empty-orb">Ⓩ</div><h2>Ingia ZUNE</h2><p>Tafadhali ingia kwenye akaunti yako kuona kikapu chako.</p><a class="z3-primary" href="./index.html">Rudi sokoni</a></div></section>';return;}
  const userId=user.id,language=localStorage.getItem(LANG_KEY)==="en"?"en":"sw";
  document.documentElement.lang=language;
  let cart=readCart(userId),products=[];
  const cloud=await supabase.from("cart_items").select("product_id,variant_id,quantity").eq("user_id",userId);
  if(!cloud.error){
    const marker="zune_collections_cloud_ready:"+userId;
    if(localStorage.getItem(marker)==="1")cart=(cloud.data||[]).map(x=>({productId:x.product_id,variantId:x.variant_id||null,quantity:x.quantity}));
    else{const map=new Map((cloud.data||[]).map(x=>[String(x.product_id)+"::"+String(x.variant_id||""),{productId:x.product_id,variantId:x.variant_id||null,quantity:Number(x.quantity)||1}]));cart.forEach(x=>map.set(cartItemKey(x),x));cart=[...map.values()];await persistCartToCloud(cart,userId);localStorage.setItem(marker,"1");}
    localStorage.setItem(cartStorageKey(userId),JSON.stringify(cart));
  } else console.warn("Cart cloud load:",cloud.error.message);
  let unbind=()=>{},token=0;
  const render=()=>{root.innerHTML=renderCartPage({cart,products,language});syncCartCountBadges(cart);};
  const load=async()=>{const n=++token;render();if(!cart.length){products=[];render();return;}try{products=await loadCartProducts(cart);if(n===token)render();}catch(e){console.error(e);if(n===token){render();const notice=root.querySelector(".z3-notice");if(notice)notice.textContent=text(language,"loadError");}}};
  const selected=()=>[...root.querySelectorAll("[data-cart-select]:checked")].map(x=>x.dataset.cartSelect);
  unbind=bindCartEvents(root,{
    onQuantityChange:(key,delta)=>{const item=cart.find(x=>cartItemKey(x)===key);if(!item)return;item.quantity=Math.min(MAX_QTY,Math.max(1,item.quantity+delta));cart=writeCart(cart,userId);render();},
    onRemove:key=>{cart=writeCart(cart.filter(x=>cartItemKey(x)!==key),userId);void load();},
    onRemoveSelected:keys=>{const set=new Set(keys);cart=writeCart(cart.filter(x=>!set.has(cartItemKey(x))),userId);void load();},
    onContinueShopping:()=>window.location.assign("./index.html"),
    onCheckout:keys=>{if(!keys?.length)return;sessionStorage.setItem("zune_checkout_selected_items:"+userId,JSON.stringify(keys));window.location.assign("./checkout.html");},
    onRetry:()=>{products=[];void load();}
  });
  const onStorage=e=>{if(e.key===cartStorageKey(userId)){cart=readCart(userId);void load();}};
  window.addEventListener("storage",onStorage);
  mountedRoots.set(root,()=>{unbind();window.removeEventListener("storage",onStorage);mountedRoots.delete(root);});
  await load();
}
