import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getMessaging, getToken, isSupported, onMessage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPykm1b3Y1yA2hO_SeIAFoRyKUdUp8Ido",
  authDomain: "zune-59f3f.firebaseapp.com",
  projectId: "zune-59f3f",
  storageBucket: "zune-59f3f.firebasestorage.app",
  messagingSenderId: "969021746816",
  appId: "1:969021746816:web:1a7997693d0cae540a8065",
  measurementId: "G-64SNB2KDQM"
};

const VAPID_PUBLIC_KEY = "BOiDkV9zxZIewyc8O9GUQDM14ZFJHDTaLOacQAWLp0WlIlVVpwk2Mgk_u_jOA4juq-bMkry0qFKE_aX7zRIiUYY";
let setupPromise = null;

function safeNotificationUrl(rawUrl) {
  try {
    const target = new URL(rawUrl || "./notifications.html", window.location.origin);
    return target.origin === window.location.origin ? target.href : new URL("./notifications.html", window.location.origin).href;
  } catch {
    return new URL("./notifications.html", window.location.origin).href;
  }
}

export async function setupZunePushNotifications(supabase, user) {
  const button = document.getElementById("zune-enable-push");
  const status = document.getElementById("zune-push-status");
  if (!button || !status || !user) return;

  const say = (message, isError = false) => {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "success";
  };

  // Android WebView uses the native FCM bridge; it does not need browser Web Push.
  if (window.AndroidZunePush && typeof window.zuneSyncNativePush === "function") {
    button.hidden = true;
    say("Programu ya ZUNE inatumia Android Firebase Push. Kifaa kitasajiliwa kupitia akaunti yako.");
    window.zuneSyncNativePush();
    return;
  }

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    button.disabled = true;
    say("Kifaa au kivinjari hiki hakiungi mkono Web Push.", true);
    return;
  }

  if (Notification.permission === "granted") {
    button.textContent = "Arifa za kifaa zimewashwa";
  } else if (Notification.permission === "denied") {
    button.textContent = "Ruhusu arifa kwenye mipangilio ya kivinjari";
  }

  if (!button.dataset.pushBound) {
    button.dataset.pushBound = "true";
    button.addEventListener("click", async () => {
      if (setupPromise) return;
      button.disabled = true;
      say("Inaandaa arifa za kifaa hiki...");

      setupPromise = (async () => {
        if (!(await isSupported())) {
          throw new Error("Firebase Messaging haitumiki kwenye kivinjari hiki.");
        }

        const permission = Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

        if (permission !== "granted") {
          throw new Error("Ruhusa ya notifications haijatolewa. Ruhusu arifa kwenye browser settings.");
        }

        const registration = await navigator.serviceWorker.register(
          new URL("./firebase-messaging-sw.js", window.location.href),
          { scope: "./" }
        );
        await navigator.serviceWorker.ready;

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_PUBLIC_KEY,
          serviceWorkerRegistration: registration
        });

        if (!token) throw new Error("Firebase haikutoa kifaa token. Jaribu tena.");

        const now = new Date().toISOString();
        const { error } = await supabase.rpc("zune_register_push_token", {
          p_fcm_token: token,
          p_platform: "web",
          p_user_agent: navigator.userAgent || "ZUNE Web"
        });

        if (error) throw error;

        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || payload.data?.title || "ZUNE";
          const body = payload.notification?.body || payload.data?.body || "Una taarifa mpya kutoka ZUNE.";
          const target = safeNotificationUrl(payload.data?.action_url || payload.data?.url);
          const notification = new Notification(title, {
            body,
            icon: "./icon.svg",
            tag: payload.data?.notification_id || "zune-foreground-notification",
            data: { url: target }
          });
          notification.onclick = () => {
            window.focus();
            window.location.assign(target);
            notification.close();
          };
        });

        button.textContent = "Arifa za kifaa zimewashwa";
        say("Kifaa hiki kimesajiliwa. ZUNE inaweza kutuma arifa kwenye kifaa hiki hata ukurasa ukiwa umefungwa.");
      })();

      try {
        await setupPromise;
      } catch (error) {
        console.error("ZUNE push setup:", error);
        say(error?.message || "Imeshindikana kuwasha arifa kwenye kifaa hiki.", true);
      } finally {
        setupPromise = null;
        button.disabled = false;
      }
    });
  }

  if (Notification.permission === "granted") {
    say("Ruhusa ya arifa ipo. Bonyeza kitufe kusajili au kusasisha kifaa hiki.");
  }
}
