package com.folkcrm.gems;

import android.Manifest;
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

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE }),
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS })
    }
)
public class CallLogPlugin extends Plugin {
    private static CallLogPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void emitCallDetected(String phoneNumber, String type) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("phoneNumber", phoneNumber);
            data.put("type", type);
            instance.notifyListeners("callDetected", data);
        }
    }

    public static void emitOverlayAction(String action) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("action", action);
            instance.notifyListeners("nativeOverlayAction", data);
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
            CallerOverlayManager.getInstance(getContext()).showOverlay(name, phone, photoUrl, stage, remark, type);
            call.resolve();
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
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + phoneNumber));
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            getActivity().startActivity(intent);
        }
        call.resolve();
    }
}