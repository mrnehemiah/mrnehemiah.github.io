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
export function renderCartPage({ cart = [], products = [], language = "sw", loading = false, error = false } = {}) {
  const t = key => text(language, key);
  const { rows, subtotal, count } = computeTotals(cart, products);
  const storeLabel = row => row.product?.store_name || row.product?.seller_name || row.product?.vendor_name || "ZUNE Store";
  const groupedRows = [];
  const groups = new Map();
  rows.forEach(row => { const p=row.product||{}; const key=String(p.store_id||p.seller_id||p.user_id||storeLabel(row)); if(!groups.has(key)) groups.set(key,{name:storeLabel(row),rows:[]}); groups.get(key).rows.push(row); });
  groups.forEach((group,key)=>groupedRows.push({...group,key}));

  if (!cart.length) {
    return `
      <section class="z-home z-cart-page">
        <main class="z-home-content z-cart-content">
          <header class="z-cart-heading">
            <div><span class="z-cart-eyebrow">ⓏⓊⓃⒺ MARKETPLACE</span><h1 class="z-page-title">${t("title")}</h1><p>${t("subtitle")}</p></div>
            <span class="z-cart-heading-icon" aria-hidden="true">🛒</span>
          </header>
          <section class="z-cart-empty">
            <div class="z-cart-empty-art" aria-hidden="true"><span>🛍️</span></div>
            <h2>${t("empty")}</h2><p>${t("emptyText")}</p>
            <button type="button" class="z-primary-button" data-cart-continue>${t("continue")}</button>
          </section>
        </main>
      </section>`;
  }

  return `
    <section class="z-home z-cart-page">
      <main class="z-home-content z-cart-content">
        <header class="z-cart-heading">
          <div><span class="z-cart-eyebrow">ⓏⓊⓃⒺ MARKETPLACE</span><h1 class="z-page-title">${t("title")}</h1><p>${count} ${t("items")}</p></div>
          <span class="z-cart-heading-icon" aria-hidden="true">🛒</span>
        </header>
        ${loading ? `<p class="z-cart-status" role="status">${t("loading")}</p>` : ""}
        ${error ? `<p class="z-cart-status error" role="alert">${t("loadError")}</p>
                   <button type="button" class="z-secondary-button" data-cart-retry>${t("retry")}</button>` : ""}
        <div class="z-cart-selection-bar"><label><input type="checkbox" data-cart-select-all checked> <span>${language === "en" ? "Select all" : "Chagua zote"}</span></label><button type="button" data-cart-remove-selected>${language === "en" ? "Remove selected" : "Ondoa zilizochaguliwa"}</button></div>
        <div class="z-cart-layout">
          <section class="z-cart-items" aria-label="${t("title")}">
            ${groupedRows.map(group => `
              <section class="z-cart-store-group" data-cart-store="${escapeHTML(group.key)}">
                <header class="z-cart-store-heading"><span class="z-cart-store-icon">▣</span><strong>${escapeHTML(group.name)}</strong><span>${group.rows.length} ${language === "en" ? "items" : "bidhaa"}</span></header>
                ${group.rows.map(row => {
              const product = row.product;
              const quantity = row.quantity;
              if (!product) return `
                <article class="z-cart-item z-cart-item-unavailable" data-cart-row="${escapeHTML(row.cartKey)}">
                  <div class="z-cart-item-placeholder" aria-hidden="true">📦</div>
                  <div class="z-cart-item-info"><h3>${t("unavailable")}</h3><p>${escapeHTML(row.productId)}</p></div>
                  <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.cartKey)}">${t("remove")}</button>
                </article>`;
              const image = product.image_url || "";
              return `
                <article class="z-cart-item" data-cart-row="${escapeHTML(row.cartKey)}">
                  <input class="z-cart-select" type="checkbox" data-cart-select="${escapeHTML(row.cartKey)}" checked aria-label="${language === "en" ? "Select item" : "Chagua bidhaa"}">
                  ${image
                    ? `<img class="z-cart-product-image" src="${escapeHTML(image)}" alt="${escapeHTML(product.title || "Product")}" loading="lazy">`
                    : `<div class="z-cart-item-placeholder" aria-hidden="true">📦</div>`}
                  <div class="z-cart-item-info">
                    <h3>${escapeHTML(product.title || (language === "en" ? "Product" : "Bidhaa"))}</h3>
                    <strong class="z-cart-unit-price">${money(row.unitPrice, language)}</strong>${row.variant ? `<small class="z-cart-variant-label">${escapeHTML(row.variant.label)}</small>` : ""}
                    <div class="z-quantity-controls" role="group" aria-label="${t("quantity")}">
                      <button type="button" data-cart-minus="${escapeHTML(row.cartKey)}" aria-label="${t("decreaseQty")}" ${quantity <= 1 ? "disabled" : ""}>−</button>
                      <span aria-live="polite">${quantity}</span>
                      <button type="button" data-cart-plus="${escapeHTML(row.cartKey)}" aria-label="${t("increaseQty")}" ${quantity >= Math.min(MAX_QTY, Number(row.variant?.stock_quantity ?? MAX_QTY)) ? "disabled" : ""}>+</button>
                    </div>
                  </div>
                  <div class="z-cart-item-end">
                    <strong class="z-cart-line-total">${money(row.lineTotal, language)}</strong>
                    <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.cartKey)}">${t("remove")}</button>
                  </div>
                </article>`;
            }).join("")}
              </section>
            `).join("")}
          </section>
          <aside class="z-cart-summary">
            <h2>${t("summary")}</h2>
            <div class="z-cart-summary-row"><span>${t("subtotal")}</span><strong data-cart-subtotal>${money(subtotal, language)}</strong></div>
            <div class="z-cart-summary-total"><span>${t("total")}</span><strong data-cart-total>${money(subtotal, language)}</strong></div>
            <button type="button" class="z-primary-button z-cart-checkout" data-cart-checkout>${t("checkout")}</button>
            <p class="z-cart-checkout-note">${t("checkoutNote")}</p>
            <button type="button" class="z-continue-shopping" data-cart-continue>${t("continue")}</button>
          </aside>
        </div>
      </main>
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

  // Cleanup mount ya awali (kama ipo) – muhimu kwa SPA
  const prev = mountedRoots.get(root);
  if (prev) prev();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user?.id) {
    root.innerHTML = '<p role="status">Tafadhali ingia kwenye akaunti yako kuona kikapu.</p>';
    return;
  }
  const userId = user.id;

  const language = localStorage.getItem(LANG_KEY) === "en" ? "en" : "sw";
  const theme = localStorage.getItem(THEME_KEY) || "emerald";
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = language;

  let cart = readCart(userId);
  const cloudReadyKey = "zune_collections_cloud_ready:" + userId;
  try {
    const cloud = await supabase.from("cart_items").select("product_id,variant_id,quantity").eq("user_id", userId);
    if (cloud.error) throw cloud.error;
    if (localStorage.getItem(cloudReadyKey) === "1") {
      cart = (cloud.data || []).map(row => ({ productId: row.product_id, variantId:row.variant_id||null, quantity: row.quantity }));
    } else {
      const merged = new Map((cloud.data || []).map(row => [String(row.product_id)+"::"+String(row.variant_id||""), { productId: row.product_id, variantId:row.variant_id||null, quantity: Number(row.quantity) || 1 }]));
      cart.forEach(item => {
        const id = cartItemKey(item), existing = merged.get(id);
        merged.set(id, { productId: item.productId, variantId:item.variantId||null, quantity: Math.max(Number(item.quantity) || 1, existing?.quantity || 1) });
      });
      cart = [...merged.values()];
      await persistCartToCloud(cart, userId);
    }
    localStorage.setItem(cartStorageKey(userId), JSON.stringify(cart));
    localStorage.setItem(cloudReadyKey, "1");
  } catch (error) {
    console.warn("ZUNE cart cloud load; using device cache:", error.message);
  }
  const productsById = new Map();
  let renderToken = 0;

  syncCartCountBadges(cart);

  /* --- Rendering helpers --- */
  const renderFull = ({ loading = false, error = false } = {}) => {
    root.innerHTML = renderCartPage({
      cart,
      products: [...productsById.values()],
      language,
      loading,
      error
    });
  };

  const patchQuantity = (key, quantity, product) => {
    const row = root.querySelector(`[data-cart-row="${CSS.escape(String(key))}"]`);
    if (!row) return false;

    const span = row.querySelector(".z-quantity-controls span");
    if (span) span.textContent = String(quantity);

    const minus = row.querySelector("[data-cart-minus]");
    const plus  = row.querySelector("[data-cart-plus]");
    const item=cart.find(x=>cartItemKey(x)===String(key));
    const variant=item?.variantId?(product.__zuneVariants||[]).find(v=>String(v.id)===String(item.variantId)):null;
    if (minus) minus.disabled = quantity <= 1;
    if (plus)  plus.disabled  = quantity >= Math.min(MAX_QTY, Number(variant?.stock_quantity ?? MAX_QTY));

    const lineTotal = row.querySelector(".z-cart-line-total");
    const rawUnitPrice=Number(variant?.price ?? product.price ?? 0);
    const discountPercent=Math.min(100,Math.max(0,Number(product.discount_percent||0)));
    if (lineTotal) lineTotal.textContent = money(Math.round(rawUnitPrice*(1-discountPercent/100)*100)/100 * quantity, language);
    return true;
  };

  const patchSummary = () => {
    const { subtotal, count } = computeTotals(cart, [...productsById.values()]);
    const sub = root.querySelector("[data-cart-subtotal]");
    const tot = root.querySelector("[data-cart-total]");
    if (sub) sub.textContent = money(subtotal, language);
    if (tot) tot.textContent = money(subtotal, language);

    const heading = root.querySelector(".z-cart-heading p");
    if (heading) heading.textContent = `${count} ${text(language, "items")}`;
  };

  const allProductsLoaded = () =>
    cart.every(item => productsById.has(String(item.productId)));

  const ensureProductsLoaded = async () => {
    const missing = cart
      .map(i => String(i.productId))
      .filter(id => !productsById.has(id));
    if (!missing.length) return;

    const missingSet = new Set(missing);
    const partial = cart.filter(i => missingSet.has(String(i.productId)));
    const loaded = await loadCartProducts(partial); // inaweza kutupa
    for (const p of loaded) productsById.set(String(p.id), p);
  };

  /* --- Refresh (full render) --- */
  const refresh = async () => {
    const token = ++renderToken;
    cart = readCart(userId);

    if (!cart.length) {
      productsById.clear();
      renderFull();
      return;
    }

    const hasMissing = !allProductsLoaded();
    renderFull({ loading: hasMissing });

    if (hasMissing) {
      try {
        await ensureProductsLoaded();
        if (token !== renderToken) return; // refresh mpya imechukua nafasi

        const scrollY = window.scrollY;
        renderFull();
        window.scrollTo(0, scrollY);
      } catch (error) {
        if (token !== renderToken) return;
        console.error("ZUNE cart load error:", error);
        renderFull({ error: true });
      }
    }
  };

  /* --- Bind events --- */
  bindCartEvents(root, {
    onQuantityChange: (id, delta) => {
      const item = cart.find(r => cartItemKey(r) === String(id));
      if (!item) return;

      const next = Math.min(MAX_QTY, Math.max(1, Number(item.quantity || 1) + delta));
      if (next === item.quantity) return;

      item.quantity = next;
      cart = writeCart(cart, userId);

      if (allProductsLoaded()) {
        const product = productsById.get(String(item.productId));
        if (patchQuantity(id, next, product)) {
          patchSummary();
        } else {
          renderFull(); // fallback
        }
      } else {
        refresh(); // bidhaa bado zinapakia – usifanye patch
      }
    },

    onRemove: id => {
      cart = writeCart(cart.filter(r => cartItemKey(r) !== String(id)), userId);

      if (!cart.length) {
        productsById.clear();
        renderFull();
        return;
      }

      if (allProductsLoaded()) {
        const row = root.querySelector(`[data-cart-row="${CSS.escape(String(id))}"]`);
        if (row) {
          row.remove();
          patchSummary();
        } else {
          renderFull();
        }
      } else {
        refresh();
      }
    },

    onContinueShopping: () => window.location.assign("./index.html"),
    onCheckout: () => window.location.assign("./checkout.html"),
    onRetry: () => refresh()
  });

  /* --- Cross-tab sync --- */
  const onStorage = event => {
    if (event.key === CART_KEY) refresh();
  };
  window.addEventListener("storage", onStorage);

  /* --- Cleanup registration --- */
  mountedRoots.set(root, () => {
    window.removeEventListener("storage", onStorage);
    boundRoots.get(root)?.();
    mountedRoots.delete(root);
  });

  await refresh();
}