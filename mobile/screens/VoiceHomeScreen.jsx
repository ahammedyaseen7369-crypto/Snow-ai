import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import VoiceMode from "../components/VoiceMode";
import { useSnow } from "../store/SnowContext";
import { colors } from "../theme";

export default function VoiceHomeScreen({ navigation }) {
  const { sendMessage } = useSnow();
  const handleSend = async (text) => {
    await sendMessage(text);
    return { response: "" };
  };
  return (
    <SafeAreaView style={styles.safe}>
      <VoiceMode
        onSwitchToText={() => navigation.navigate("Unified")}
        onSendMessage={handleSend}
        speakReplies={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
});
