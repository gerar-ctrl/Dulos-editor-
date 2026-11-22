package com.duloseditor.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int REQ_WEBVIEW_PERMISSIONS = 9021;
    private DulosAndroidBridge dulosBridge;
    private PermissionRequest pendingWebPermissionRequest;
    private long lastBackPressMs = 0L;
    private int lastReportedKeyboardCssHeight = -1;
    private ViewTreeObserver.OnGlobalLayoutListener keyboardLayoutListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureSystemBars();

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            configureWebViewForVideoEditing(webView);
            setupKeyboardInsetBridge(webView);
        }

        // Route Android back press through the web editor's smart exit confirmation
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView currentWebView = getBridge() != null ? getBridge().getWebView() : null;
                if (currentWebView != null) {
                    currentWebView.post(() -> {
                        try {
                            currentWebView.evaluateJavascript(
                                    "window.dispatchEvent(new CustomEvent('dulos-request-exit'));",
                                    null
                            );
                        } catch (Throwable ignored) {}
                    });
                    return;
                }

                long now = System.currentTimeMillis();
                if (now - lastBackPressMs < 2000L) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                } else {
                    lastBackPressMs = now;
                    Toast.makeText(
                            MainActivity.this,
                            "Presiona Atrás nuevamente para salir",
                            Toast.LENGTH_SHORT
                    ).show();
                }
            }
        });
    }

    private void configureSystemBars() {
        try {
            Window window = getWindow();
            int darkBg = Color.parseColor("#090a0f");
            window.setStatusBarColor(darkBg);
            window.setNavigationBarColor(darkBg);
            WindowInsetsControllerCompat insetsController =
                    WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        } catch (Throwable ignored) {}
    }

    private void configureWebViewForVideoEditing(WebView webView) {
        // Force full hardware acceleration for WebGL shaders & WebCodecs
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setBackgroundColor(Color.parseColor("#090a0f"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        dulosBridge = new DulosAndroidBridge(this);
        webView.addJavascriptInterface(dulosBridge, "DulosAndroid");

        // Handle WebView audio/camera permission requests cleanly (Voice Recorder, Dubbing, SpeechRecognition)
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }
        });
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        if (request == null) return;
        String[] resources = request.getResources();
        List<String> neededAndroidPerms = new ArrayList<>();

        for (String res : resources) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    neededAndroidPerms.add(Manifest.permission.RECORD_AUDIO);
                }
            } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    neededAndroidPerms.add(Manifest.permission.CAMERA);
                }
            }
        }

        if (neededAndroidPerms.isEmpty()) {
            request.grant(resources);
        } else {
            if (pendingWebPermissionRequest != null) {
                try {
                    pendingWebPermissionRequest.deny();
                } catch (Throwable ignored) {}
            }
            pendingWebPermissionRequest = request;
            ActivityCompat.requestPermissions(
                    this,
                    neededAndroidPerms.toArray(new String[0]),
                    REQ_WEBVIEW_PERMISSIONS
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        if (requestCode == REQ_WEBVIEW_PERMISSIONS && pendingWebPermissionRequest != null) {
            PermissionRequest req = pendingWebPermissionRequest;
            pendingWebPermissionRequest = null;

            List<String> grantedResources = new ArrayList<>();
            for (String res : req.getResources()) {
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        grantedResources.add(res);
                    }
                } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED) {
                        grantedResources.add(res);
                    }
                } else {
                    grantedResources.add(res);
                }
            }

            if (!grantedResources.isEmpty()) {
                req.grant(grantedResources.toArray(new String[0]));
            } else {
                req.deny();
            }
            return;
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    private void setupKeyboardInsetBridge(final WebView webView) {
        try {
            final View decorView = getWindow().getDecorView();
            final float density = Math.max(1f, getResources().getDisplayMetrics().density);

            ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, insets) -> {
                int imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
                int navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                int effectivePx = imeBottom > 0 ? Math.max(0, imeBottom - navBottom) : 0;
                reportKeyboardHeightToWeb(webView, Math.round(effectivePx / density));
                return ViewCompat.onApplyWindowInsets(v, insets);
            });

            // Fallback for older Android versions where adjustNothing does not trigger IME insets
            keyboardLayoutListener = () -> {
                try {
                    WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(decorView);
                    if (rootInsets != null) {
                        int imeBottom = rootInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
                        int navBottom = rootInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                        if (imeBottom > 0) {
                            reportKeyboardHeightToWeb(webView, Math.round(Math.max(0, imeBottom - navBottom) / density));
                            return;
                        }
                    }
                    Rect visibleRect = new Rect();
                    decorView.getWindowVisibleDisplayFrame(visibleRect);
                    int screenHeight = decorView.getRootView().getHeight();
                    int keypadHeight = screenHeight - visibleRect.bottom;
                    int effectivePx = keypadHeight > screenHeight * 0.15 ? keypadHeight : 0;
                    reportKeyboardHeightToWeb(webView, Math.round(effectivePx / density));
                } catch (Throwable ignored) {}
            };
            decorView.getViewTreeObserver().addOnGlobalLayoutListener(keyboardLayoutListener);
        } catch (Throwable ignored) {}
    }

    private void reportKeyboardHeightToWeb(final WebView webView, final int cssHeight) {
        final int safeHeight = Math.max(0, cssHeight);
        if (safeHeight == lastReportedKeyboardCssHeight) {
            return;
        }
        lastReportedKeyboardCssHeight = safeHeight;
        final String js = "window.__dulosKeyboardHeight=" + safeHeight + ";"
                + "if(document.documentElement){document.documentElement.style.setProperty('--dulos-keyboard-height','" + safeHeight + "px');}"
                + "window.dispatchEvent(new CustomEvent('dulos-keyboard-height',{detail:{height:" + safeHeight + "}}));";
        webView.post(() -> {
            try {
                webView.evaluateJavascript(js, null);
            } catch (Throwable ignored) {}
        });
    }

    @Override
    public void onDestroy() {
        if (keyboardLayoutListener != null) {
            try {
                getWindow().getDecorView().getViewTreeObserver().removeOnGlobalLayoutListener(keyboardLayoutListener);
            } catch (Throwable ignored) {}
            keyboardLayoutListener = null;
        }
        if (dulosBridge != null) {
            dulosBridge.cleanupAllSessions();
        }
        super.onDestroy();
    }
}
