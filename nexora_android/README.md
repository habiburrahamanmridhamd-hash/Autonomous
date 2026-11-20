# NEXORA Android Application (Flutter + Kotlin + Gradle)

Application ID: `com.nexora.social`
Display Name: `NEXORA`
Tagline: `One World. One Platform.`

## Prerequisites for Building the Release APK
1. Flutter SDK (`>= 3.22.0`)
2. Android Studio + Android SDK (API 35, Build Tools 35.0.0)
3. Java 17 (bundled with Android Studio)

## Build Release APK (`app-release.apk`)
```bash
cd nexora_android
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://your-fastapi-server.example.com
```
Output APK path:
`nexora_android/build/app/outputs/flutter-apk/app-release.apk`
