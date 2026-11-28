package com.zune.app;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.Manifest;
import android.widget.Toast;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String MARKET_URL = "https://mrnehemiah.github.io/";
    private static final String SELLER_URL = "https://mrnehemiah.github.io/zuneacts/";
    private static final String RELEASE_API = "https://api.github.com/repos/mrnehemiah/mrnehemiah.github.io/releases/latest";
    private static final int FILE_CHOOSER_REQUEST = 4201;
    private static MainActivity activeActivity;

    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private BroadcastReceiver downloadReceiver;
    private long pendingDownloadId = -1L;
    private boolean updateDialogShown = false;

    private boolean isInternalUrl(String value) {
        if (value == null) return false;
        Uri uri = Uri.parse(value);
        String scheme = uri.getScheme();
        String host = uri.getHost();
        // Keep every page hosted on the official ZUNE GitHub Pages domain
        // inside the Android WebView, regardless of its path.
        return "https".equalsIgnoreCase(scheme)
                && host != null
                && "mrnehemiah.github.io".equalsIgnoreCase(host);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        activeActivity = this;
        createNotificationChannel();
        requestNotificationPermission();
        refreshFcmToken();
        getWindow().setStatusBarColor(android.graphics.Color.rgb(0, 59, 50));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(0, 59, 50));

        webView = new WebView(this);
        setContentView(webView);
        configureWebView();
        if (savedInstanceState == null) {
            String notificationTarget = getNotificationTarget(getIntent());
            webView.loadUrl(notificationTarget != null ? notificationTarget : MARKET_URL);
        }
        else webView.restoreState(savedInstanceState);
        checkForUpdates();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.addJavascriptInterface(new NativePushBridge(), "AndroidZunePush");
        webView.addJavascriptInterface(new NativeIconBridge(), "AndroidZuneIcon");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String target = request.getUrl().toString();
                if (isInternalUrl(target)) return false;
                openExternal(target);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Hakuna programu ya kuchagua faili.", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });
    }


    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "zune_notifications", "Arifa za ZUNE", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Arifa za oda, malipo na taarifa nyingine za ZUNE.");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.setSound(
                    android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 8401);
        }
    }

    private void refreshFcmToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                android.util.Log.w("ZUNE-PUSH", "Unable to obtain FCM token", task.getException());
                return;
            }
            String token = task.getResult();
            if (token == null || token.isEmpty()) return;
            getSharedPreferences("zune_fcm", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
            notifyNativePushTokenReady();
        });
    }

    private String getNotificationTarget(Intent intent) {
        if (intent == null) return null;
        String target = intent.getStringExtra("action_url");
        if (target == null || target.isEmpty()) target = intent.getStringExtra("url");
        if (target == null || target.isEmpty()) return null;
        Uri uri = Uri.parse(target);
        if (uri.getScheme() == null && target.startsWith("/")) {
            target = "https://mrnehemiah.github.io" + target;
        }
        return isInternalUrl(target) ? target : null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String target = getNotificationTarget(intent);
        if (target != null && webView != null) webView.loadUrl(target);
    }


    private class NativeIconBridge {
        @JavascriptInterface
        public boolean setLauncherIcon(String iconKey) {
            String[] aliases = {"LauncherDefault", "LauncherEmerald", "LauncherSunset", "LauncherMidnight", "LauncherAurora", "LauncherRoyal", "LauncherRose", "LauncherGraphite", "LauncherArctic", "LauncherAmber", "LauncherObsidian", "LauncherCrimson", "LauncherSapphire", "LauncherJade", "LauncherSolar", "LauncherLavender", "LauncherCoral", "LauncherGlacier", "LauncherCopper", "LauncherNeon"};
            String[] keys = {"default", "emerald", "sunset", "midnight", "aurora", "royal", "rose", "graphite", "arctic", "amber", "obsidian", "crimson", "sapphire", "jade", "solar", "lavender", "coral", "glacier", "copper", "neon"};
            int selected = -1;
            if (iconKey == null) return false;
            for (int i = 0; i < keys.length; i++) if (keys[i].equals(iconKey)) selected = i;
            if (selected < 0) return false;
            try {
                PackageManager pm = getPackageManager();
                // Enable the new launcher entry first so the app never temporarily has no launcher icon.
                android.content.ComponentName chosen = new android.content.ComponentName(
                        MainActivity.this, "com.zune.app." + aliases[selected]);
                pm.setComponentEnabledSetting(chosen,
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP);
                // Then disable every other alias, including the default launcher entry.
                for (int i = 0; i < aliases.length; i++) {
                    if (i == selected) continue;
                    android.content.ComponentName component = new android.content.ComponentName(
                            MainActivity.this, "com.zune.app." + aliases[i]);
                    pm.setComponentEnabledSetting(component,
                            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                            PackageManager.DONT_KILL_APP);
                }
                getSharedPreferences("zune_icon", MODE_PRIVATE).edit().putString("selected", iconKey).apply();
                return true;
            } catch (Exception error) {
                android.util.Log.e("ZUNE-ICON", "Unable to change launcher icon", error);
                return false;
            }
        }

        @JavascriptInterface
        public String getSelectedLauncherIcon() {
            return getSharedPreferences("zune_icon", MODE_PRIVATE).getString("selected", "default");
        }
    }

    private class NativePushBridge {
        @JavascriptInterface
        public String getFcmToken() {
            return getSharedPreferences("zune_fcm", MODE_PRIVATE).getString("fcm_token", "");
        }
    }

    public static void notifyNativePushTokenReady() {
        MainActivity activity = activeActivity;
        if (activity == null || activity.webView == null) return;
        activity.runOnUiThread(() -> activity.webView.evaluateJavascript(
                "window.zuneSyncNativePush && window.zuneSyncNativePush();", null));
    }

    private void checkForUpdates() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(RELEASE_API).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(12000);
                connection.setReadTimeout(12000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "ZUNE-Android");
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return;

                StringBuilder response = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) response.append(line);
                }

                JSONObject release = new JSONObject(response.toString());
                if (release.optBoolean("draft", false) || release.optBoolean("prerelease", false)) return;
                String notes = release.optString("body", "");
                int availableCode = parseVersionCode(notes);
                if (availableCode <= getInstalledVersionCode()) return;

                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = null;
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.optJSONObject(i);
                        if (asset != null && "ZUNE.apk".equalsIgnoreCase(asset.optString("name"))) {
                            apkUrl = asset.optString("browser_download_url", null);
                            break;
                        }
                    }
                }
                if (apkUrl == null || !apkUrl.startsWith("https://github.com/")) return;

                String cleanNotes = notes.replaceAll("(?m)^versionCode\\s*=.*$", "").trim();
                String versionName = release.optString("name", release.optString("tag_name", "Toleo jipya"));
                String finalUrl = apkUrl;
                runOnUiThread(() -> showUpdateDialog(versionName, cleanNotes, finalUrl));
            } catch (Exception ignored) {
                // Update checks must never prevent the marketplace from opening.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private int parseVersionCode(String releaseNotes) {
        try {
            java.util.regex.Matcher matcher = java.util.regex.Pattern
                    .compile("(?m)^versionCode\\s*=\\s*(\\d+)\\s*$").matcher(releaseNotes);
            return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private int getInstalledVersionCode() {
        try {
            PackageInfo info;
            if (Build.VERSION.SDK_INT >= 33) {
                info = getPackageManager().getPackageInfo(getPackageName(), PackageManager.PackageInfoFlags.of(0));
            } else {
                info = getPackageManager().getPackageInfo(getPackageName(), 0);
            }
            return Build.VERSION.SDK_INT >= 28 ? (int) info.getLongVersionCode() : info.versionCode;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private void showUpdateDialog(String version, String notes, String apkUrl) {
        if (isFinishing() || updateDialogShown) return;
        updateDialogShown = true;
        String details = notes.isEmpty() ? "Maboresho mapya na marekebisho ya mfumo." : notes;
        new AlertDialog.Builder(this)
                .setTitle("ZUNE ina sasisho jipya")
                .setMessage("Toleo: " + version + "\n\n" + details
                        + "\n\nUngependa kupakua sasisho sasa?")
                .setCancelable(true)
                .setNegativeButton("Baadaye", (dialog, which) -> {
                    updateDialogShown = false;
                    dialog.dismiss();
                })
                .setPositiveButton("Sasisha sasa", (dialog, which) -> {
                    updateDialogShown = false;
                    startApkDownload(apkUrl);
                })
                .setOnCancelListener(dialog -> updateDialogShown = false)
                .show();
    }

    private void startApkDownload(String apkUrl) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("ZUNE Update");
            request.setDescription("Inapakua sasisho la ZUNE...");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "ZUNE-update.apk");
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            pendingDownloadId = manager.enqueue(request);
            registerDownloadReceiver();
            Toast.makeText(this, "Upakuaji wa sasisho umeanza. Utaarifiwa ukikamilika.", Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "Imeshindikana kuanza upakuaji. Jaribu tena.", Toast.LENGTH_LONG).show();
        }
    }

    private void registerDownloadReceiver() {
        if (downloadReceiver != null) return;
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) != pendingDownloadId) return;
                DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                Uri apkUri = manager.getUriForDownloadedFile(pendingDownloadId);
                if (apkUri == null) {
                    Toast.makeText(MainActivity.this, "Upakuaji haujakamilika. Tafadhali jaribu tena.", Toast.LENGTH_LONG).show();
                    return;
                }
                installDownloadedApk(apkUri);
            }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(downloadReceiver, filter);
    }

    private void installDownloadedApk(Uri apkUri) {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName()));
            startActivity(permissionIntent);
            Toast.makeText(this, "Ruhusu ZUNE kusakinisha programu kutoka chanzo hiki, kisha fungua ZUNE tena.", Toast.LENGTH_LONG).show();
            return;
        }
        Intent installIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
        installIntent.setData(apkUri);
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(installIntent);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Kisakinishi cha Android hakijapatikana.", Toast.LENGTH_LONG).show();
        }
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "Kiungo hakiwezi kufunguliwa.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileUploadCallback != null) {
            fileUploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileUploadCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (webView != null) webView.saveState(state);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) { }
        }
        if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        if (activeActivity == this) activeActivity = null;
        super.onDestroy();
    }
}
