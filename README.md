# NEXORA — One World. One Platform.

All-in-one Android social media ecosystem combining Home Feed, Stories, Pulse Threads, Reels, Long-form Watch, Communities, Private & Group Messaging with Voice Notes, and Server-Side Gemini AI.

## Project Structure

- `nexora_android/` — Complete Android Studio-compatible Flutter + Dart + Kotlin + Gradle project (`applicationId "com.nexora.social"`, `minSdk 24`, `targetSdk 35`, adaptive launcher icon, splash screen, ProGuard release config).
- `nexora_backend/` — Production Python FastAPI + async SQLAlchemy + PostgreSQL schema (`sql/schema.sql`) + WebSocket real-time hub + Docker Compose stack + server-side Gemini AI router.
- `server.ts` & `src/` — Live interactive full-stack NEXORA web preview & Android Project Kit inspector running on port 3000 with persistent storage, WebSocket chat/notifications, media uploads, and downloadable `nexora-android-studio-kit.zip`.
- `BUILD_APK.md` — Exact instructions to compile `build/app/outputs/flutter-apk/app-release.apk` locally or in Android Studio.
