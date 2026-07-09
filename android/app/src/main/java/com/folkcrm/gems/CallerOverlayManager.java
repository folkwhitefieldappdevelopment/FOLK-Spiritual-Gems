package com.folkcrm.gems;

import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;
import com.bumptech.glide.Glide;

/**
 * Manages the native Android system overlay for caller identification.
 * Handles view creation, data updates, and user interactions.
 */
public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private WindowManager windowManager;
    private View overlayView;
    private Context appContext;
    private boolean isShowing = false;

    private CallerOverlayManager() {}

    public static synchronized CallerOverlayManager getInstance(Context context) {
        if (instance == null) {
            instance = new CallerOverlayManager();
        }
        // Always store applicationContext to avoid leaking Activity or Service instances
        instance.appContext = context.getApplicationContext();
        return instance;
    }

    public void showOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (isShowing) {
            updateOverlay(name, phone, photoUrl, stage, remark, type);
            return;
        }
        if (appContext == null) return;

        windowManager = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
        LayoutInflater inflater = (LayoutInflater) appContext.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.overlay_caller, null);

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | 
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | 
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP;
        params.x = 0;
        params.y = 100;

        updateViewData(name, phone, photoUrl, stage, remark, type);

        // Wiring interaction buttons
        overlayView.findViewById(R.id.btn_close).setOnClickListener(v -> hideOverlay());
        
        overlayView.findViewById(R.id.btn_start_session).setOnClickListener(v -> {
            CallLogPlugin.emitNativeAction("startSession");
            hideOverlay();
        });

        overlayView.findViewById(R.id.btn_view_profile).setOnClickListener(v -> {
            CallLogPlugin.emitNativeAction("viewProfile");
            hideOverlay();
        });

        windowManager.addView(overlayView, params);
        isShowing = true;
    }

    public void updateOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (isShowing && overlayView != null) {
            updateViewData(name, phone, photoUrl, stage, remark, type);
        }
    }

    private void updateViewData(String name, String phone, String photoUrl, String stage, String remark, String type) {
        TextView tvName = overlayView.findViewById(R.id.tv_caller_name);
        TextView tvPhone = overlayView.findViewById(R.id.tv_caller_phone);
        TextView tvStage = overlayView.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = overlayView.findViewById(R.id.tv_caller_remark);
        ImageView ivPhoto = overlayView.findViewById(R.id.iv_caller_photo);
        View indicator = overlayView.findViewById(R.id.call_type_indicator);

        if (tvName != null) tvName.setText(name);
        if (tvPhone != null) tvPhone.setText(phone);
        if (tvStage != null) tvStage.setText(stage);
        
        if (tvRemark != null) {
            tvRemark.setText(remark != null && !remark.isEmpty() ? "\"" + remark + "\"" : "No recent notes");
        }

        if (ivPhoto != null && photoUrl != null && !photoUrl.isEmpty() && appContext != null) {
            try {
                Glide.with(appContext).load(photoUrl).circleCrop().placeholder(R.drawable.ic_stat_name).into(ivPhoto);
            } catch (Exception e) {
                // Glide silent fail or context invalid
            }
        }

        if (indicator != null) {
            // Blue for INCOMING (#3F51B5), Green for OUTGOING (#4CAF50)
            indicator.setBackgroundColor(type.equals("INCOMING") ? 0xFF3F51B5 : 0xFF4CAF50);
        }
    }

    public void hideOverlay() {
        if (isShowing && windowManager != null && overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                // View might have been removed already
            }
            overlayView = null;
            isShowing = false;
        }
    }
}