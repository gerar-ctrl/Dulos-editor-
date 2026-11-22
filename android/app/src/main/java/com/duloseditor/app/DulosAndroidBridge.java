package com.duloseditor.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class DulosAndroidBridge {

    private static class ExportSession {
        final File tempFile;
        final RandomAccessFile raf;
        final String filename;
        final String mimeType;

        ExportSession(File tempFile, RandomAccessFile raf, String filename, String mimeType) {
            this.tempFile = tempFile;
            this.raf = raf;
            this.filename = filename;
            this.mimeType = mimeType;
        }
    }

    private final Activity activity;
    private final Map<String, ExportSession> sessions = new ConcurrentHashMap<>();

    public DulosAndroidBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isNativeAndroid() {
        return true;
    }

    @JavascriptInterface
    public int getDeviceMemoryMB() {
        try {
            ActivityManager am = (ActivityManager) activity.getSystemService(Context.ACTIVITY_SERVICE);
            if (am != null) {
                ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(mi);
                return (int) (mi.totalMem / (1024L * 1024L));
            }
        } catch (Throwable ignored) {}
        return 4096;
    }

    @JavascriptInterface
    public void setKeepScreenOn(final boolean keepOn) {
        activity.runOnUiThread(() -> {
            try {
                if (keepOn) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            } catch (Throwable ignored) {}
        });
    }

    @JavascriptInterface
    public String openExportSession(String filename, String mimeType) {
        try {
            String safeName = sanitizeFilename(filename);
            String safeMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType : "video/mp4";

            File dir = new File(activity.getCacheDir(), "dulos_exports");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String sessionId = UUID.randomUUID().toString();
            File tempFile = new File(dir, sessionId + "_" + safeName);
            if (tempFile.exists()) {
                tempFile.delete();
            }

            RandomAccessFile raf = new RandomAccessFile(tempFile, "rw");
            sessions.put(sessionId, new ExportSession(tempFile, raf, safeName, safeMime));
            return sessionId;
        } catch (Throwable e) {
            return "";
        }
    }

    @JavascriptInterface
    public boolean writeExportChunkAt(String sessionId, double position, String base64Data) {
        ExportSession session = sessions.get(sessionId);
        if (session == null || base64Data == null) return false;
        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            synchronized (session) {
                session.raf.seek((long) position);
                session.raf.write(bytes);
            }
            return true;
        } catch (Throwable e) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean appendExportChunk(String sessionId, String base64Data) {
        ExportSession session = sessions.get(sessionId);
        if (session == null || base64Data == null) return false;
        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            synchronized (session) {
                session.raf.seek(session.raf.length());
                session.raf.write(bytes);
            }
            return true;
        } catch (Throwable e) {
            return false;
        }
    }

    @JavascriptInterface
    public void cancelExportSession(String sessionId) {
        if (sessionId == null) return;
        ExportSession session = sessions.remove(sessionId);
        if (session != null) {
            closeQuietly(session.raf);
            try {
                if (session.tempFile.exists()) {
                    session.tempFile.delete();
                }
            } catch (Throwable ignored) {}
        }
    }

    @JavascriptInterface
    public String finishExportSession(String sessionId) {
        JSONObject result = new JSONObject();
        ExportSession session = sessions.remove(sessionId);
        if (session == null) {
            return errorJson("Sesión de exportación no encontrada");
        }

        try {
            synchronized (session) {
                session.raf.getFD().sync();
                session.raf.close();
            }

            boolean isAudio = session.mimeType.startsWith("audio/");
            String folderName = "Dulos Editor";
            String displayPath;
            Uri savedUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = activity.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, session.filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, session.mimeType);
                String relDir = (isAudio ? Environment.DIRECTORY_MUSIC : Environment.DIRECTORY_MOVIES)
                        + File.separator + folderName;
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, relDir);
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri collection = isAudio
                        ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                        : MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

                savedUri = resolver.insert(collection, values);
                if (savedUri == null) {
                    throw new IllegalStateException("No se pudo crear el archivo en MediaStore");
                }

                try (InputStream in = new FileInputStream(session.tempFile);
                     OutputStream out = resolver.openOutputStream(savedUri)) {
                    if (out == null) {
                        throw new IllegalStateException("No se pudo abrir el flujo de escritura");
                    }
                    copyStream(in, out);
                } catch (Throwable copyErr) {
                    try {
                        resolver.delete(savedUri, null, null);
                    } catch (Throwable ignored) {}
                    throw copyErr;
                }

                ContentValues doneValues = new ContentValues();
                doneValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(savedUri, doneValues, null, null);

                displayPath = (isAudio ? "Música/" : "Galería (Movies)/") + folderName;
            } else {
                String baseType = isAudio ? Environment.DIRECTORY_MUSIC : Environment.DIRECTORY_MOVIES;
                File baseDir = Environment.getExternalStoragePublicDirectory(baseType);
                File outDir = new File(baseDir, folderName);
                if (!outDir.exists() && !outDir.mkdirs()) {
                    outDir = activity.getExternalFilesDir(baseType);
                    if (outDir != null && !outDir.exists()) outDir.mkdirs();
                }

                File outFile = getUniqueFile(outDir, session.filename);
                try (InputStream in = new FileInputStream(session.tempFile);
                     OutputStream out = new FileOutputStream(outFile)) {
                    copyStream(in, out);
                }

                MediaScannerConnection.scanFile(
                        activity.getApplicationContext(),
                        new String[]{outFile.getAbsolutePath()},
                        new String[]{session.mimeType},
                        null
                );

                savedUri = FileProvider.getUriForFile(
                        activity,
                        activity.getPackageName() + ".fileprovider",
                        outFile
                );
                displayPath = (isAudio ? "Música/" : "Movies/") + folderName;
            }

            try {
                if (session.tempFile.exists()) {
                    session.tempFile.delete();
                }
            } catch (Throwable ignored) {}

            result.put("ok", true);
            result.put("uri", savedUri.toString());
            result.put("displayPath", displayPath);
            result.put("filename", session.filename);
            return result.toString();
        } catch (Throwable e) {
            closeQuietly(session.raf);
            try {
                if (session.tempFile.exists()) {
                    session.tempFile.delete();
                }
            } catch (Throwable ignored) {}
            return errorJson(e.getMessage() != null ? e.getMessage() : "Error al guardar el archivo");
        }
    }

    @JavascriptInterface
    public boolean shareExportedFile(String uriString, String mimeType, String title) {
        if (uriString == null || uriString.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(uriString);
            String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "*/*";
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(safeMime);
            shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
            if (title != null && !title.isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            }
            shareIntent.setClipData(ClipData.newRawUri(title != null ? title : "media", uri));
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(shareIntent, "Compartir con");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(chooser);
                } catch (Throwable ignored) {}
            });
            return true;
        } catch (Throwable e) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean shareExportedFileToWhatsApp(String uriString, String mimeType, String title) {
        if (uriString == null || uriString.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(uriString);
            String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "*/*";
            String[] packages = new String[]{"com.whatsapp", "com.whatsapp.w4b"};
            PackageManager pm = activity.getPackageManager();
            String targetPkg = null;
            for (String pkg : packages) {
                try {
                    pm.getPackageInfo(pkg, 0);
                    targetPkg = pkg;
                    break;
                } catch (Throwable ignored) {}
            }

            if (targetPkg == null) {
                return shareExportedFile(uriString, safeMime, title);
            }

            Intent waIntent = new Intent(Intent.ACTION_SEND);
            waIntent.setType(safeMime);
            waIntent.setPackage(targetPkg);
            waIntent.putExtra(Intent.EXTRA_STREAM, uri);
            if (title != null && !title.isEmpty()) {
                waIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            }
            waIntent.setClipData(ClipData.newRawUri(title != null ? title : "media", uri));
            waIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(waIntent);
                } catch (Throwable err) {
                    shareExportedFile(uriString, safeMime, title);
                }
            });
            return true;
        } catch (Throwable e) {
            return shareExportedFile(uriString, mimeType, title);
        }
    }

    @JavascriptInterface
    public boolean openExportedFile(String uriString, String mimeType) {
        if (uriString == null || uriString.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(uriString);
            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(uri, mimeType != null && !mimeType.isEmpty() ? mimeType : "*/*");
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(viewIntent);
            return true;
        } catch (Throwable e) {
            return false;
        }
    }

    @JavascriptInterface
    public void exitApp() {
        cleanupAllSessions();
        activity.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    activity.finishAndRemoveTask();
                } else {
                    activity.finishAffinity();
                }
            } catch (Throwable ignored) {
                try {
                    activity.finish();
                } catch (Throwable ignored2) {}
            }
        });
    }

    public void cleanupAllSessions() {
        for (String id : sessions.keySet()) {
            cancelExportSession(id);
        }
        try {
            File exportsDir = new File(activity.getCacheDir(), "dulos_exports");
            if (exportsDir.exists() && exportsDir.isDirectory()) {
                File[] files = exportsDir.listFiles();
                if (files != null) {
                    for (File file : files) {
                        try {
                            file.delete();
                        } catch (Throwable ignored) {}
                    }
                }
            }
        } catch (Throwable ignored) {}
    }

    private static void copyStream(InputStream in, OutputStream out) throws Exception {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
        out.flush();
    }

    private static void closeQuietly(RandomAccessFile raf) {
        try {
            if (raf != null) raf.close();
        } catch (Throwable ignored) {}
    }

    private static String sanitizeFilename(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "dulos_export.mp4";
        return raw.trim().replaceAll("[\\\\/:*?\"<>|]+", "_");
    }

    private static File getUniqueFile(File dir, String filename) {
        File candidate = new File(dir, filename);
        if (!candidate.exists()) return candidate;
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        String ext = dot > 0 ? filename.substring(dot) : "";
        for (int i = 1; i < 1000; i++) {
            File next = new File(dir, base + "_" + i + ext);
            if (!next.exists()) return next;
        }
        return new File(dir, base + "_" + System.currentTimeMillis() + ext);
    }

    private static String errorJson(String message) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("ok", false);
            obj.put("error", message);
            return obj.toString();
        } catch (Throwable ignored) {
            return "{\"ok\":false,\"error\":\"Error al guardar\"}";
        }
    }
}
