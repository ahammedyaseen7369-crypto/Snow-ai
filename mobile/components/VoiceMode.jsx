import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { colors, spacing, type } from "../theme";
import { SnowSpeechIO } from "../voice/speechIO";
import { sendMessage } from "../api/snowClient";

// Voice mode states, named for what's actually happening — this drives
// both the orb animation and the label, so the two can never disagree.
const STATE = {
  IDLE: "idle",           // waiting for the user to tap and speak
  LISTENING: "listening", // mic open, capturing speech
  THINKING: "thinking",   // sent to backend, awaiting response
  SPEAKING: "speaking",   // Snow is talking
  ERROR: "error",
};

export default function VoiceMode({ onClose }) {
  const [state, setState] = useState(STATE.IDLE);
  const [transcript, setTranscript] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [errorText, setErrorText] = useState("");
  const speechRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    speechRef.current = new SnowSpeechIO({
      onPartialResult: (text) => setTranscript(text),
      onFinalResult: (text) => handleFinalTranscript(text),
      onSpeechEnd: () => {
        // Voice.onSpeechEnd fires when the mic closes; if no final result
        // arrived (silence/timeout), fall back to idle rather than hanging
        // in "listening" forever.
        setState((s) => (s === STATE.LISTENING ? STATE.IDLE : s));
      },
      onError: (msg) => {
        setErrorText(msg);
        setState(STATE.ERROR);
      },
    });
    return () => {
      speechRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    scale.stopAnimation();
    const cfg = {
      [STATE.IDLE]: { duration: 2200, target: 1.05 },
      [STATE.LISTENING]: { duration: 550, target: 1.18 },
      [STATE.THINKING]: { duration: 650, target: 1.1 },
      [STATE.SPEAKING]: { duration: 380, target: 1.14 },
      [STATE.ERROR]: { duration: 2200, target: 1.0 },
    }[state];

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: cfg.target, duration: cfg.duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: cfg.duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  const startListening = useCallback(async () => {
    setErrorText("");
    setTranscript("");
    setState(STATE.LISTENING);
    await speechRef.current?.startListening();
  }, []);

  const handleFinalTranscript = useCallback(async (text) => {
    await speechRef.current?.stopListening();
    setTranscript(text);
    setState(STATE.THINKING);

    try {
      const { response } = await sendMessage(text);
      setLastReply(response);
      setState(STATE.SPEAKING);
      speechRef.current?.speak(response, {
        onDone: () => setState(STATE.IDLE),
        onError: () => setState(STATE.IDLE),
      });
    } catch (err) {
      setErrorText(err.message);
      setState(STATE.ERROR);
    }
  }, []);

  const handleOrbTap = useCallback(() => {
    if (state === STATE.LISTENING) {
      speechRef.current?.stopListening();
      setState(STATE.IDLE);
      return;
    }
    if (state === STATE.SPEAKING) {
      speechRef.current?.stopSpeaking();
      setState(STATE.IDLE);
      return;
    }
    if (state === STATE.IDLE || state === STATE.ERROR) {
      startListening();
    }
  }, [state, startListening]);

  const labelFor = {
    [STATE.IDLE]: "Tap to talk",
    [STATE.LISTENING]: transcript || "Listening…",
    [STATE.THINKING]: "Thinking…",
    [STATE.SPEAKING]: "Speaking — tap to interrupt",
    [STATE.ERROR]: errorText || "Something went wrong",
  }[state];

  const glowColor = state === STATE.ERROR ? colors.ember : colors.glacier;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <Text style={styles.closeGlyph}>×</Text>
      </Pressable>

      <View style={styles.center}>
        <Pressable onPress={handleOrbTap}>
          <Animated.View
            style={[
              styles.orb,
              {
                backgroundColor: colors.glacier,
                shadowColor: glowColor,
                transform: [{ scale }],
              },
            ]}
          />
        </Pressable>

        <Text style={styles.label}>{labelFor}</Text>

        {state === STATE.SPEAKING && lastReply ? (
          <Text style={styles.replyPreview} numberOfLines={4}>
            {lastReply}
          </Text>
        ) : null}
      </View>

      <Text style={styles.hint}>
        {state === STATE.IDLE
          ? "Say “Hey Snow” or tap the orb to speak"
          : "Fully offline — nothing leaves your device"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xl,
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginRight: spacing.lg,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: { color: colors.snowDim, fontSize: 20, marginTop: -2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: 40 },
  orb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 24,
  },
  label: { ...type.body, fontSize: 16, color: colors.snow, textAlign: "center", marginTop: spacing.sm },
  replyPreview: { ...type.bodyDim, textAlign: "center", marginTop: spacing.sm },
  hint: { ...type.mono, textAlign: "center" },
});
