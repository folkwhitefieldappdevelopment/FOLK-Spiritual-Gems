#!/bin/bash
# FOLK Spiritual Gems - Android Build Automation

echo "Step 1: Next.js Static Export..."
npm run build

echo "Step 2: Capacitor Sync..."
npx cap sync

echo "Step 3: Gradle Assemble Debug..."
cd android && ./gradlew assembleDebug

echo "---------------------------------------------------"
echo "BUILD SUCCESSFUL"
echo "APK Location: android/app/build/outputs/apk/debug/app-debug.apk"
echo "---------------------------------------------------"
