package com.example.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "CallLog", permissions = {
    @Permission(strings = { Manifest.permission.READ_CALL_LOG }, alias = "callLogRead")
})
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void getCallLog(PluginCall call) {
        if (getPermissionState("callLogRead") != PermissionState.GRANTED) {
            requestPermissionForAlias("callLogRead", call, "callLogReadPermsCallback");
        } else {
            loadCallHistory(call);
        }
    }

    private void loadCallHistory(PluginCall call) {
        String contactPhoneNumber = call.getString("contactPhoneNumber", "");
        long lastSyncTimestamp = call.getLong("lastSyncTimestamp", 0L);

        ContentResolver contentResolver = getContext().getContentResolver();
        Cursor cursor = contentResolver.query(
            CallLog.Calls.CONTENT_URI, null,
            CallLog.Calls.DATE + " > ?",
            new String[]{ String.valueOf(lastSyncTimestamp) },
            CallLog.Calls.DATE + " DESC"
        );

        JSArray logs = new JSArray();

        if (cursor != null) {
            try {
                while (cursor.moveToNext()) {
                    String number = "";
                    int numIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                    if (numIdx != -1) number = cursor.getString(numIdx);

                    if (!contactPhoneNumber.isEmpty() &&
                        !number.contains(contactPhoneNumber) &&
                        !contactPhoneNumber.contains(number)) continue;

                    int typeInt = 0;
                    int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
                    if (typeIdx != -1) typeInt = cursor.getInt(typeIdx);

                    String type;
                    switch (typeInt) {
                        case CallLog.Calls.INCOMING_TYPE: type = "INCOMING"; break;
                        case CallLog.Calls.OUTGOING_TYPE: type = "OUTGOING"; break;
                        case CallLog.Calls.MISSED_TYPE: type = "MISSED"; break;
                        default: type = "UNKNOWN";
                    }

                    JSObject entry = new JSObject();
                    int idIdx = cursor.getColumnIndex(CallLog.Calls._ID);
                    if (idIdx != -1) entry.put("id", cursor.getString(idIdx));
                    entry.put("phoneNumber", number);
                    entry.put("type", type);
                    int durIdx = cursor.getColumnIndex(CallLog.Calls.DURATION);
                    if (durIdx != -1) entry.put("duration", cursor.getLong(durIdx));
                    int dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE);
                    if (dateIdx != -1) entry.put("timestamp", cursor.getLong(dateIdx));
                    entry.put("callPicked", !type.equals("MISSED"));
                    logs.put(entry);
                }
            } finally {
                cursor.close();
            }
        }

        JSObject result = new JSObject();
        result.put("callLog", logs);
        call.resolve(result);
    }

    @PermissionCallback
    private void callLogReadPermsCallback(PluginCall call) {
        if (getPermissionState("callLogRead") == PermissionState.GRANTED) {
            loadCallHistory(call);
        } else {
            call.reject("Permission is required to read call log");
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(),
            Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED;
        if (!granted) {
            ActivityCompat.requestPermissions(getActivity(),
                new String[]{ Manifest.permission.READ_CALL_LOG }, 1);
        }
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber", "");
        if (phoneNumber.isEmpty()) { call.reject("Phone number required"); return; }
        try {
            android.content.Intent intent = new android.content.Intent(
                android.content.Intent.ACTION_CALL,
                android.net.Uri.parse("tel:" + phoneNumber));
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }
}