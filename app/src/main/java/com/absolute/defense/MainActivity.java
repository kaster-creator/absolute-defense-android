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
        // ABS_ASSET_LOADER_V1
        androidx.webkit.WebViewAssetLoader loader =
            new androidx.webkit.WebViewAssetLoader.Builder()
                // ABS_ACTIVE_PATH_HANDLER_V1
                .addPathHandler(
                    "/updates/",
                    new androidx.webkit.WebViewAssetLoader.PathHandler() {
                        @Override
                        public android.webkit.WebResourceResponse handle(
                            String path
                        ) {
                            try {
                                java.io.File root = new java.io.File(
                                    getFilesDir(), "game_updates/active"
                                );

                                java.io.File file = new java.io.File(
                                    root, path
                                );

                                String base = root.getCanonicalPath()
                                    + java.io.File.separator;

                                if (!file.getCanonicalPath().startsWith(base)
                                    || !file.isFile()) {
                                    return null;
                                }

                                String mime = android.webkit.MimeTypeMap
                                    .getSingleton()
                                    .getMimeTypeFromExtension(
                                        android.webkit.MimeTypeMap
                                            .getFileExtensionFromUrl(
                                                file.getName()
                                            )
                                    );

                                if (mime == null)
                                    mime = "application/octet-stream";

                                return new android.webkit.WebResourceResponse(
                                    mime,
                                    "UTF-8",
                                    new java.io.FileInputStream(file)
                                );

                            } catch (Exception e) {
                                return null;
                            }
                        }
                    }
                )
                .addPathHandler(
                    "/assets/",
                    new androidx.webkit.WebViewAssetLoader
                        .AssetsPathHandler(this)
                )
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                WebView view,
                android.webkit.WebResourceRequest request
            ) {
                
                // ABS_FILE_UPDATE_INTERCEPT_V1
                try {
                    android.net.Uri uri = request.getUrl();

                    if ("file".equals(uri.getScheme())
                        && "android_asset".equals(uri.getHost())) {

                        String path = uri.getPath();

                        if (path != null && path.startsWith("/")) {
                            String name = path.substring(1);

                            // Не подменяем HTML: сохраняем origin игры
                            if (name.equals("script.js")
                                || name.equals("style.css")) {

                                java.io.File root = new java.io.File(
                                    getFilesDir(), "game_updates/active"
                                );

                                java.io.File file = new java.io.File(
                                    root, name
                                );

                                if (file.isFile()) {
                                    String mime = name.endsWith(".js")
                                        ? "application/javascript"
                                        : "text/css";

                                    return new android.webkit.WebResourceResponse(
                                        mime,
                                        "UTF-8",
                                        new java.io.FileInputStream(file)
                                    );
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    android.util.Log.e(
                        "ABS_UPDATE", "Resource interception failed", e
                    );
                }

                return loader.shouldInterceptRequest(request.getUrl());

            }

            // ABS_AUTO_SAVE_BACKUP_V1
            @Override
            public void onPageFinished(
                WebView view, String url
            ) {
                super.onPageFinished(view, url);

                if ("file:///android_asset/index.html".equals(url)) {
                    exportGameSave();
                }
            }
        });
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


    // ABS_SAVE_BRIDGE_V1
    private void exportGameSave() {
        webView.evaluateJavascript(
            "(function(){"
            + "if(window.absoluteExportSave)"
            + "return window.absoluteExportSave();"
            + "return null;"
            + "})()",
            result -> {
                try {
                    if (result == null ||
                        result.equals("null")) {
                        return;
                    }

                    String json = new org.json.JSONTokener(
                        result
                    ).nextValue().toString();

                    java.io.File file = new java.io.File(
                        getFilesDir(), "game_save_backup.json"
                    );

                    try (java.io.FileOutputStream out =
                        new java.io.FileOutputStream(file)) {
                        out.write(json.getBytes(
                            java.nio.charset.StandardCharsets.UTF_8
                        ));
                    }

                    android.util.Log.i(
                        "ABS_SAVE", "Backup created"
                    );
                } catch (Exception e) {
                    android.util.Log.e(
                        "ABS_SAVE", "Backup failed", e
                    );
                }
            }
        );
    }


    // ABS_SAVE_RESTORE_V1
    private void restoreGameSave() {
        java.io.File file = new java.io.File(
            getFilesDir(), "game_save_backup.json"
        );

        if (!file.isFile()) return;

        try {
            byte[] bytes = java.nio.file.Files.readAllBytes(
                file.toPath()
            );

            String json = new String(
                bytes,
                java.nio.charset.StandardCharsets.UTF_8
            );

            org.json.JSONObject data =
                new org.json.JSONObject(json);

            String script = "(function(){"
                + "var data=" + data.toString() + ";"
                + "for(var k in data){"
                + "if(Object.prototype.hasOwnProperty.call(data,k)"
                + " && typeof data[k]==='string'"
                + " && localStorage.getItem(k)===null){"
                + "localStorage.setItem(k,data[k]);"
                + "}"
                + "}"
                + "})()";

            webView.evaluateJavascript(script, null);

            android.util.Log.i(
                "ABS_SAVE", "Restore requested"
            );

        } catch (Exception e) {
            android.util.Log.e(
                "ABS_SAVE", "Restore failed", e
            );
        }
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
                downloadUpdatePackage(data);

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


    // ABS_PACKAGE_DOWNLOADER_V1
    private void downloadUpdatePackage(
        org.json.JSONObject manifest
    ) throws Exception {

        org.json.JSONObject pkg =
            manifest.optJSONObject("package");

        if (pkg == null) {
            android.util.Log.i(
                "ABS_UPDATE", "No update package published"
            );
            return;
        }

        String version = manifest.getString("version");

        // ABS_UPDATE_VERSION_GUARD_V1
        android.content.SharedPreferences prefs =
            getSharedPreferences("abs_updates", MODE_PRIVATE);

        if (version.equals(
                prefs.getString("installed_version", ""))) {
            android.util.Log.i(
                "ABS_UPDATE", "Version already installed"
            );
            return;
        }

        String urlText = pkg.getString("url");
        String expected = pkg.getString("sha256")
            .toLowerCase(java.util.Locale.ROOT);

        if (!expected.matches("[0-9a-f]{64}"))
            throw new Exception("Invalid SHA-256");

        java.net.URL url = new java.net.URL(urlText);

        if (!"https".equals(url.getProtocol()) ||
            !"raw.githubusercontent.com".equals(
                url.getHost())) {
            throw new Exception("Untrusted download host");
        }

        java.io.File dir = new java.io.File(
            getFilesDir(), "game_updates"
        );

        if (!dir.exists() && !dir.mkdirs())
            throw new Exception("Cannot create directory");

        java.io.File target =
            new java.io.File(dir, "pending.zip");

        java.io.File temp =
            new java.io.File(dir, "pending.tmp");

        java.net.HttpURLConnection connection = null;

        try {
            connection = (java.net.HttpURLConnection)
                url.openConnection();

            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);

            if (connection.getResponseCode() != 200)
                throw new Exception("Download HTTP error");

            java.security.MessageDigest digest =
                java.security.MessageDigest.getInstance("SHA-256");

            long total = 0;
            long limit = 20L * 1024 * 1024;

            try (
                java.io.InputStream input =
                    connection.getInputStream();
                java.io.FileOutputStream output =
                    new java.io.FileOutputStream(temp)
            ) {
                byte[] buffer = new byte[8192];
                int count;

                while ((count = input.read(buffer)) != -1) {
                    total += count;

                    if (total > limit)
                        throw new Exception("Package too large");

                    digest.update(buffer, 0, count);
                    output.write(buffer, 0, count);
                }

                output.getFD().sync();
            }

            byte[] hash = digest.digest();
            StringBuilder actual = new StringBuilder();

            for (byte b : hash)
                actual.append(
                    String.format(
                        java.util.Locale.ROOT,
                        "%02x", b & 255
                    )
                );

            if (!expected.equals(actual.toString()))
                throw new Exception("SHA-256 mismatch");

            if (target.exists() && !target.delete())
                throw new Exception("Cannot replace package");

            if (!temp.renameTo(target))
                throw new Exception("Cannot save package");

            extractVerifiedPackage(target);
            activateUpdate();

            prefs.edit()
                .putString("installed_version", version)
                .apply();

            android.util.Log.i(
                "ABS_UPDATE",
                "Verified package downloaded: " + version
            );

        } finally {
            if (connection != null)
                connection.disconnect();

            if (temp.exists())
                temp.delete();
        }
    }


    // ABS_SAFE_EXTRACT_V1
    private void extractVerifiedPackage(
        java.io.File zipFile
    ) throws Exception {

        java.io.File base = new java.io.File(
            getFilesDir(), "game_updates"
        );

        java.io.File staging = new java.io.File(
            base, "staging"
        );

        deleteUpdateTree(staging);

        if (!staging.mkdirs())
            throw new Exception("Cannot create staging");

        try {
            int files = 0;
            long total = 0;
            final long maxTotal = 40L * 1024 * 1024;

            try (java.util.zip.ZipInputStream input =
                new java.util.zip.ZipInputStream(
                    new java.io.FileInputStream(zipFile)
                )) {

                java.util.zip.ZipEntry entry;
                byte[] buffer = new byte[8192];

                String root = staging.getCanonicalPath()
                    + java.io.File.separator;

                while ((entry = input.getNextEntry()) != null) {
                    if (++files > 200)
                        throw new Exception("Too many files");

                    String name = entry.getName();

                    if (name.startsWith("/") ||
                        name.contains("\\") ||
                        name.contains(":"))
                        throw new Exception("Unsafe ZIP path");

                    java.io.File output = new java.io.File(
                        staging, name
                    );

                    String resolved = output.getCanonicalPath();

                    if (!resolved.startsWith(root))
                        throw new Exception("ZIP path traversal");

                    if (entry.isDirectory()) {
                        if (!output.isDirectory() &&
                            !output.mkdirs())
                            throw new Exception("Directory error");
                    } else {
                        java.io.File parent = output.getParentFile();

                        if (!parent.isDirectory() &&
                            !parent.mkdirs())
                            throw new Exception("Directory error");

                        try (java.io.FileOutputStream stream =
                            new java.io.FileOutputStream(output)) {

                            int n;
                            while ((n = input.read(buffer)) != -1) {
                                total += n;

                                if (total > maxTotal)
                                    throw new Exception("ZIP too large");

                                stream.write(buffer, 0, n);
                            }
                        }
                    }

                    input.closeEntry();
                }
            }

            for (String required : new String[]{
                "index.html", "script.js", "style.css"
            }) {
                java.io.File file = new java.io.File(
                    staging, required
                );

                if (!file.isFile() || file.length() == 0)
                    throw new Exception(
                        "Missing game file: " + required
                    );
            }

            android.util.Log.i(
                "ABS_UPDATE",
                "Game package extracted and validated"
            );

        } catch (Exception e) {
            deleteUpdateTree(staging);
            throw e;
        }
    }

    private void deleteUpdateTree(
        java.io.File file
    ) throws Exception {
        if (!file.exists()) return;

        if (file.isDirectory()) {
            java.io.File[] children = file.listFiles();

            if (children == null)
                throw new Exception("Cannot list directory");

            for (java.io.File child : children)
                deleteUpdateTree(child);
        }

        if (!file.delete())
            throw new Exception("Cannot delete update file");
    }


    // ABS_UPDATE_ACTIVATION_V1
    private void activateUpdate() throws Exception {
        java.io.File base = new java.io.File(
            getFilesDir(), "game_updates"
        );

        java.io.File staging = new java.io.File(
            base, "staging"
        );

        java.io.File active = new java.io.File(
            base, "active"
        );

        java.io.File backup = new java.io.File(
            base, "previous"
        );

        if (!new java.io.File(
            staging, "index.html"
        ).isFile()) {
            throw new Exception("Update not ready");
        }

        deleteUpdateTree(backup);

        if (active.exists() &&
            !active.renameTo(backup)) {
            throw new Exception("Backup failed");
        }

        if (!staging.renameTo(active)) {
            if (backup.exists()) {
                backup.renameTo(active);
            }
            throw new Exception("Activation failed");
        }

        android.util.Log.i(
            "ABS_UPDATE",
            "Update files activated"
        );
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
