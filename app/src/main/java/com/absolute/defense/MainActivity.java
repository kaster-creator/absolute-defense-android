package com.absolute.defense;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        webView = new WebView(this);
        webView.setBackgroundColor(0xff171321);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setDefaultTextEncodingName("UTF-8");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
        checkUpdates();
    }

    // ABS_UPDATE_CHECK_V1
    private void checkUpdates() {
        new Thread(() -> {
            java.net.HttpURLConnection conn = null;
            try {
                java.net.URL url = new java.net.URL(
                    "https://raw.githubusercontent.com/" +
                    "kaster-creator/absolute-defense-android/" +
                    "auto-updates-5/updates/version.json"
                );

                conn = (java.net.HttpURLConnection)
                    url.openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setUseCaches(false);

                if (conn.getResponseCode() != 200)
                    throw new Exception("HTTP error");

                java.io.ByteArrayOutputStream out =
                    new java.io.ByteArrayOutputStream();

                try (java.io.InputStream in = conn.getInputStream()) {
                    byte[] buffer = new byte[4096];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        if (out.size() + n > 65536)
                            throw new Exception("Manifest too large");
                        out.write(buffer, 0, n);
                    }
                }

                org.json.JSONObject data =
                    new org.json.JSONObject(out.toString("UTF-8"));

                String version = data.getString("version");

                android.util.Log.i(
                    "ABS_UPDATE",
                    "Available version: " + version
                );

            } catch (Exception e) {
                android.util.Log.w(
                    "ABS_UPDATE",
                    "Check failed: " + e.getMessage()
                );
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @Override public void onBackPressed() {
        new android.app.AlertDialog.Builder(this)
            .setTitle("ABSOLUTE DEFENSE")
            .setMessage("Выйти из игры?")
            .setNegativeButton("Отмена", (d, w) -> {})
            .setPositiveButton("Выйти", (d, w) -> finish())
            .show();
    }
    @Override protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
