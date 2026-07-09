package com.folkcrm.gems;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telephony.TelephonyManager;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.content.pm.PackageManager;
import android.util.Log;

/**
 * Native receiver to detect phone state changes and trigger the outreach overlay.
 */
public class CallStateReceiver extends BroadcastReceiver {
    private static final String TAG = "CallStateReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        // Permission Guard: Do nothing if permissions were revoked
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Missing READ_PHONE_STATE permission. Ignoring broadcast.");
            return;
        }

        if (action.equals(Intent.ACTION_NEW_OUTGOING_CALL)) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            handleCallDetection(context, phoneNumber, "OUTGOING");
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            
            // Note: EXTRA_INCOMING_NUMBER requires READ_CALL_LOG or READ_PHONE_STATE depending on API
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            if (state != null) {
                if (state.equals(TelephonyManager.EXTRA_STATE_RINGING)) {
                    if (phoneNumber != null) {
                        handleCallDetection(context, phoneNumber, "INCOMING");
                    }
                } else if (state.equals(TelephonyManager.EXTRA_STATE_IDLE)) {
                    handleDisconnect(context);
                }
            }
        }
    }

    private void handleCallDetection(Context context, String phoneNumber, String type) {
        // 1. Emit to JS Layer via Plugin Bridge
        CallLogPlugin.emitCallDetected(phoneNumber, type);

        // 2. Start Foreground Service to host the overlay
        Intent serviceIntent = new Intent(context, CallerOverlayService.class);
        serviceIntent.setAction("SHOW");
        serviceIntent.putExtra("phoneNumber", phoneNumber);
        serviceIntent.putExtra("type", type);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }

    private void handleDisconnect(Context context) {
        // 1. Notify JS to close its listeners
        CallLogPlugin.emitCallDetected("", "DISCONNECTED");

        // 2. Hide Native Overlay UI
        try {
            CallerOverlayManager.getInstance(context).hideOverlay();
        } catch (Exception e) {
            Log.e(TAG, "Error hiding overlay", e);
        }

        // 3. Stop the foreground service
        Intent serviceIntent = new Intent(context, CallerOverlayService.class);
        context.stopService(serviceIntent);
    }
}
