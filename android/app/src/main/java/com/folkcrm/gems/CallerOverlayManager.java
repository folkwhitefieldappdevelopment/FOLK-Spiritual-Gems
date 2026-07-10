package com.folkcrm.gems;

import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
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

    private CallerOverlayManager(Context context) {
        this.appContext = context.getApplicationContext();
        this.windowManager = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
    }

    public static synchronized CallerOverlayManager getInstance(Context context) {
        if (instance == null) {
            instance = new CallerOverlayManager(context);
        }
        return instance;
    }

    public boolean showOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        // A1. Add a real-time permission check
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(appContext)) {
            return false;
        }

        if (overlayView != null) {
            hideOverlay();
        }

        WindowManager.LayoutParams params;
        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP;
        params.y = 100;

        overlayView = LayoutInflater.from(appContext).inflate(R.layout.overlay_caller, null);
        
        TextView tvName = overlayView.findViewById(R.id.tv_caller_name);
        TextView tvPhone = overlayView.findViewById(R.id.tv_caller_phone);
        TextView tvStage = overlayView.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = overlayView.findViewById(R.id.tv_caller_remark);
        ImageView ivPhoto = overlayView.findViewById(R.id.iv_caller_photo);
        View btnClose = overlayView.findViewById(R.id.btn_close_overlay);
        View btnProfile = overlayView.findViewById(R.id.btn_view_profile);
        View btnSession = overlayView.findViewById(R.id.btn_start_session);

        tvName.setText(name != null && !name.isEmpty() ? name : "Unknown Contact");
        tvPhone.setText(phone);
        tvStage.setText(stage != null ? stage : "Fresh Lead");
        tvRemark.setText(remark != null && !remark.isEmpty() ? "\"" + remark + "\"" : "No previous remarks recorded.");

        if (photoUrl != null && !photoUrl.isEmpty()) {
            Glide.with(appContext).load(photoUrl).circleCrop().into(ivPhoto);
        }

        btnClose.setOnClickListener(v -> hideOverlay());
        
        btnProfile.setOnClickListener(v -> {
            CallLogPlugin.emitOverlayAction("viewProfile");
            hideOverlay();
        });
        
        btnSession.setOnClickListener(v -> {
            CallLogPlugin.emitOverlayAction("startSession");
            hideOverlay();
        });

        try {
            windowManager.addView(overlayView, params);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public void hideOverlay() {
        if (overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                e.printStackTrace();
            }
            overlayView = null;
        }
    }
}
