// CallerOverlayManager.java
package com.folkcrm.gems;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;
import com.bumptech.glide.Glide;

public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private final Context appContext;
    private final WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private boolean callEnded = false;

    // Same indigo family as the app's dark theme (--primary: 226 70% 65%)
    private static final int[] AVATAR_PALETTE = {
        Color.parseColor("#6C7FE0"), Color.parseColor("#8B6CE0"),
        Color.parseColor("#4FA3D9"), Color.parseColor("#E08B6C"),
        Color.parseColor("#5FBF8F")
    };

    private CallerOverlayManager(Context context) {
        this.appContext = context.getApplicationContext();
        this.windowManager = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
    }

    public static synchronized CallerOverlayManager getInstance(Context context) {
        if (instance == null) instance = new CallerOverlayManager(context);
        return instance;
    }

    public boolean showOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(appContext)) {
            return false;
        }
        callEnded = false;

        // If the window is already up (e.g. native placeholder shown, JS data now ready),
        // update the same view in place instead of tearing it down and rebuilding —
        // this is also what preserves the user's dragged position.
        if (overlayView != null) {
            bindContent(name, phone, photoUrl, stage, remark, type, false);
            return true;
        }

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 120;
        params.width = (int) (appContext.getResources().getDisplayMetrics().widthPixels * 0.94);

        overlayView = LayoutInflater.from(appContext).inflate(R.layout.overlay_caller, null);
        attachDragHandle();
        bindContent(name, phone, photoUrl, stage, remark, type, true);

        try {
            windowManager.addView(overlayView, params);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            overlayView = null;
            return false;
        }
    }

    /** Called from CallStateReceiver on DISCONNECTED — keeps the card visible with a
     *  "Call Ended" header instead of dismissing it. Only Back/X remove it now. */
    public void markCallEnded() {
        callEnded = true;
        if (overlayView == null) return;
        TextView tvStatus = overlayView.findViewById(R.id.tv_call_status);
        View indicator = overlayView.findViewById(R.id.call_type_indicator);
        if (tvStatus != null) tvStatus.setText("CALL ENDED");
        if (indicator != null) indicator.setBackgroundColor(Color.parseColor("#555577"));
    }

    private void bindContent(String name, String phone, String photoUrl, String stage, String remark, String type, boolean isFresh) {
        TextView tvName = overlayView.findViewById(R.id.tv_caller_name);
        TextView tvPhone = overlayView.findViewById(R.id.tv_caller_phone);
        TextView tvStage = overlayView.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = overlayView.findViewById(R.id.tv_caller_remark);
        TextView tvStatus = overlayView.findViewById(R.id.tv_call_status);
        TextView tvInitial = overlayView.findViewById(R.id.tv_avatar_initial);
        ImageView ivPhoto = overlayView.findViewById(R.id.iv_caller_photo);
        View indicator = overlayView.findViewById(R.id.call_type_indicator);
        View btnClose = overlayView.findViewById(R.id.btn_close_overlay);
        View btnBack = overlayView.findViewById(R.id.btn_back_overlay);
        View btnProfile = overlayView.findViewById(R.id.btn_view_profile);
        View btnSession = overlayView.findViewById(R.id.btn_start_session);

        boolean hasName = name != null && !name.isEmpty();
        tvName.setText(hasName ? name : "Identifying…");
        tvPhone.setText(phone != null ? phone : "");
        tvStage.setText(stage != null ? stage : "Fresh Lead");
        tvRemark.setText(remark != null && !remark.isEmpty() ? "\u201c" + remark + "\u201d" : "No previous remarks recorded.");
        tvStatus.setText(callEnded ? "CALL ENDED" : ("INCOMING".equals(type) ? "INCOMING CALL" : "OUTGOING CALL"));
        indicator.setBackgroundColor(callEnded ? Color.parseColor("#555577")
            : "INCOMING".equals(type) ? Color.parseColor("#6C7FE0") : Color.parseColor("#5FBF8F"));

        if (photoUrl != null && !photoUrl.isEmpty()) {
            ivPhoto.setVisibility(View.VISIBLE);
            tvInitial.setVisibility(View.GONE);
            Glide.with(appContext).load(photoUrl).circleCrop().into(ivPhoto);
        } else {
            // Truecaller-style fallback: colored circle + initial, never a broken image box
            ivPhoto.setVisibility(View.GONE);
            tvInitial.setVisibility(View.VISIBLE);
            String initial = hasName ? name.substring(0, 1).toUpperCase() : "#";
            int color = AVATAR_PALETTE[Math.abs(initial.hashCode()) % AVATAR_PALETTE.length];
            GradientDrawable bg = new GradientDrawable();
            bg.setShape(GradientDrawable.OVAL);
            bg.setColor(color);
            tvInitial.setBackground(bg);
            tvInitial.setText(initial);
        }

        btnClose.setOnClickListener(v -> hideOverlay());
        btnBack.setOnClickListener(v -> hideOverlay());

        btnProfile.setOnClickListener(v -> { CallLogPlugin.emitOverlayAction("viewProfile"); hideOverlay(); });
        btnSession.setOnClickListener(v -> { CallLogPlugin.emitOverlayAction("startSession"); hideOverlay(); });
    }

    /** Truecaller-style free drag: grabbing the card header moves the whole window. */
    private void attachDragHandle() {
        View dragHandle = overlayView.findViewById(R.id.drag_handle);
        dragHandle.setOnTouchListener(new View.OnTouchListener() {
            int initialX, initialY;
            float initialTouchX, initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        try { windowManager.updateViewLayout(overlayView, params); } catch (Exception ignored) {}
                        return true;
                }
                return false;
            }
        });
    }

    public void hideOverlay() {
        if (overlayView != null) {
            try { windowManager.removeView(overlayView); } catch (Exception e) { e.printStackTrace(); }
            overlayView = null;
        }
        callEnded = false;
    }
}