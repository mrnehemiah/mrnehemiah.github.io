
import { supabase } from "./supabase.js?v=phase6-push-token-ownership-20261128";
import { setupZunePushNotifications } from "./push-notifications.js?v=phase6-push-token-ownership-20261128";

/* =========================================
   ZUNE MARKETPLACE NOTIFICATIONS
========================================= */

const list = document.getElementById("notifications-list");
const unreadCount = document.getElementById("notification-unread-count");
const messageBox = document.getElementById("notifications-message");
const markAllButton = document.getElementById("mark-all-notifications-read");
const settingsButton = document.getElementById("notification-settings-button");
const preview = document.getElementById("notification-preview");
const previewDialog = preview && preview.querySelector(".z-preview-dialog");
const previewTitle = document.getElementById("z-preview-title");
const previewBody = document.getElementById("z-preview-body");
const previewTime = document.getElementById("z-preview-time");
const previewIcon = document.getElementById("z-preview-icon");
const previewType = document.getElementById("z-preview-type");
const previewUnread = document.getElementById("z-preview-unread");
const previewDetails = document.getElementById("z-preview-details");
const previewActions = document.getElementById("z-preview-actions");


let currentUser = null;
let notifications = [];
let currentFilter = "all";
let realtimeChannel = null;
let currentLanguage = "sw";

const translations = {
  sw: {
    loading: "Inapakia taarifa zako...",
    login: "Ingia kwenye akaunti yako kuona notifications.",
    loadError: "Imeshindikana kupakia notifications.",
    empty: "Hakuna taarifa kwa sasa",
    emptyDescription: "Taarifa zako mpya zitaonekana hapa.",
    markAll: "Soma zote",
    markedAll: "Notifications zote zimesomwa.",
    markError: "Imeshindikana kusoma notifications.",
    delete: "Futa",
    deleteError: "Imeshindikana kufuta notification.",
    settings: "Mipangilio ya notifications bado inaandaliwa.",
    ago: "iliyopita",
    justNow: "Sasa hivi",
    minute: "dakika",
    hour: "saa",
    day: "siku",
    all: "Zote",
    unread: "Hazijasomwa",
    read: "Zilizosomwa"
  },

  en: {
    loading: "Loading your notifications...",
    login: "Please sign in to view your notifications.",
    loadError: "Failed to load notifications.",
    empty: "No notifications yet",
    emptyDescription: "Your new notifications will appear here.",
    markAll: "Mark all read",
    markedAll: "All notifications marked as read.",
    markError: "Could not mark notifications as read.",
    delete: "Delete",
    deleteError: "Could not delete notification.",
    settings: "Notification settings are being prepared.",
    ago: "ago",
    justNow: "Just now",
    minute: "minute",
    hour: "hour",
    day: "day",
    all: "All",
    unread: "Unread",
    read: "Read"
  }
};

function t(key) {
  return translations[currentLanguage]?.[key] || translations.sw[key] || key;
}

/* =========================================
   LANGUAGE
========================================= */

function detectLanguage() {
  const savedLanguage =
    localStorage.getItem("zune-language") ||
    localStorage.getItem("zuneLanguage") ||
    localStorage.getItem("language");

  currentLanguage = savedLanguage === "en" ? "en" : "sw";
}

function updateLanguageLabels() {
  document.documentElement.lang = currentLanguage;

  const subtitle = document.querySelector(
    ".z-notifications-heading p"
  );

  if (subtitle) {
    subtitle.textContent =
      currentLanguage === "sw"
        ? "Arifa na taarifa za akaunti yako"
        : "Alerts and updates about your account";
  }

  const tabs = document.querySelectorAll(".z-notification-tab");

  tabs.forEach((tab) => {
    const filter = tab.dataset.filter;

    tab.textContent = t(filter);
  });

  markAllButton.textContent = t("markAll");
}

/* =========================================
   MESSAGE
========================================= */

function showMessage(message) {
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.hidden = false;
}

function hideMessage() {
  if (!messageBox) return;

  messageBox.hidden = true;
  messageBox.textContent = "";
}

/* =========================================
   NOTIFICATION TIME
========================================= */

