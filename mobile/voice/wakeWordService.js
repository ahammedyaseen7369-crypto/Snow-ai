// Snow AI — Wake-word service
//
// HONEST SCOPE NOTE, READ FIRST:
// True always-on "Hey Snow" detection needs a wake-word engine running
// continuously at low power. Full speech-to-text cannot run continuously —
// it would drain a phone battery in under an hour. So the real pipeline is:
//
//   mic open (low power) -> wake-word model listens ONLY for "Snow"
//     -> on match -> open full STT for the actual question
//     -> send to backend -> speak the reply -> return to low-power listening
//
// This file wires that pipeline using Porcupine (Picovoice), which is the
// realistic choice for on-device, offline wake-word detection:
//   - Free tier available, runs fully offline once set up
//   - Requires YOU to create a free Picovoice account and generate an
//     AccessKey, and to train or pick a "Snow" wake-word model (.ppn file)
//     at https://console.picovoice.ai — I cannot generate that key or file
//     for you; it's tied to your account.
//   - Without a real AccessKey + .ppn file, this module will not detect
//     anything. It's not a placeholder that magically works — it's real
//     code waiting on a real credential you have to go get.
//
// Alternative if you'd rather not use a third-party account: openWakeWord
// (fully open source, self-trainable) is a heavier but keyless option —
// ask me to scaffold that path instead if Picovoice's account requirement
// is a dealbreaker.

import { PorcupineManager } from "@picovoice/porcupine-react-native";

// --- Fill these in from your own Picovoice console ---
const PICOVOICE_ACCESS_KEY = "REPLACE_WITH_YOUR_PICOVOICE_ACCESS_KEY";
const WAKE_WORD_MODEL_PATH = "snow_en_android_v3_0_0.ppn"; // your trained "Snow" model, bundled as an asset
// -------------------------------------------------------

export class SnowWakeWordService {
  constructor({ onWake, onError }) {
    this.onWake = onWake;
    this.onError = onError;
    this.manager = null;
    this.isListening = false;
  }

  async start() {
    if (this.isListening) return;

    if (PICOVOICE_ACCESS_KEY.startsWith("REPLACE_WITH")) {
      this.onError?.(
        "Wake-word isn't set up yet. Add your Picovoice AccessKey and a " +
          "trained 'Snow' model (.ppn file) in voice/wakeWordService.js " +
          "before this can listen for 'Hey Snow'."
      );
      return;
    }

    try {
      this.manager = await PorcupineManager.fromKeywordPaths(
        PICOVOICE_ACCESS_KEY,
        [WAKE_WORD_MODEL_PATH],
        (keywordIndex) => {
          // Wake word detected — hand off to full speech-to-text.
          this.onWake?.();
        },
        (error) => {
          this.onError?.(`Wake-word engine error: ${error.message}`);
        }
      );
      await this.manager.start();
      this.isListening = true;
    } catch (e) {
      this.onError?.(`Couldn't start wake-word listening: ${e.message}`);
    }
  }

  async stop() {
    if (!this.isListening || !this.manager) return;
    await this.manager.stop();
    await this.manager.delete();
    this.manager = null;
    this.isListening = false;
  }
}
