import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import { colors } from "../theme";

/**
 * The breathing core — Snow's single visual signature, carried over from
 * the web mock. Three states: idle (slow breathe), thinking (faster pulse),
 * error (dim, still).
 */
export default function CoreOrb({ state = "idle", size = 120 }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.stopAnimation();

    if (state === "error") {
      scale.setValue(1);
      return;
    }

    const duration = state === "thinking" ? 700 : 2100;
    const targetScale = state === "thinking" ? 1.12 : 1.07;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: targetScale,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  const glowColor = state === "error" ? colors.ember : colors.glacier;

  return (
    <View style={[styles.wrap, { width: size * 1.6, height: size * 1.6 }]}>
      <View
        style={[
          styles.ring,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size,
            borderColor: colors.panelBorder,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: colors.glacier,
            shadowColor: glowColor,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    opacity: 0.5,
  },
  core: {
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 20,
    opacity: 0.92,
  },
});
