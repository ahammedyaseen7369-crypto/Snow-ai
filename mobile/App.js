import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import CoreOrb from "./components/CoreOrb";
import MessageBubble from "./components/MessageBubble";
import VoiceMode from "./components/VoiceMode";
import { sendMessage, checkHealth } from "./api/snowClient";
import { colors, spacing, radius, type } from "./theme";

let idCounter = 0;
const nextId = () => `m_${++idCounter}`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [orbState, setOrbState] = useState("idle"); // idle | thinking | error
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | ready | loading | unreachable
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const { ok, modelLoaded } = await checkHealth();
      if (cancelled) return;
      if (!ok) setBackendStatus("unreachable");
      else setBackendStatus(modelLoaded ? "ready" : "loading");
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || orbState === "thinking") return;

    const userMsg = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setOrbState("thinking");

    try {
      const { response } = await sendMessage(text);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "snow", text: response },
      ]);
      setOrbState("idle");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "snow", text: err.message, isError: true },
      ]);
      setOrbState("error");
      setTimeout(() => setOrbState("idle"), 1500);
    }
  }, [draft, orbState]);

  const statusCopy = {
    checking: "Checking backend…",
    ready: "Online — TinyLlama loaded",
    loading: "Backend reachable — model still loading",
    unreachable: "Backend unreachable — is app.py running?",
  }[backendStatus];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>
              SNOW <Text style={{ color: colors.glacier }}>·</Text> AI
            </Text>
            <Pressable
              onPress={() => setVoiceModeOpen(true)}
              style={styles.voiceModeBtn}
            >
              <Text style={styles.voiceModeGlyph}>◉</Text>
            </Pressable>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    backendStatus === "ready" ? colors.frost : colors.iceShadow,
                },
              ]}
            />
            <Text style={styles.statusText}>{statusCopy}</Text>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <CoreOrb state={orbState} size={110} />
            <Text style={styles.emptyTitle}>Snow is listening.</Text>
            <Text style={styles.emptySub}>
              Ask something below. Everything here runs on your device.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <MessageBubble
                role={item.role}
                text={item.text}
                isError={item.isError}
              />
            )}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {orbState === "thinking" && messages.length > 0 && (
          <View style={styles.thinkingRow}>
            <CoreOrb state="thinking" size={28} />
            <Text style={styles.thinkingText}>Snow is thinking…</Text>
          </View>
        )}

        <View style={styles.inputShell}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Snow anything…"
            placeholderTextColor={colors.snowDim}
            style={styles.input}
            multiline
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.sendGlyph}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={voiceModeOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setVoiceModeOpen(false)}
      >
        <VoiceMode onClose={() => setVoiceModeOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: {
    fontSize: 15,
    letterSpacing: 4,
    fontWeight: "600",
    color: colors.snow,
  },
  voiceModeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceModeGlyph: { color: colors.glacier, fontSize: 15 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: colors.snowDim, letterSpacing: 0.3 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyTitle: { ...type.display, marginTop: 8 },
  emptySub: { ...type.bodyDim, textAlign: "center" },

  listContent: { padding: spacing.lg, paddingBottom: spacing.sm },

  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  thinkingText: { fontSize: 12, color: colors.frost },

  inputShell: {
    flexDirection: "row",
    alignItems: "flex-end",
    margin: spacing.md,
    padding: spacing.xs,
    paddingLeft: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.snow,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glacier,
    alignItems: "center",
    justifyContent: "center",
  },
  sendGlyph: { color: colors.void, fontSize: 18, fontWeight: "700" },
});