function formatTime(dateValue) {
  const date = new Date(dateValue);
  const now = new Date();

  const difference = Math.max(0, now - date);

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) {
    return t("justNow");
  }

  if (minutes < 60) {
    return `${minutes} ${t("minute")} ${t("ago")}`;
  }

  if (hours < 24) {
    return `${hours} ${t("hour")} ${t("ago")}`;
  }

  if (days < 7) {
    return `${days} ${t("day")} ${t("ago")}`;
  }

  return new Intl.DateTimeFormat(
    currentLanguage === "sw" ? "sw-TZ" : "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

/* =========================================
   NOTIFICATION ICONS
========================================= */

function getNotificationIcon(type) {
  const icons = {
    general: "🔔",
    announcement: "📢",
    account: "👤",
    security: "🔐",
    seller_application: "🏪",
    seller_approved: "🎉",
    seller_rejected: "📋",
    product: "📦",
    product_published: "🛍️",
    product_moderation: "📦",
    order: "🛒",
    payment: "💳",
    refund: "↩️",
    message: "💬",
    review: "⭐",
    complaint: "⚠️",
    wallet: "👛",
    commission: "💰",
    promotion: "🎁"
  };

  return icons[type] || "🔔";
}

/* =========================================
   LOAD NOTIFICATIONS
========================================= */

async function cleanupExpiredReadNotifications() {
  if (!currentUser) return;
  const key = "zune_notification_retention:" + currentUser.id;
  const allowed = [1,2,3,4,5,6,7];
  const raw = localStorage.getItem(key);
  if (raw === "off") return;
  const saved = Number(raw || 7);
  const days = allowed.includes(saved) ? saved : 7;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("is_read", true)
    .not("read_at", "is", null)
    .lt("read_at", cutoff);
  if (error) console.warn("ZUNE notification cleanup skipped:", error);
}

async function loadNotifications() {
  if (!currentUser) return;

  await cleanupExpiredReadNotifications();
  hideMessage();

  list.setAttribute("aria-busy", "true");

  list.innerHTML = `
    <div class="z-notifications-loading">
      <div class="z-notification-spinner"></div>
      <p>${t("loading")}</p>
    </div>
  `;

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      type,
      title_sw,
      title_en,
      body_sw,
      body_en,
      action_url,
      data,
      is_read,
      created_at,
      read_at
    `)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  list.setAttribute("aria-busy", "false");

  if (error) {
    console.error("ZUNE notifications error:", error);

    list.innerHTML = "";

    showMessage(t("loadError"));

    return;
  }

  notifications = data || [];

  renderNotifications();
}

function notificationPreferenceEnabled(notification) {
  const prefs = JSON.parse(localStorage.getItem("zune_notification_preferences:" + currentUser.id) || "{}");
  const type = String(notification.type || "").toLowerCase();
  const group = ["order","payment","refund","wallet","commission"].includes(type)
    ? "orders"
    : type === "message" ? "messages"
    : ["promotion","promotions"].includes(type) ? "promotions"
    : "account";
  return prefs[group] !== false;
}

/* =========================================
   UNREAD COUNTER
========================================= */

function updateUnreadCount() {
  const total = notifications.filter(
    (notification) => !notification.is_read && notificationPreferenceEnabled(notification)
  ).length;

  unreadCount.textContent = total > 99 ? "99+" : total;

  markAllButton.disabled = total === 0;

  markAllButton.style.opacity =
    total === 0 ? "0.5" : "1";
}

/* =========================================
   RENDER NOTIFICATIONS
========================================= */

function renderNotifications() {
  updateUnreadCount();

  const filtered = notifications.filter((notification) => {
    if (!notificationPreferenceEnabled(notification)) return false;
    if (currentFilter === "unread") {
      return !notification.is_read;
    }

    if (currentFilter === "read") {
      return notification.is_read;
    }

    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="z-notifications-empty">
        <div class="z-notifications-empty-icon">🔔</div>
        <h3>${t("empty")}</h3>
        <p>${t("emptyDescription")}</p>
      </div>
    `;

    return;
  }

  list.innerHTML = "";

  filtered.forEach((notification) => {
    const item = document.createElement("article");

    item.className =
      "z-notification-item" +
      (notification.is_read ? "" : " unread");

    item.dataset.id = notification.id;

    const title =
      currentLanguage === "en"
        ? notification.title_en
        : notification.title_sw;

    const body =
      currentLanguage === "en"
        ? notification.body_en
        : notification.body_sw;

    const icon = getNotificationIcon(notification.type);

    const content = document.createElement("div");
    content.className = "z-notification-content";

    const heading = document.createElement("h3");
    heading.className = "z-notification-title";
    heading.textContent = title || "ZUNE";

    const description = document.createElement("p");
    description.className = "z-notification-body";
    description.textContent = body || "";

    const time = document.createElement("span");
    time.className = "z-notification-time";
    time.textContent = formatTime(notification.created_at);

    const iconElement = document.createElement("div");
    iconElement.className = "z-notification-icon";
    iconElement.dataset.type = String(notification.type || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    iconElement.textContent = icon;

    content.append(heading, description, time);

    item.append(iconElement, content);

    if (!notification.is_read) {
      const dot = document.createElement("span");

      dot.className = "z-notification-unread-dot";
      dot.setAttribute("aria-label", "Unread");

      item.appendChild(dot);
    }

    item.addEventListener("click", () => {
      openNotification(notification);
    });

    list.appendChild(item);
  });
}

/* =========================================
   MARK ONE AS READ
========================================= */

async function markAsRead(notification) {
  if (notification.is_read) return true;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("id", notification.id)
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    showMessage(t("markError"));

    return false;
  }

  notification.is_read = true;
  notification.read_at = new Date().toISOString();

  renderNotifications();

  return true;
}


