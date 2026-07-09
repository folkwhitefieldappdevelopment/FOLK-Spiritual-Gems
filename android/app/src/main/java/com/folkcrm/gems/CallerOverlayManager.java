package com.folkcrm.gems;

import android.content.Context;
import android.graphics.PixelFormat;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;
import com.bumptech.glide.Glide;

public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private Context appContext;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;

    public static synchronized CallerOverlayManager getInstance(Context context) {
        if (instance == null) {
            instance = new CallerOverlayManager();
        }
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
        
        try {
            overlayView = inflater.inflate(R.layout.overlay_caller, null);

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.TOP;
            params.y = 100;

            updateViewData(name, phone, photoUrl, stage, remark, type);

            overlayView.findViewById(R.id.btn_start_session).setOnClickListener(v -> {
                CallLogPlugin.emitOverlayAction("startSession");
                hideOverlay();
            });

            overlayView.findViewById(R.id.btn_view_profile).setOnClickListener(v -> {
                CallLogPlugin.emitOverlayAction("viewProfile");
                hideOverlay();
            });

            overlayView.findViewById(R.id.btn_close_overlay).setOnClickListener(v -> hideOverlay());

            windowManager.addView(overlayView, params);
            isShowing = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void updateOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (isShowing && overlayView != null) {
            updateViewData(name, phone, photoUrl, stage, remark, type);
        }
    }

    private void updateViewData(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (overlayView == null) return;

        TextView tvName = overlayView.findViewById(R.id.tv_caller_name);
        TextView tvPhone = overlayView.findViewById(R.id.tv_caller_phone);
        TextView tvStage = overlayView.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = overlayView.findViewById(R.id.tv_caller_remark);
        ImageView ivPhoto = overlayView.findViewById(R.id.iv_caller_photo);
        View indicator = overlayView.findViewById(R.id.type_indicator);

        tvName.setText(name);
        tvPhone.setText(phone);
        tvStage.setText(stage);
        tvRemark.setText(remark != null && !remark.isEmpty() ? "\"" + remark + "\"" : "No previous notes");

        if (photoUrl != null && !photoUrl.isEmpty() && !photoUrl.contains("placehold.co")) {
            Glide.with(appContext).load(photoUrl).circleCrop().into(ivPhoto);
        } else {
            ivPhoto.setImageResource(R.drawable.ic_launcher_foreground);
        }

        if ("INCOMING".equals(type)) {
            indicator.setBackgroundColor(appContext.getResources().getColor(android.R.color.holo_blue_light));
        } else {
            indicator.setBackgroundColor(appContext.getResources().getColor(android.R.color.holo_green_light));
        }
    }

    public void hideOverlay() {
        if (isShowing && windowManager != null && overlayView != null) {
            windowManager.removeView(overlayView);
            isShowing = false;
            overlayView = null;
        }
    }

    public boolean isShowing() {
        return isShowing;
    }
}