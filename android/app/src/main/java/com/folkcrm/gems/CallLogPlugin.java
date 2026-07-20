package com.folkcrm.gems;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.util.List;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(alias = "callLog", strings = {Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE, Manifest.permission.CALL_PHONE}),
        @Permission(alias = "outgoingCalls", strings = {Manifest.permission.PROCESS_OUTGOING_CALLS, Manifest.permission.READ_PHONE_NUMBERS}),
        @Permission(alias = "camera", strings = {Manifest.permission.CAMERA}),
        @Permission(alias = "contacts", strings = {Manifest.permission.READ_CONTACTS}),
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
    }
)
public class CallLogPlugin extends Plugin {
    private static CallLogPlugin staticInstance;

    @Override
    public void load() {
        staticInstance = this;
    }

    public static void emitCallEvent(String phone, String type) {
        if (staticInstance != null) {
            JSObject ret = new JSObject();
            ret.put("phoneNumber", phone);
            ret.put("type", type);
            staticInstance.notifyListeners("callDetected", ret);
        }
    }

    public static void emitOverlayAction(String action) {
        emitOverlayAction(action, null, -1);
    }

    public static void emitOverlayAction(String action, String sessionId, int currentIndex) {
        if (staticInstance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            if (sessionId != null) {
                ret.put("sessionId", sessionId);
                ret.put("currentIndex", currentIndex);
            }
            staticInstance.notifyListeners("nativeOverlayAction", ret);
        }
    }

    @PluginMethod
    public void showNativeOverlay(PluginCall call) {
        String name = call.getString("name");
        String phone = call.getString("phone");
        String photoUrl = call.getString("photoUrl");
        String stage = call.getString("stage");
        String remark = call.getString("remark");
        String type = call.getString("type");
        String occupation = call.getString("occupation");
        String enabler = call.getString("enabler");
        String folkGuide = call.getString("folkGuide");
        Integer chantingStatus = call.getInt("chantingStatus");
        Boolean isAdmin = call.getBoolean("isAdmin", false);
        String sessionId = call.getString("sessionId");
        String sessionName = call.getString("sessionName");
        Integer currentIndex = call.getInt("currentIndex");
        com.getcapacitor.JSArray attendanceArr = call.getArray("attendance");
        List<String> attendance = new java.util.ArrayList<>();
        if (attendanceArr != null) {
            for (int i = 0; i < attendanceArr.length(); i++) {
                attendance.add(attendanceArr.optString(i));
            }
        }

        getActivity().runOnUiThread(() -> {
            boolean shown = CallerOverlayManager.getInstance(getContext()).showOverlay(
                name, phone, photoUrl, stage, remark, type,
                occupation, enabler, folkGuide, chantingStatus, attendance,
                isAdmin != null && isAdmin, sessionId, sessionName, currentIndex
            );
            JSObject ret = new JSObject();
            ret.put("shown", shown);
            call.resolve(ret);
        });
    }
    
    @PluginMethod
    public void hideNativeOverlay(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            CallerOverlayManager.getInstance(getContext()).hideOverlay();
            call.resolve();
        });
    }

    @PluginMethod
    public void syncNativeContactCache(PluginCall call) {
        String json = call.getString("json");
        if (json != null) {
            ContactCacheStore.writeCache(getContext(), json);
        }
        call.resolve();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("callLog", getPermissionState("callLog"));
        ret.put("camera", getPermissionState("camera"));
        ret.put("contacts", getPermissionState("contacts"));
        ret.put("notifications", getPermissionState("notifications"));

        boolean overlayGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            overlayGranted = Settings.canDrawOverlays(getContext());
        }
        ret.put("overlay", overlayGranted ? "granted" : "denied");

        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        if (phoneNumber == null) {
            call.reject("Phone number is missing");
            return;
        }
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            call.reject("CALL_PHONE permission not granted");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + phoneNumber));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}