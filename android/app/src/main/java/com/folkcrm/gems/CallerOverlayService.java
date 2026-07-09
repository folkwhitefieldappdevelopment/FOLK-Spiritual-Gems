package com.folkcrm.gems;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class CallerOverlayService extends Service {
    private static final String CHANNEL_ID = "CallerOverlayChannel";
    private static final int NOTIFICATION_ID = 101;
    private static final String TAG = "CallerOverlayService";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if ("STOP_SERVICE".equals(action)) {
            Log.d(TAG, "Stopping service via action");
            CallerOverlayManager.getInstance(this).hideOverlay();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Preaching Context Active")
                .setContentText("Identifying incoming/outgoing calls...")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        if (intent != null && intent.hasExtra("name")) {
            String name = intent.getStringExtra("name");
            String phone = intent.getStringExtra("phone");
            String photoUrl = intent.getStringExtra("photoUrl");
            String stage = intent.getStringExtra("stage");
            String remark = intent.getStringExtra("remark");
            String type = intent.getStringExtra("type");

            Log.d(TAG, "Showing overlay for: " + name);
            CallerOverlayManager.getInstance(this).showOverlay(name, phone, photoUrl, stage, remark, type);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        CallerOverlayManager.getInstance(this).hideOverlay();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Caller ID Overlay Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}