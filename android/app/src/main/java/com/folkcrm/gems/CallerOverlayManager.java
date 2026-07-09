package com.folkcrm.gems;

import android.content.Context;
import android.graphics.Color;
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
import java.util.Map;

/**
 * Singleton to manage the native Android overlay using WindowManager.
 */
public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;

    private CallerOverlayManager() {}

    public static synchronized CallerOverlayManager getInstance() {
        if (instance == null) {
            instance = new CallerOverlayManager();
        }
        return instance;
    }

    public void showOverlay(Context context, Map<String, Object> data, final OverlayActionListener listener) {
        if (isShowing) {
            updateOverlay(data);
            return;
        }

        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
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
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP;
        params.y = 100; // Offset from top

        updateViewData(overlayView, data);

        // Buttons
        Button btnStartSession = overlayView.findViewById(R.id.btn_start_session);
        btnStartSession.setOnClickListener(v -> {
            if (listener != null) listener.onAction("startSession");
            hideOverlay();
        });

        Button btnViewProfile = overlayView.findViewById(R.id.btn_view_profile);
        btnViewProfile.setOnClickListener(v -> {
            if (listener != null) listener.onAction("viewProfile");
            hideOverlay();
        });

        ImageButton btnClose = overlayView.findViewById(R.id.btn_close_overlay);
        btnClose.setOnClickListener(v -> hideOverlay());

        windowManager.addView(overlayView, params);
        isShowing = true;
    }

    public void updateOverlay(Map<String, Object> data) {
        if (isShowing && overlayView != null) {
            updateViewData(overlayView, data);
        }
    }

    private void updateViewData(View view, Map<String, Object> data) {
        TextView tvName = view.findViewById(R.id.tv_caller_name);
        TextView tvPhone = view.findViewById(R.id.tv_caller_phone);
        TextView tvStage = view.findViewById(R.id.tv_caller_stage);
        TextView tvRemark = view.findViewById(R.id.tv_caller_remark);
        ImageView ivPhoto = view.findViewById(R.id.iv_caller_photo);
        View indicator = view.findViewById(R.id.call_type_indicator);

        tvName.setText((String) data.get("name"));
        tvPhone.setText((String) data.get("phone"));
        tvStage.setText((String) data.get("stage"));
        
        String remark = (String) data.get("remark");
        tvRemark.setText(remark != null && !remark.isEmpty() ? remark : "No previous interaction notes found.");

        String type = (String) data.get("type");
        if ("INCOMING".equals(type)) {
            indicator.setBackgroundColor(Color.parseColor("#3F51B5")); // Blue
        } else {
            indicator.setBackgroundColor(Color.parseColor("#4CAF50")); // Green
        }

        String photoUrl = (String) data.get("photoUrl");
        if (photoUrl != null && !photoUrl.isEmpty()) {
            Glide.with(view.getContext()).load(photoUrl).into(ivPhoto);
        }
    }

    public void hideOverlay() {
        if (isShowing && windowManager != null && overlayView != null) {
            windowManager.removeView(overlayView);
            overlayView = null;
            isShowing = false;
        }
    }

    public interface OverlayActionListener {
        void onAction(String action);
    }
}