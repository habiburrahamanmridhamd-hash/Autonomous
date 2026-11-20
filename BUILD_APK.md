# NEXORA — Android APK Compilation & Deployment Guide

## Environment Status Notice
Google AI Studio executes in a cloud web container where Flutter SDK and the Android SDK (`adb`, `gradle`, `aapt2`) are not pre-installed. Therefore, `app-release.apk` cannot be compiled inside this web container, and no fabricated APK link is provided.

Instead, the **complete Android Studio-compatible Flutter project** (`/nexora_android`), **Python FastAPI + PostgreSQL backend** (`/nexora_backend`), and **live full-stack interactive NEXORA application** (running on port 3000) are included and ready. You can download the complete project zip directly from the **Android APK Kit** tab inside the live NEXORA app.

---

## Step 1: Start the Python FastAPI + PostgreSQL Backend
```bash
cd nexora_backend
cp .env.example .env
# Edit .env and set JWT_SECRET and GEMINI_API_KEY
docker compose up -d --build
```
Verify health:
```bash
curl http://localhost:8000/health
```

---

## Step 2: Generate Android Release Keystore (Once)
```bash
cd nexora_android/android
keytool -genkey -v -keystore nexora-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias nexora
cp key.properties.example key.properties
# Fill in your keystore passwords in android/key.properties
```

---

## Step 3: Build `app-release.apk`
Option A — Flutter CLI:
```bash
cd nexora_android
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR_BACKEND_DOMAIN/api/v1
```

Option B — Android Studio:
1. Open `/nexora_android` in Android Studio.
2. Wait for Gradle sync (`compileSdk 35`, `minSdk 24`, `applicationId com.nexora.social`).
3. Select **Build > Flutter > Build APK** (or **Build > Generate Signed Bundle / APK**).

Output APK file:
```
nexora_android/build/app/outputs/flutter-apk/app-release.apk
```

Install onto a connected Android phone:
```bash
adb install nexora_android/build/app/outputs/flutter-apk/app-release.apk
```