function safeInternalUrl(rawUrl) {
  if (!rawUrl) return null;
  try { const url = new URL(rawUrl, window.location.href); return url.origin === window.location.origin ? url.href : null; }
  catch (error) { return null; }
}
function closeNotificationPreview() {
  if (!preview) return;
  preview.hidden = true;
  preview.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function addPreviewDetail(label, value) {
  if (value === undefined || value === null || value === "") return;
  const row = document.createElement("div"); row.className = "z-preview-detail";
  const name = document.createElement("span"); name.textContent = label;
  const val = document.createElement("strong"); val.textContent = String(value);
  row.append(name, val); previewDetails.appendChild(row);
}
function actionLabel(notification, action, index) {
  const data = notification.data && typeof notification.data === "object" ? notification.data : {};
  if (action && action.label) return String(action.label);
  if (data.action_label) return String(data.action_label);
  const sw = currentLanguage !== "en";
  const labels = {
    order: sw ? "Fungua oda" : "View order", payment: sw ? "Angalia malipo" : "View payment",
    refund: sw ? "Angalia marejesho" : "View refund", wallet: sw ? "Fungua wallet" : "Open wallet",
    commission: sw ? "Angalia kamisheni" : "View commission",
    seller_application: sw ? "Angalia ombi" : "View application",
    seller_approved: sw ? "Fungua dashboard" : "Open dashboard",
    seller_rejected: sw ? "Kagua ombi" : "Review application",
    product: sw ? "Angalia bidhaa" : "View product",
    product_published: sw ? "Angalia bidhaa" : "View product",
    product_moderation: sw ? "Kagua bidhaa" : "Review product",
    message: sw ? "Fungua ujumbe" : "Open message",
    review: sw ? "Angalia tathmini" : "View review",
    complaint: sw ? "Angalia malalamiko" : "View complaint",
    promotion: sw ? "Tazama ofa" : "View offer",
    announcement: sw ? "Soma taarifa" : "Read announcement",
    account: sw ? "Fungua akaunti" : "Open account",
    security: sw ? "Kagua usalama" : "Review security"
  };
  return labels[String(notification.type || "").toLowerCase()] || (index ? (sw ? "Endelea" : "Continue") : (sw ? "Fungua maelezo" : "Open details"));
}
async function renderNotificationPreview(notification) {
  if (!preview) return;
  const title = currentLanguage === "en" ? notification.title_en : notification.title_sw;
  const body = currentLanguage === "en" ? notification.body_en : notification.body_sw;
  const data = notification.data && typeof notification.data === "object" ? notification.data : {};
  previewTitle.textContent = title || "ZUNE";
  previewBody.textContent = body || "";
  previewTime.textContent = new Date(notification.created_at).toLocaleString(currentLanguage === "sw" ? "sw-TZ" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  previewIcon.dataset.type = String(notification.type || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  previewIcon.textContent = getNotificationIcon(notification.type);
  previewType.textContent = String(notification.type || "general").replace(/[_-]+/g, " ").toUpperCase();
  previewUnread.hidden = !!notification.is_read;
  previewDetails.replaceChildren();
  let displayOrderId=data.public_order_id||data.order_number||null;
  if(!displayOrderId&&(data.order_id||data.checkout_id)){
    let orderLookup=supabase.from("orders").select("public_order_id,order_number").limit(1);
    orderLookup=data.order_id?orderLookup.eq("id",data.order_id):orderLookup.eq("checkout_id",data.checkout_id);
    const {data:matchedOrder,error:orderLookupError}=await orderLookup.maybeSingle();
    if(orderLookupError)console.warn("Notification Order ID lookup:",orderLookupError.message);
    displayOrderId=matchedOrder?.public_order_id||matchedOrder?.order_number||null;
  }
  addPreviewDetail("Order ID",displayOrderId||(!data.order_id&&!data.checkout_id?data.reference:null));
  addPreviewDetail(currentLanguage === "sw" ? "Bidhaa" : "Product", data.product_name || data.product_title);
  addPreviewDetail(currentLanguage === "sw" ? "Idadi" : "Quantity", data.quantity);
  addPreviewDetail(currentLanguage === "sw" ? "Jumla" : "Total", data.total_amount ? (data.currency || "TSh") + " " + data.total_amount : null);
  addPreviewDetail(currentLanguage === "sw" ? "Hali" : "Status", data.status);
  previewDetails.hidden = !previewDetails.childElementCount;
  previewActions.replaceChildren();
  const candidates = Array.isArray(data.actions) && data.actions.length ? data.actions : (notification.action_url ? [{ url: notification.action_url }] : []);
  candidates.slice(0, 2).forEach((action, index) => {
    const target = safeInternalUrl(action.url || action.action_url);
    if (!target) return;
    const button = document.createElement("button");
    button.type = "button"; button.className = "z-preview-action" + (index ? " secondary" : "");
    button.textContent = actionLabel(notification, action, index);
    button.addEventListener("click", async () => {
      const marked = await markAsRead(notification);
      if (marked) window.location.assign(target);
    });
    previewActions.appendChild(button);
  });
  if (!previewActions.childElementCount) {
    const close = document.createElement("button");
    close.type = "button"; close.className = "z-preview-action secondary";
    close.textContent = currentLanguage === "sw" ? "Funga" : "Close";
    close.addEventListener("click", closeNotificationPreview);
    previewActions.appendChild(close);
  }
  preview.hidden = false; preview.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (previewDialog) previewDialog.focus();
}
function setupNotificationPreview() {
  if (!preview) return;
  preview.querySelectorAll("[data-preview-close]").forEach(button => button.addEventListener("click", closeNotificationPreview));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !preview.hidden) closeNotificationPreview(); });
}

