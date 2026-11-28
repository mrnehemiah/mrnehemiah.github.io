# ZUNE Android App

ZUNE Android is a native Java/WebView wrapper for the existing ZUNE Market and Seller Portal. It keeps the hosted marketplace and existing Supabase project as the source of truth.

- Market: https://mrnehemiah.github.io/
- Seller Portal: https://mrnehemiah.github.io/zuneacts/
- Android application ID: `com.zune.app`
- Firebase project: `zune-59f3f`
- Firebase Android App ID: `1:969021746816:android:70598e6e5f40aea10a8065`
- Native stack: Java, Android WebView, Firebase Cloud Messaging
- Backend: existing Supabase project; no separate Android database

## Notifications

- Android receives data-only Firebase Cloud Messaging payloads through `ZuneFirebaseMessagingService`, including while the WebView is backgrounded or the app process is not active (subject to Android battery/network policy).
- Android 13+ runtime notification permission is requested and notifications use the ZUNE channel and icon.
- Tapping an alert opens its internal ZUNE action URL in the app; external or untrusted hosts are rejected.
- The FCM installation token is registered through authenticated Supabase RPCs. The database derives the account from `auth.uid()`, refreshes `last_seen_at`, and reassigns a shared device token to the currently signed-in account.
- Logging out attempts to unregister the Android installation token before ending the Supabase session.
- The notification insert trigger calls the `zune-send-push` Edge Function. Firebase service-account credentials and the webhook secret must remain in Supabase secrets/Vault and must never be placed in the Android app or GitHub source.

## Build an APK

Every push that changes `android-app/**` or this workflow starts **Build ZUNE Android APK**.

1. Open the repository's Actions tab.
2. Select the latest successful **Build ZUNE Android APK** run.
3. Download the `ZUNE-Android-APK` artifact.
4. Extract `ZUNE.apk` and install it on an Android device.

The workflow verifies the APK signature and checks that its package ID is `com.zune.app`. If protected release-signing secrets are not configured, the artifact is a debug-signed test APK. A Play Store release requires the owner's protected signing key and Play Console setup; a debug APK is not a Play Store release.

For a local debug build, use JDK 17 and Gradle 8.9:

```sh
gradle -p android-app :app:assembleDebug
```

## Verified integration boundaries

Firebase project ID, Android package name, and Android App ID in `google-services.json` match this application. The Android FCM receiver, notification channel, runtime permission request, token bridge, Supabase registration RPC, and notification routing are implemented.

A real-device test of foreground, background, force-stopped, logged-out, account-switch, and notification-tap behavior is still required. Delivery depends on the Firebase service account and Supabase webhook secrets being correctly configured. Google OAuth deep-link handling, offline-first caching, Play Store signing, and Play Store in-app updates are separate release tasks.
