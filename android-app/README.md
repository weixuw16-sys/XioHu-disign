# Android app

This is the native Android package for **我们的小小宇宙**. Capacitor packages
the existing couple-space pages into an Android app; the installed app starts
on the role setup page and works offline after installation.

The couple app connects through the existing Supabase project. Apply
`supabase/migrations/20261016000000_create_love_couples.sql` in its SQL Editor
and `supabase/migrations/20261017000000_create_love_push_tokens.sql`, then
deploy the `couple-sync` function before sharing the APK. The boy creates a
10-character invitation code; the girl installs the app and enters it to
receive the confession. Firebase Cloud Messaging requires a Firebase project,
an ignored `android/app/google-services.json` file, and the server-only
`FIREBASE_SERVICE_ACCOUNT_JSON` Supabase secret. See `supabase/SETUP.md`.
Daily photos and videos are currently stored on each device.

## Build a debug APK on Windows

Install Android Studio with the Android SDK and JDK 21 or newer, then make
sure `ANDROID_HOME` or `ANDROID_SDK_ROOT` points to the SDK installation.

From this directory, run:

```powershell
npm.cmd install
npm.cmd run android:build:debug
```

If the native `android` project has not been generated yet, run
`npm.cmd run android:add` once before building.

The installable debug APK is written to
`android\app\build\outputs\apk\debug\app-debug.apk`.

To open the native project in Android Studio instead, run:

```powershell
npm.cmd run android:open
```

Re-run `npm.cmd run android:build:debug` after changing a site page, style, or
script so the latest files are copied into the Android app.
