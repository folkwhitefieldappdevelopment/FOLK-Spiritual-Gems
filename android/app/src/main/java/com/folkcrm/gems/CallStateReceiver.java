package com.folkcrm.gems;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import androidx.core.content.ContextCompat;

public class CallStateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (action.equals(Intent.ACTION_NEW_OUTGOING_CALL)) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            handleCallEvent(context, phoneNumber, "OUTGOING");
        } else if (action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
                handleCallEvent(context, phoneNumber, "INCOMING");
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                handleCallDisconnected(context);
            }
        }
    }

    private void handleCallEvent(Context context, String phoneNumber, String type) {
        if (phoneNumber == null) return;
        
        CallLogPlugin.emitCallDetected(phoneNumber, type);

        Intent serviceIntent = new Intent(context, CallerOverlayService.class);
        serviceIntent.setAction("SHOW");
        serviceIntent.putExtra("phoneNumber", phoneNumber);
        serviceIntent.putExtra("type", type);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }

    private void handleCallDisconnected(Context context) {
        CallLogPlugin.emitCallDetected(null, "DISCONNECTED");
        CallerOverlayManager.getInstance(context).hideOverlay();
        
        Intent serviceIntent = new Intent(context, CallerOverlayService.class);
        context.stopService(serviceIntent);
    }
}