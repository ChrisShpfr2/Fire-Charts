# Apex 4K Financial TV — Amazon Fire TV APK Wrapper

This directory contains the native Android TV / Amazon Fire TV Leanback WebView wrapper (`com.apex4k.financialtv`) that loads the live **Apex 4K Financial TV** terminal in full-screen 4K landscape mode with D-pad remote support and `FLAG_KEEP_SCREEN_ON`.

## How Automatic Multi-Device Updates Work
Because the Fire TV APK connects directly to your hosted terminal URL over HTTP + WebSockets (`/ws`):
1. **Live Workspace & Alert Push**: Changing chart layouts, symbols, timeframes, indicators, settings, or price alerts on any browser or Fire TV immediately pushes updates to all connected devices.
2. **OTA App Updates**: Deploying a new web build or clicking **Push App Reload to All TVs** in the Sync modal broadcasts an `app:update` event over WebSockets so connected Fire TVs automatically refresh to the latest version—no manual APK re-sideloading required.

## Building the APK

### Option A: Automatic GitHub Actions Build (Commits APK into Repo)
Pushing to `main` runs `.github/workflows/build-firetv-apk.yml`, which compiles `app-release.apk`, commits **`android-tv/apk/apex-4k-firetv.apk`** directly into your Git repository, attaches it to the **`latest` GitHub Release**, and uploads the workflow artifact.

### Option B: Local Build & Sideload via ADB
```bash
cd android-tv
gradle assembleRelease -PTERMINAL_URL=https://YOUR_HOSTED_APP_URL
adb connect <FIRE_TV_IP>:5555
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting `404 Page not found` on Fire TV
- The default embedded URL (`https://ais-pre-foywkngep6ipdhdrjifkll-853935803100.europe-west2.run.app`) only responds once you **Share / Deploy** the app in Google AI Studio.
- On the updated APK, pressing the **Menu** button on the Fire TV remote (or hitting a 404/network error) opens a **Server URL** dialog so you can type and save any live deployed or local LAN URL without rebuilding the APK.
