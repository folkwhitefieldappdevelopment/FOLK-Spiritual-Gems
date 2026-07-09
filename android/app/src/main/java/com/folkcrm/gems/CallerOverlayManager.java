package com.folkcrm.gems;

import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.request.RequestOptions;

public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;
    private Context appContext;

    private CallerOverlayManager() {}

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
        overlayView = inflater.inflate(R.layout.overlay_caller, null);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ?
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP;
        params.y = 100;

        setupView(overlayView, name, phone, photoUrl, stage, remark, type);

        try {
            windowManager.addView(overlayView, params);
            isShowing = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupView(View view, String name, String phone, String photoUrl, String stage, String remark, String type) {
        TextView tvName = view.findViewById(R.id.tv_caller_name);
        TextView tvPhone = view.findViewById(R.id.tv_caller_phone);
        TextView tvStage = view.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = view.findViewById(R.id.tv_caller_remark);
        ImageView ivPhoto = view.findViewById(R.id.iv_caller_photo);
        View indicator = view.findViewById(R.id.call_type_indicator);
        ImageButton btnClose = view.findViewById(R.id.btn_close_overlay);
        Button btnStartSession = view.findViewById(R.id.btn_start_session);
        Button btnViewProfile = view.findViewById(R.id.btn_view_profile);

        tvName.setText(name != null ? name : "Unknown Contact");
        tvPhone.setText(phone != null ? phone : "");
        tvStage.setText(stage != null ? stage : "Fresh Lead");
        tvRemark.setText(remark != null && !remark.isEmpty() ? "\"" + remark + "\"" : "No previous notes.");
        
        if (indicator != null) {
            indicator.setBackgroundColor(appContext.getResources().getColor(
                "INCOMING".equals(type) ? android.R.color.holo_blue_light : android.R.color.holo_green_light
            ));
        }

        if (photoUrl != null && !photoUrl.isEmpty()) {
            Glide.with(appContext)
                .load(photoUrl)
                .apply(RequestOptions.circleCropTransform())
                .placeholder(R.drawable.ic_launcher_foreground)
                .into(ivPhoto);
        } else {
            ivPhoto.setImageResource(R.drawable.ic_launcher_foreground);
        }

        btnClose.setOnClickListener(v -> hideOverlay());
        
        btnStartSession.setOnClickListener(v -> {
            CallLogPlugin.emitOverlayAction("startSession");
            hideOverlay();
        });

        btnViewProfile.setOnClickListener(v -> {
            CallLogPlugin.emitOverlayAction("viewProfile");
            hideOverlay();
        });
    }

    public void updateOverlay(String name, String phone, String photoUrl, String stage, String remark, String type) {
        if (isShowing && overlayView != null) {
            setupView(overlayView, name, phone, photoUrl, stage, remark, type);
        }
    }

    public void hideOverlay() {
        if (isShowing && overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                isShowing = false;
                overlayView = null;
            }
        }
    }

    public boolean isShowing() {
        return isShowing;
    }
}