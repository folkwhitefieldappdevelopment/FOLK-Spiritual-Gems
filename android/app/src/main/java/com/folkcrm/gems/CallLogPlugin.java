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

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(alias = "callLog", strings = {Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE, Manifest.permission.CALL_PHONE}),
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
        if (staticInstance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
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
    
        getActivity().runOnUiThread(() -> {
            boolean shown = CallerOverlayManager.getInstance(getContext()).showOverlay(name, phone, photoUrl, stage, remark, type);
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