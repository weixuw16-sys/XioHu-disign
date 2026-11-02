# Android app

This is the native Android package for **我们的小小宇宙**. Capacitor packages
the existing couple-space pages into an Android app; the installed app starts
on the role setup page and works offline after installation.

The couple app connects through the existing Supabase project. Apply the
migrations `20261016000000_create_love_couples.sql`,
`20261017000000_create_love_push_tokens.sql`, and
`20261018000000_create_love_memories.sql` in its SQL Editor, then deploy the
`couple-sync` function before sharing the APK. The memories migration creates
a private cloud storage bucket; paired phones can then share daily records and
up to five photos/videos (25 MB each). Existing records created before cloud
sync remain on their original device. Firebase Cloud Messaging requires a
Firebase project, an ignored `android/app/google-services.json` file, and the
server-only `FIREBASE_SERVICE_ACCOUNT_JSON` Supabase secret. See
`supabase/SETUP.md`.

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
