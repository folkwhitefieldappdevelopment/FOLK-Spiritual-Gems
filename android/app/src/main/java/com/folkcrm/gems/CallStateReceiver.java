// CallStateReceiver.java
package com.folkcrm.gems;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;

public class CallStateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction() == null) return;

        if (intent.getAction().equals("android.intent.action.NEW_OUTGOING_CALL")) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            handleCallEvent(context, phoneNumber, "OUTGOING");
        } else {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            if (TelephonyManager.EXTRA_STATE_RINGING.equals(state) && phoneNumber != null) {
                handleCallEvent(context, phoneNumber, "INCOMING");
            } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                handleCallEvent(context, null, "DISCONNECTED");
            }
        }
    }

    private void handleCallEvent(Context context, String phoneNumber, String type) {
        Intent serviceIntent = new Intent(context, CallerOverlayService.class);
        serviceIntent.putExtra("phoneNumber", phoneNumber);
        serviceIntent.putExtra("type", type);

        if (type.equals("DISCONNECTED")) {
            // NEW: don't tear the overlay down — flip it into a "call ended" state
            // that stays on screen until the user taps Back/X. JS still gets notified
            // in case it wants to refresh session data, but it no longer controls dismissal.
            CallerOverlayManager.getInstance(context).markCallEnded();
            context.stopService(serviceIntent);
            CallLogPlugin.emitCallEvent(null, "DISCONNECTED");
        } else {
            // NEW: draw a bare overlay immediately, natively — before JS/network involved.
            // This is what makes it appear reliably even if the WebView is asleep or slow.
            CallerOverlayManager.getInstance(context).showOverlay(
                null, phoneNumber, null, null, null, type
            );

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            CallLogPlugin.emitCallEvent(phoneNumber, type);
        }
    }
}