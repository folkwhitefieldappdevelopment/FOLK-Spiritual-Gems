#!/bin/bash
# Aggressive cleanup to recover disk space and fix corrupted build/gradle states
echo "Cleaning up build artifacts and temporary files..."

# Remove Next.js and Node artifacts
rm -rf .next
rm -rf node_modules
rm -rf out
rm -f package-lock.json

# Remove Gradle and Android build caches (Fixes Binary Store errors)
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/build

# Clear global gradle cache if accessible
rm -rf ~/.gradle/caches/
rm -rf ~/.gradle/.tmp/

echo "Cleanup complete. The system will now attempt a fresh installation and build."