/* =========================================
   OPEN NOTIFICATION
========================================= */

async function openNotification(notification) {
  const marked = await markAsRead(notification);
  if (!marked) return;
  await renderNotificationPreview(notification);
}

/* =========================================
   MARK ALL AS READ
========================================= */

async function markAllAsRead() {
  if (!currentUser) return;

  const unread = notifications.filter(
    (notification) => !notification.is_read
  );

  if (unread.length === 0) return;

  markAllButton.disabled = true;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  markAllButton.disabled = false;

  if (error) {
    console.error(error);
    showMessage(t("markError"));

    return;
  }

  notifications = notifications.map((notification) => ({
    ...notification,
    is_read: true,
    read_at: notification.is_read
      ? notification.read_at
      : new Date().toISOString()
  }));

  renderNotifications();

  showMessage(t("markedAll"));
}

/* =========================================
   DELETE NOTIFICATION
========================================= */

async function deleteNotification(id) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error(error);
    showMessage(t("deleteError"));

    return false;
  }

  notifications = notifications.filter(
    (notification) => notification.id !== id
  );

  renderNotifications();

  return true;
}

/* =========================================
   FILTER TABS
========================================= */

function setupFilters() {
  document.querySelectorAll(".z-notification-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentFilter = tab.dataset.filter;

      document.querySelectorAll(".z-notification-tab").forEach((button) => {
        button.classList.toggle(
          "active",
          button === tab
        );
      });

      renderNotifications();
    });
  });
}

/* =========================================
   SETTINGS BUTTON
========================================= */

function setupSettings() {
  if (!settingsButton) return;

  settingsButton.addEventListener("click", () => {
    window.location.assign("./settings.html?section=notifications");
  });
}

/* =========================================
   REALTIME LISTENER
========================================= */

function setupRealtime() {
  if (!currentUser) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`zune-notifications-${currentUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      (payload) => {
        const newNotification = payload.new;

        const exists = notifications.some(
          (notification) => notification.id === newNotification.id
        );

        if (!exists) {
          notifications.unshift(newNotification);

          notifications = notifications.slice(0, 100);

          renderNotifications();
        }
      }
    )
    .subscribe((status) => {
      console.log("ZUNE notification realtime:", status);
    });
}

/* =========================================
   AUTHENTICATION
========================================= */

async function initializeNotifications() {
  detectLanguage();
  updateLanguageLabels();

  if (!list) return;

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    list.setAttribute("aria-busy", "false");

    list.innerHTML = `
      <div class="z-notifications-empty">
        <div class="z-notifications-empty-icon">👤</div>
        <h3>${currentLanguage === "sw" ? "Ingia kwanza" : "Sign in first"}</h3>
        <p>${t("login")}</p>
      </div>
    `;

    return;
  }

  currentUser = data.user;

  setupZunePushNotifications(supabase, currentUser);
  setupFilters();
  setupSettings();
  setupNotificationPreview();

  markAllButton.addEventListener(
    "click",
    markAllAsRead
  );

  await loadNotifications();

  setupRealtime();
}

/* =========================================
   CLEANUP
========================================= */

window.addEventListener("pagehide", () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
});

/* =========================================
   START
========================================= */

initializeNotifications();
