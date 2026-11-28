
import { supabase } from "./supabase.js?v=jsdelivr-sdk-20261128";

/* =====================================
   ZUNE NOTIFICATION BELL
===================================== */

let currentUser = null;
let realtimeChannel = null;
let authListener = null;
let observer = null;
let bellMount = null;
let unreadCount = 0;

/* =====================================
   STYLES
===================================== */

function addStyles() {
  if (document.getElementById("zune-bell-styles")) return;

  const style = document.createElement("style");
  style.id = "zune-bell-styles";

  style.textContent = `
    .zune-bell-mount {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .zune-bell-link {
      position: relative;
      width: 42px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color, #e5ebe7);
      border-radius: 13px;
      background: var(--bg-secondary, #f5f7f6);
      color: var(--text-primary, #17231e);
      text-decoration: none;
      font-size: 20px;
      cursor: pointer;
    }

    .zune-bell-count {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-primary, #fff);
      border-radius: 20px;
      background: #e54848;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
    }

    .zune-bell-count[hidden] {
      display: none;
    }
  `;

  document.head.appendChild(style);
}

/* =====================================
   FIND HOME HEADER
===================================== */

function findHomeActions() {
  const actions = document.querySelector(".z-home-actions");

  if (!actions) return;

  // The home-page notification link is rendered in home.js and stays visible
  // before authentication and unread-count loading complete.
  const staticBell = actions.querySelector("[data-open-notifications]");
  if (staticBell) {
    bellMount = staticBell;
    renderBell();
    return;
  }

  if (!currentUser) return;

  // MutationObserver also sees changes made inside the bell itself.
  // Do not re-render when the bell is already mounted, or the observer
  // would trigger itself continuously and freeze the entire marketplace.
  if (bellMount && bellMount.isConnected && actions.contains(bellMount)) {
    return;
  }

  if (!bellMount || !bellMount.isConnected) {
    bellMount = document.createElement("div");
    bellMount.className = "zune-bell-mount";
    bellMount.id = "zune-notification-bell";
  }

  // Keep notifications first in the approved header order: Notifications, Cart, Account.
  actions.prepend(bellMount);
  renderBell();
}

/* =====================================
   RENDER BELL
===================================== */

function renderBell() {
  if (!bellMount) return;

  // Preserve the static Home Page link and only refresh its unread badge.
  if (bellMount.matches("[data-open-notifications]")) {
    const badge = bellMount.querySelector("[data-notification-count]");
    if (badge) {
      badge.hidden = unreadCount === 0;
      badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    }
    return;
  }

  if (!currentUser) return;

  addStyles();

  bellMount.innerHTML = "";

  const link = document.createElement("a");
  link.href = "./notifications.html";
  link.className = "zune-bell-link";
  link.setAttribute("aria-label", "Notifications");
  link.title = "Notifications";

  const icon = document.createElement("span");
  icon.textContent = "🔔";

  const badge = document.createElement("span");
  badge.className = "zune-bell-count";
  badge.hidden = unreadCount === 0;
  badge.textContent = unreadCount > 99
    ? "99+"
    : String(unreadCount);

  link.append(icon, badge);
  bellMount.appendChild(link);
}

/* =====================================
   LOAD UNREAD COUNT
===================================== */

async function loadUnreadCount() {
  if (!currentUser) return;

  const userId = currentUser.id;

  const { data, error } = await supabase
    .from("notifications")
    .select("type")
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("ZUNE notification bell:", error);
    return;
  }

  if (currentUser?.id !== userId) return;

  const prefs = JSON.parse(localStorage.getItem("zune_notification_preferences") || "{}");
  unreadCount = (data || []).filter(item => {
    const type = String(item.type || "").toLowerCase();
    const group = ["order","payment","refund","wallet","commission"].includes(type)
      ? "orders"
      : type === "message" ? "messages"
      : ["promotion","promotions"].includes(type) ? "promotions"
      : "account";
    return prefs[group] !== false;
  }).length;

  renderBell();
}

/* =====================================
   REALTIME
===================================== */

function subscribeRealtime() {
  if (!currentUser) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel(`zune-bell-${currentUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      () => {
        loadUnreadCount();
      }
    )
    .subscribe();
}

/* =====================================
   SIGN IN / SIGN OUT
===================================== */

async function setUser(user) {
  if (currentUser?.id === user?.id) return;

  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  currentUser = user || null;
  unreadCount = 0;
  bellMount = null;

  if (!currentUser) return;

  findHomeActions();

  await loadUnreadCount();

  subscribeRealtime();
}

/* =====================================
   WATCH HOME HEADER
===================================== */

function watchHomeHeader() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    if (currentUser) {
      findHomeActions();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/* =====================================
   INITIALIZE
===================================== */

function initialize() {
  // Start only after the main application has rendered its first screen.
  // Supabase emits INITIAL_SESSION with the locally persisted session, so
  // this module does not need a second getUser() request during startup.
  watchHomeHeader();

  if (!authListener) {
    authListener = supabase.auth.onAuthStateChange((_event, session) => {
      void setUser(session?.user || null).catch(error => {
        console.warn("ZUNE notification session update:", error);
      });
    });
  }
}

/* =====================================
   CLEANUP
===================================== */

window.addEventListener("pagehide", () => {
  if (observer) observer.disconnect();

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
});

/* =====================================
   START
===================================== */

initialize();
