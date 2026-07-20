# Snow AI — Voice mode

Three pieces, with very different levels of "actually done":

## 1. Tap-to-talk (fully real, works today)

`speechIO.js` wraps `expo-speech` (text-to-speech) and
`@react-native-voice/voice` (speech-to-text) — both are the device's own
native APIs. No account, no model download, no external service. Install:

```bash
npx expo install expo-speech @react-native-voice/voice
```

`components/VoiceMode.jsx` is the full-screen state machine — idle,
listening, thinking, speaking, error — wired to your real `/chat` endpoint
via `sendMessage()` from `api/snowClient.js`. Wire it into your navigator
as a screen or modal, launched from a mic button.

## 2. "Hey Snow" always-listening wake word (real code, needs your setup)

`wakeWordService.js` wraps Porcupine (Picovoice). This is real, working
code — but it will not detect anything until you:

1. Create a free account at https://console.picovoice.ai
2. Generate an AccessKey and paste it into `PICOVOICE_ACCESS_KEY`
3. Train (or pick a close stock option) a "Snow" wake-word model there,
   download the `.ppn` file, and bundle it as a native asset

I can't do this step for you — it's tied to your account. Budget maybe
15–20 minutes for it once you're ready for this feature specifically.

Don't want a third-party account at all? **openWakeWord** is a fully open
source, self-trainable alternative with no account requirement — heavier
to set up (you train/export a model yourself) but no external dependency.
Ask if you want that path scaffolded instead.

## 3. Keeping it listening in the background (setup doc, not skippable)

See `BACKGROUND_SERVICE_SETUP.md`. Android requires a foreground service
with a persistent notification for any always-on microphone use — this
isn't a corner I cut, it's an OS requirement, and skipping it means "Hey
Snow" works in your hand and silently stops the moment the screen locks.

This also means wake-word testing needs `expo prebuild` + a dev build,
not Expo Go.

## What to build first

Ship tap-to-talk end to end and confirm it feels right before adding
wake-word — wake-word adds a real battery cost and a whole new failure
surface (notification permissions, foreground service lifecycle, false
wake triggers). Bolting it onto an unproven voice loop means debugging
two new systems at once instead of one.
