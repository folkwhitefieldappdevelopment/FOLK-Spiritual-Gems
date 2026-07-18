package com.folkcrm.gems;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Native Android Contact Cache Store.
 * Reads and writes a high-speed JSON index to the internal file system.
 * Allows the native layer to perform instant lookups outside the WebView lifecycle.
 */
public class ContactCacheStore {
    private static final String FILENAME = "contact_cache.json";

    public static JSONObject lookupByPhone(Context context, String phone) {
        if (phone == null) return null;
        
        // Normalize: last 10 digits
        String norm = phone.replaceAll("\\D", "");
        if (norm.length() > 10) {
            norm = norm.substring(norm.length() - 10);
        }
        if (norm.length() < 10) return null;

        try {
            File file = new File(context.getFilesDir(), FILENAME);
            if (!file.exists()) return null;

            FileInputStream fis = new FileInputStream(file);
            int size = fis.available();
            byte[] buffer = new byte[size];
            fis.read(buffer);
            fis.close();

            String jsonString = new String(buffer, StandardCharsets.UTF_8);
            JSONObject cache = new JSONObject(jsonString);

            if (cache.has(norm)) {
                return cache.getJSONObject(norm);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public static void writeCache(Context context, String json) {
        try {
            File dir = context.getFilesDir();
            File tempFile = new File(dir, FILENAME + ".tmp");
            File realFile = new File(dir, FILENAME);

            FileOutputStream fos = new FileOutputStream(tempFile);
            fos.write(json.getBytes(StandardCharsets.UTF_8));
            fos.close();

            // Atomic rename for safety
            tempFile.renameTo(realFile);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
