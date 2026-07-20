# Snow AI — from zero to an installed APK, using only a tablet

This assumes: no laptop, no Android SDK, just a browser (Codespaces runs in
a browser) and a phone to eventually install the APK on. Every command
below runs in the Codespaces terminal, not on your tablet directly.

Total time, realistically: 30–45 minutes the first time, mostly waiting on
builds — not because it's hard, but cloud builds take a few minutes each
and you'll likely hit at least one thing to fix and rebuild.

---

## Stage 0 — Get the code into a GitHub repo

Codespaces needs a repo to open. On your tablet, in a mobile browser:

1. Go to github.com, create a new **empty** repository, e.g. `snow-ai`
2. Use GitHub's own web uploader (repo page → "Add file" → "Upload files")
   to upload everything from this project — both the `backend/` and
   `mobile/` folders, keeping that folder structure
3. Commit directly to `main`

You now have a repo Codespaces can open.

## Stage 1 — Open Codespaces

1. On the repo page, tap **Code** → **Codespaces** tab → **Create codespace
   on main**
2. Wait for it to boot — you get a full VS Code environment in your browser,
   with a real Linux machine behind it (this is where the actual build
   horsepower comes from, not your tablet)
3. Open the terminal (hamburger menu → Terminal → New Terminal, or it may
   already be open at the bottom)

## Stage 2 — Install dependencies

```bash
cd mobile
npm install
npm install -g eas-cli
```

This runs on Codespaces' machine — no RAM/storage pressure on your tablet
at all, which is the whole point of not using Termux for this part.

## Stage 3 — Confirm it runs in Expo Go first (sanity check)

Before spending a cloud build on something broken, confirm the JS itself
is sound:

```bash
npx expo start --tunnel
```

`--tunnel` is required here since Codespaces isn't on your phone's local
network. This prints a QR code in the terminal.

- Install **Expo Go** from the Play Store on your phone
- Scan the QR code
- The app should open showing the Snow chat screen

**Expected at this stage:** chat UI loads, status shows "Backend
unreachable" (correct — no backend is running yet), and **the mic
button/voice mode will show but tapping "Tap to talk" will fail** —
`@react-native-voice/voice` is a native module Expo Go doesn't include.
That's expected, not a bug — this is exactly why Stage 4 exists.

Press `Ctrl+C` to stop once you've confirmed it loads.

## Stage 4 — Create an Expo account + EAS project

EAS Build needs a free Expo account to build against.

```bash
npx expo login
```

Follow the prompts (create an account at expo.dev if you don't have one).
Then:

```bash
eas build:configure
```

This links your project to EAS and writes an `eas.json` config file.

## Stage 5 — The actual cloud build

```bash
eas build --platform android --profile preview
```

This uploads your project to Expo's cloud build servers — this is the
step that replaces needing Android Studio/Gradle on your own device
entirely. It will:

- Ask a few setup questions the first time (accept defaults unless you
  know otherwise)
- Generate an Android keystore for you automatically (say yes — you don't
  need to manage this yourself for a preview/testing build)
- Queue and run the build — typically 10–20 minutes on the free tier

When it finishes, it prints a URL to download the `.apk` file directly.

## Stage 6 — Install it on your phone

1. Open that URL on your phone (or scan the QR code EAS also prints)
2. Download the `.apk`
3. Android will warn about installing from an unknown source — this is
   normal for a non-Play-Store app; allow it for this install
4. Open the app

**At this stage:** tap-to-talk voice mode now actually works, because this
is a real native build, not Expo Go. Wake-word ("Hey Snow") still won't
detect anything yet — that needs your own Picovoice AccessKey, per
`mobile/voice/README.md`.

## Stage 7 — The backend is still separate

The APK is just the app shell — it still needs `backend/api.py` running
somewhere reachable, with a real TinyLlama GGUF on disk, or you'll see the
honest "chat model not found" message throughout. Options, roughly in
order of effort:

- Simplest for testing: run `python api.py` in this same Codespace,
  use its forwarded port URL in `mobile/config.js`'s `API_BASE_URL`,
  rebuild
- Real target per your PRD: the backend eventually needs to run
  **on the phone itself** for true offline operation — that's a separate,
  larger piece of work (packaging Python + llama.cpp for Android, e.g. via
  Chaquopy or a compiled binary) which is its own project stage, not
  something to fold into this build step

## Known friction points, named honestly

- **First EAS build often fails on something small** — a missing plugin
  config, a version mismatch. Read the error in the build log link EAS
  gives you; it's almost always specific and fixable, not mysterious.
- **`@react-native-voice/voice` occasionally needs a matching Android
  permission prompt handled at runtime**, not just in `app.json` — if
  tap-to-talk shows a mic error on first real use, check that the app
  was granted microphone permission in Android's app settings.
- **Codespaces free tier has monthly hour limits** — fine for this kind of
  iterative building, but don't leave codespaces running idle.
