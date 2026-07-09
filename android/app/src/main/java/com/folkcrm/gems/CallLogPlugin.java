package com.folkcrm.gems;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.CallLog;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(
            alias = "callLog",
            strings = {
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.CALL_PHONE
            }
        ),
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "contacts",
            strings = {
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS
            }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        requestAllPermissions(call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("callLog", getPermissionState("callLog").toString());
        ret.put("camera", getPermissionState("camera").toString());
        ret.put("contacts", getPermissionState("contacts").toString());
        ret.put("notifications", getPermissionState("notifications").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("callLog", getPermissionState("callLog").toString());
        result.put("camera", getPermissionState("camera").toString());
        result.put("contacts", getPermissionState("contacts").toString());
        result.put("notifications", getPermissionState("notifications").toString());
        
        boolean overlay = Settings.canDrawOverlays(getContext());
        result.put("overlay", overlay ? "granted" : "denied");
        
        call.resolve(result);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (!Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent();
            String packageName = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        if (phoneNumber == null) {
            call.reject("Must provide a phone number");
            return;
        }

        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            call.reject("Phone permission not granted");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + phoneNumber));
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCallLog(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            call.reject("Permission denied");
            return;
        }

        String contactPhone = call.getString("contactPhoneNumber");
        long lastSync = call.getLong("lastSyncTimestamp", 0L);
        
        JSONArray logs = new JSONArray();
        String selection = CallLog.Calls.DATE + " > ?";
        String[] selectionArgs = new String[]{ String.valueOf(lastSync) };
        
        if (contactPhone != null && !contactPhone.isEmpty()) {
            selection += " AND " + CallLog.Calls.NUMBER + " LIKE ?";
            selectionArgs = new String[]{ String.valueOf(lastSync), "%" + contactPhone + "%" };
        }

        try (Cursor cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                null,
                selection,
                selectionArgs,
                CallLog.Calls.DATE + " DESC"
        )) {
            if (cursor != null) {
                int numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
                int dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE);
                int durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION);
                int idIdx = cursor.getColumnIndex(CallLog.Calls._ID);

                while (cursor.moveToNext()) {
                    JSObject log = new JSObject();
                    log.put("id", cursor.getString(idIdx));
                    log.put("phoneNumber", cursor.getString(numberIdx));
                    log.put("duration", cursor.getInt(durationIdx));
                    log.put("timestamp", cursor.getLong(dateIdx));
                    
                    int type = cursor.getInt(typeIdx);
                    switch (type) {
                        case CallLog.Calls.INCOMING_TYPE: log.put("type", "INCOMING"); break;
                        case CallLog.Calls.OUTGOING_TYPE: log.put("type", "OUTGOING"); break;
                        case CallLog.Calls.MISSED_TYPE: log.put("type", "MISSED"); break;
                        default: log.put("type", "UNKNOWN");
                    }
                    logs.put(log);
                }
            }
            JSObject response = new JSObject();
            response.put("callLog", logs);
            call.resolve(response);
        } catch (Exception e) {
            Log.e("CallLogPlugin", "Error querying call log", e);
            call.reject(e.getMessage());
        }
    }
}
