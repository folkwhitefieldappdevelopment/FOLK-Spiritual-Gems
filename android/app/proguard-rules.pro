# Capacitor core — accessed via reflection for plugin dispatch
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}

# Any Capacitor plugin class (built-in or custom)
-keep public class * extends com.getcapacitor.Plugin { public *; }

# This app's own custom native components (referenced by class name from
# AndroidManifest.xml and Capacitor's reflection-based plugin registration)
-keep class com.folkcrm.gems.CallLogPlugin { *; }
-keep class com.folkcrm.gems.CallStateReceiver { *; }
-keep class com.folkcrm.gems.CallerOverlayService { *; }
-keep class com.folkcrm.gems.CallerOverlayManager { *; }
-keep class com.folkcrm.gems.MainActivity { *; }

# Glide (uses reflection/annotation processing)
-keep public class * extends com.bumptech.glide.module.AppGlideModule
-keep class com.bumptech.glide.GeneratedAppGlideModuleImpl { *; }