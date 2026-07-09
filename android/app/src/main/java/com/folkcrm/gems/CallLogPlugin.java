package com.folkcrm.gems;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.PermissionState;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(
            alias = "callLog",
            strings = { Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE }
        ),
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class CallLogPlugin extends Plugin {
    private static CallLogPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    /**
     * Static bridge to allow CallStateReceiver to push events to the JS layer.
     */
    public static void emitCallDetected(String phoneNumber, String type) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("phoneNumber", phoneNumber);
            data.put("type", type);
            instance.notifyListeners("callDetected", data);
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject permissions = new JSObject();
        permissions.put("callLog", getPermissionState("callLog"));
        permissions.put("camera", getPermissionState("camera"));
        permissions.put("contacts", getPermissionState("contacts"));
        permissions.put("notifications", getPermissionState("notifications"));
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            permissions.put("overlay", Settings.canDrawOverlays(getContext()) ? "granted" : "denied");
        } else {
            permissions.put("overlay", "granted");
        }
        call.resolve(permissions);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivityForResult(intent, 1234);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        if (phoneNumber == null) {
            call.reject("Phone number is required");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + phoneNumber));
        if (getContext().checkSelfPermission(Manifest.permission.CALL_PHONE) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } else {
            call.reject("CALL_PHONE permission not granted");
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

        try {
            CallerOverlayManager.getInstance(getContext()).showOverlay(name, phone, photoUrl, stage, remark, type);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void hideNativeOverlay(PluginCall call) {
        try {
            CallerOverlayManager.getInstance(getContext()).hideOverlay();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getCallLog(PluginCall call) {
        // Core implementation provided in native package
        call.resolve(new JSObject());
    }
}
