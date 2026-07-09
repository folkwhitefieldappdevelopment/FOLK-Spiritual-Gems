# FOLK Spiritual Gems CRM

## Native Android Setup (Capacitor)

To ensure notifications and real-time call tracking work correctly on Android, verify the following in your native project:

### Android Permissions
Add these to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

### Notification Icons
Ensure you have a white icon named `ic_stat_name` in your `res/drawable` folders for Android 13+ status bar notifications.

## Outreach Pulse Report
The Intro bracket strictly includes members chanting **exactly 1 round**. All statistical metrics in the Group Pulse view ignore 0-rounders to provide a more accurate engagement score.