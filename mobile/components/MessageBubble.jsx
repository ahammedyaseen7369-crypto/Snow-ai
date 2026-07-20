import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";

export default function MessageBubble({ role, text, isError }) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowSnow]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleSnow,
          isError && styles.bubbleError,
        ]}
      >
        {!isUser && (
          <Text style={styles.label}>{isError ? "SNOW · ISSUE" : "SNOW"}</Text>
        )}
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", marginBottom: spacing.sm, flexDirection: "row" },
  rowUser: { justifyContent: "flex-end" },
  rowSnow: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderBottomRightRadius: 4,
  },
  bubbleSnow: {
    backgroundColor: "rgba(93,169,224,0.08)",
    borderColor: "rgba(93,169,224,0.25)",
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: "rgba(224,116,93,0.08)",
    borderColor: "rgba(224,116,93,0.35)",
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.frost,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    color: colors.snow,
    lineHeight: 21,
  },
});
