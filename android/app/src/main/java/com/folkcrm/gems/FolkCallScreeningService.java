// FolkCallScreeningService.java — new file
package com.folkcrm.gems;

import android.telecom.Call;
import android.telecom.CallScreeningService;

public class FolkCallScreeningService extends CallScreeningService {
    @Override
    public void onScreenCall(Call.Details callDetails) {
        String number = callDetails.getHandle() != null ? callDetails.getHandle().getSchemeSpecificPart() : null;
        int direction = callDetails.getCallDirection();

        if (direction == Call.Details.DIRECTION_OUTGOING) {
            CallerOverlayManager.getInstance(this).showOverlay(null, number, null, null, null, "OUTGOING");
            CallLogPlugin.emitCallEvent(number, "OUTGOING");
        }
        // Incoming stays on CallStateReceiver/PHONE_STATE — don't double-fire it here.

        respondToCall(callDetails, new CallResponse.Builder().build()); // allow the call through, we're only observing
    }
}