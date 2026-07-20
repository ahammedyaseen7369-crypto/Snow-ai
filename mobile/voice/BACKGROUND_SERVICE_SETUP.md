# Making "Hey Snow" survive in the background

Android kills background mic access aggressively to save battery. For
wake-word listening to keep running while the screen is off or another app
is open, Snow needs to run as a **foreground service** — which legally
requires a persistent notification the user can always see and tap to stop.

This is not optional plumbing you can skip — Android will silently kill a
plain background listener within a few minutes, and any wake-word feature
that isn't backed by a real foreground service will work in your demo and
then quietly stop working on a real device the first time the screen locks.

## 1. Permissions — `app.json`

```jsonc
{
  "expo": {
    // ...existing config...
    "android": {
      "package": "com.snowai.ultralite",
      "permissions": [
        "RECORD_AUDIO",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MICROPHONE",
        "POST_NOTIFICATIONS"
      ]
    },
    "plugins": [
      [
        "expo-build-properties",
        { "android": { "minSdkVersion": 24 } }
      ]
    ]
  }
}
```

`FOREGROUND_SERVICE_MICROPHONE` is required on Android 14+ specifically for
mic-based foreground services — omitting it means the service is rejected
by the OS on newer devices even if everything else is correct.

## 2. The always-visible notification

While wake-word listening is active, the user sees a persistent notification
like:

> **Snow is listening** — tap to stop

This is required by the OS, and it's also the right call for a privacy-first
product — a "someone might always be listening" state should never be
invisible. Tapping it should immediately call `SnowWakeWordService.stop()`.

## 3. Bare workflow requirement

Foreground services with microphone access need native Android code that
plain Expo Go cannot run. This means once wake-word is wired in, you're on
an **Expo prebuild / development build**, not Expo Go, for testing:

```bash
npx expo prebuild
npx expo run:android
```

This is expected, not a bug — Expo Go intentionally can't run custom native
services like this. It's the natural next step once you're past pure-JS
prototyping, which is exactly where this project now is.

## 4. Battery honesty

Even done correctly, always-on wake-word listening has a real, non-zero
battery cost — Porcupine is built to be lightweight, but "always" is still
"always." Consider exposing a setting: wake-word on by default only while
charging, or a manual toggle, rather than forcing it always-on with no
escape hatch.
