# Apex 4K Financial TV — Standalone Amazon Fire TV APK

This directory contains the native Android TV / Amazon Fire TV Leanback app (`com.apex4k.financialtv`) that runs **Apex 4K Financial TV** natively on your Fire TV 4K in full-screen landscape mode with D-pad remote navigation and `FLAG_KEEP_SCREEN_ON`.

## How Native Standalone Execution Works
The APK bundles the compiled React/Vite terminal directly inside `app/src/main/assets/` and serves it locally on-device via AndroidX `WebViewAssetLoader` (`https://appassets.androidplatform.net/index.html`)—so **no external server URL or Cloud Run deployment is required** and you never hit a `404 Page not found` error.

- **Direct Live Market & News Feeds**: A native `/__native_fetch` bridge in `MainActivity.kt` fetches live candlesticks, ticker quotes, and breaking financial RSS headlines straight from Binance Spot, Binance Futures (`.P`), Yahoo Finance, and RSS feeds without browser CORS restrictions.
- **Optional Multi-Device Push Sync**: Open **Sync** in the app (or press the Fire TV remote **Menu** button) if you ever want to pair the standalone TV with a hosted server URL for multi-TV workspace mirroring.

## Building the APK

### Option A: Automatic GitHub Actions Build (Commits APK into Repo)
Pushing to `main` runs `.github/workflows/build-firetv-apk.yml`, which builds `dist/`, copies it into `android-tv/app/src/main/assets/`, compiles `app-release.apk`, commits **`android-tv/apk/apex-4k-firetv.apk`** directly into your Git repository, attaches it to the **`latest` GitHub Release**, and uploads the workflow artifact.

### Option B: Local Build & Sideload via ADB
```bash
npm ci && npm run build
rm -rf android-tv/app/src/main/assets
mkdir -p android-tv/app/src/main/assets
cp -R dist/. android-tv/app/src/main/assets/

cd android-tv
gradle assembleRelease
adb connect <FIRE_TV_IP>:5555
adb install -r app/build/outputs/apk/release/app-release.apk
```
