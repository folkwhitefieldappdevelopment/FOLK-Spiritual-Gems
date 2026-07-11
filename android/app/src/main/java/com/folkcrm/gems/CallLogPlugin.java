package com.folkcrm.gems;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionType;

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
        )
    }
)
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        if (phoneNumber == null) {
            call.reject("Phone number is missing");
            return;
        }
        if (getPermissionState("callLog") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("CALL_PHONE permission not granted");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + phoneNumber));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getCallLog(PluginCall call) {
        // Implementation for call log synchronization
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void showNativeOverlay(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void hideNativeOverlay(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        call.resolve();
    }
}