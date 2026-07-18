package com.folkcrm.gems;

import android.content.Context;
import android.content.Intent;
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
import java.util.List;

public class CallerOverlayManager {
    private static CallerOverlayManager instance;
    private final Context appContext;
    private final WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private boolean callEnded = false;

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

    public boolean showOverlay(String name, String phone, String photoUrl, String stage, String remark, String type,
                               String occupation, String enabler, String folkGuide, Integer chantingStatus,
                               List<String> attendance, boolean isAdmin, String sessionId, String sessionName, Integer currentIndex) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(appContext)) {
            return false;
        }
        callEnded = false;

        if (overlayView != null) {
            bindContent(name, phone, photoUrl, stage, remark, type, occupation, enabler, folkGuide,
                chantingStatus, attendance, isAdmin, sessionId, sessionName, currentIndex);
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
        bindContent(name, phone, photoUrl, stage, remark, type, occupation, enabler, folkGuide,
            chantingStatus, attendance, isAdmin, sessionId, sessionName, currentIndex);

        try {
            windowManager.addView(overlayView, params);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            overlayView = null;
            return false;
        }
    }

    public void markCallEnded() {
        callEnded = true;
        if (overlayView == null) return;
        TextView tvStatus = overlayView.findViewById(R.id.tv_call_status);
        View indicator = overlayView.findViewById(R.id.call_type_indicator);
        if (tvStatus != null) tvStatus.setText("CALL ENDED");
        if (indicator != null) indicator.setBackgroundColor(Color.parseColor("#555577"));
    }

    private void setRow(View row, TextView valueView, String value) {
        if (value == null || value.trim().isEmpty()) {
            row.setVisibility(View.GONE);
        } else {
            row.setVisibility(View.VISIBLE);
            valueView.setText(value);
        }
    }

    private void bindContent(String name, String phone, String photoUrl, String stage, String remark, String type,
                              String occupation, String enabler, String folkGuide, Integer chantingStatus,
                              List<String> attendance, boolean isAdmin, String sessionId, String sessionName, Integer currentIndex) {
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

        View rowOccupation = overlayView.findViewById(R.id.row_occupation);
        TextView tvOccupation = overlayView.findViewById(R.id.tv_caller_occupation);
        View rowEnabler = overlayView.findViewById(R.id.row_enabler);
        TextView tvEnabler = overlayView.findViewById(R.id.tv_caller_enabler);
        View rowFg = overlayView.findViewById(R.id.row_fg);
        TextView tvFg = overlayView.findViewById(R.id.tv_caller_fg);
        View rowChanting = overlayView.findViewById(R.id.row_chanting);
        TextView tvChanting = overlayView.findViewById(R.id.tv_caller_chanting);
        View rowAttendance = overlayView.findViewById(R.id.row_attendance);
        TextView tvAttendance = overlayView.findViewById(R.id.tv_caller_attendance);
        View btnResumeSession = overlayView.findViewById(R.id.btn_resume_session);

        boolean hasName = name != null && !name.isEmpty();
        tvName.setText(hasName ? name : "Identifying…");
        tvPhone.setText(phone != null ? phone : "");
        tvStage.setText(stage != null && !stage.isEmpty() ? stage : "Fresh Lead");
        tvRemark.setText(remark != null && !remark.isEmpty() ? "\u201c" + remark + "\u201d" : "No previous remarks recorded.");
        tvStatus.setText(callEnded ? "CALL ENDED" : ("INCOMING".equals(type) ? "INCOMING CALL" : "OUTGOING CALL"));
        indicator.setBackgroundColor(callEnded ? Color.parseColor("#555577")
            : "INCOMING".equals(type) ? Color.parseColor("#6C7FE0") : Color.parseColor("#5FBF8F"));

        setRow(rowOccupation, tvOccupation, occupation);
        setRow(rowEnabler, tvEnabler, enabler);
        setRow(rowFg, tvFg, isAdmin ? folkGuide : null);

        if (chantingStatus != null && chantingStatus > 0) {
            rowChanting.setVisibility(View.VISIBLE);
            tvChanting.setText("Chanting: " + chantingStatus + " rounds");
        } else {
            rowChanting.setVisibility(View.GONE);
        }

        if (attendance != null && !attendance.isEmpty()) {
            rowAttendance.setVisibility(View.VISIBLE);
            StringBuilder sb = new StringBuilder();
            int shown = Math.min(3, attendance.size());
            for (int i = 0; i < shown; i++) {
                if (i > 0) sb.append("\n");
                sb.append(attendance.get(i));
            }
            if (attendance.size() > shown) sb.append("\n+" + (attendance.size() - shown) + " more");
            tvAttendance.setText(sb.toString());
        } else {
            rowAttendance.setVisibility(View.GONE);
        }

        if (sessionId != null && !sessionId.isEmpty()) {
            btnResumeSession.setVisibility(View.VISIBLE);
            ((TextView) btnResumeSession).setText("Resume: " + (sessionName != null ? sessionName : "Session"));
            btnResumeSession.setOnClickListener(v -> {
                launchApp();
                CallLogPlugin.emitOverlayAction("resumeSession", sessionId, currentIndex != null ? currentIndex : 0);
                hideOverlay();
            });
        } else {
            btnResumeSession.setVisibility(View.GONE);
        }

        if (photoUrl != null && !photoUrl.isEmpty()) {
            ivPhoto.setVisibility(View.VISIBLE);
            tvInitial.setVisibility(View.GONE);
            Glide.with(appContext).load(photoUrl).circleCrop().into(ivPhoto);
        } else {
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

        btnProfile.setOnClickListener(v -> { launchApp(); CallLogPlugin.emitOverlayAction("viewProfile"); hideOverlay(); });
        btnSession.setOnClickListener(v -> { launchApp(); CallLogPlugin.emitOverlayAction("startSession"); hideOverlay(); });
    }

    private void launchApp() {
        Intent launchIntent = new Intent(appContext, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        appContext.startActivity(launchIntent);
    }

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