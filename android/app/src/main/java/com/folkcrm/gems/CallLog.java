package com.folkcrm.gems;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(alias = "callLog", strings = {Manifest.permission.READ_CALL_LOG, Manifest.permission.READ_PHONE_STATE, Manifest.permission.ANSWER_PHONE_CALLS}),
        @Permission(alias = "camera", strings = {Manifest.permission.CAMERA}),
        @Permission(alias = "contacts", strings = {Manifest.permission.READ_CONTACTS}),
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
    }
)
public class CallLog extends Plugin {
    private static final String TAG = "CallLogPlugin";
    private BroadcastReceiver overlayReceiver;

    @Override
    public void load() {
        super.load();
        setupOverlayReceiver();
    }

    private void setupOverlayReceiver() {
        overlayReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getStringExtra("action");
                String phone = intent.getStringExtra("phone");
                
                JSObject ret = new JSObject();
                ret.put("action", action);
                ret.put("phone", phone);
                notifyListeners("nativeOverlayAction", ret);
            }
        };
        IntentFilter filter = new IntentFilter("com.folkcrm.gems.OVERLAY_ACTION");
        getContext().registerReceiver(overlayReceiver, filter);
    }

    @PluginMethod
    public void showNativeOverlay(PluginCall call) {
        if (!OverlayPermissionHelper.canDrawOverlays(getContext())) {
            OverlayPermissionHelper.requestOverlayPermission(getContext());
            call.reject("Overlay permission required");
            return;
        }

        String name = call.getString("name", "Unknown Contact");
        String phone = call.getString("phone", "");
        String photoUrl = call.getString("photoUrl", "");
        String stage = call.getString("stage", "Fresh Lead");
        String remark = call.getString("remark", "");
        String type = call.getString("type", "INCOMING");

        Intent intent = new Intent(getContext(), CallerOverlayService.class);
        intent.setAction("SHOW_OVERLAY");
        intent.putExtra("name", name);
        intent.putExtra("phone", phone);
        intent.putExtra("photoUrl", photoUrl);
        intent.putExtra("stage", stage);
        intent.putExtra("remark", remark);
        intent.putExtra("type", type);

        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void hideNativeOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), CallerOverlayService.class);
        intent.setAction("HIDE_OVERLAY");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        OverlayPermissionHelper.requestOverlayPermission(getContext());
        call.resolve();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("callLog", getPermissionState("callLog"));
        ret.put("camera", getPermissionState("camera"));
        ret.put("contacts", getPermissionState("contacts"));
        ret.put("notifications", getPermissionState("notifications"));
        ret.put("overlay", OverlayPermissionHelper.canDrawOverlays(getContext()) ? "granted" : "denied");
        call.resolve(ret);
    }

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CALL);
        intent.setData(Uri.parse("tel:" + phoneNumber));
        
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            getContext().startActivity(intent);
            call.resolve();
        } else {
            call.reject("Permission denied");
        }
    }
}