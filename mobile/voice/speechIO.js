// Snow AI — Speech I/O
//
// Unlike the wake-word engine, speech-to-text and text-to-speech here use
// the device's own built-in native APIs — no external account, no model
// download, works today. This is the genuinely simple part of "voice mode."

import * as Speech from "expo-speech";
import Voice from "@react-native-voice/voice";

export class SnowSpeechIO {
  constructor({ onPartialResult, onFinalResult, onError, onSpeechEnd }) {
    this.onPartialResult = onPartialResult;
    this.onFinalResult = onFinalResult;
    this.onError = onError;
    this.onSpeechEnd = onSpeechEnd;

    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0];
      if (text) this.onFinalResult?.(text);
    };
    Voice.onSpeechPartialResults = (e) => {
      const text = e.value?.[0];
      if (text) this.onPartialResult?.(text);
    };
    Voice.onSpeechError = (e) => {
      this.onError?.(e.error?.message || "Speech recognition failed.");
    };
    Voice.onSpeechEnd = () => {
      this.onSpeechEnd?.();
    };
  }

  async startListening(locale = "en-US") {
    try {
      await Voice.start(locale);
    } catch (e) {
      this.onError?.(`Couldn't start listening: ${e.message}`);
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
    } catch (e) {
      // Non-fatal — Voice.stop() can throw if nothing was in progress.
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch {
      // best-effort cleanup
    }
  }

  speak(text, { onDone, onError } = {}) {
    Speech.stop(); // never overlap Snow talking over herself
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.98,
      onDone,
      onError: (e) => onError?.(e),
    });
  }

  stopSpeaking() {
    Speech.stop();
  }
}
