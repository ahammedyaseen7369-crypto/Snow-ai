import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SnowProvider } from "./store/SnowContext";
import VoiceHomeScreen from "./screens/VoiceHomeScreen";
import UnifiedScreen from "./screens/UnifiedScreen";
import { colors } from "./theme";

const Stack = createNativeStackNavigator();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.glacier,
    background: colors.void,
    card: colors.void,
    text: colors.snow,
    border: colors.panelBorder,
    notification: colors.frost,
  },
};

export default function App() {
  return (
    <SnowProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="VoiceHome"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="VoiceHome" component={VoiceHomeScreen} />
          <Stack.Screen name="Unified" component={UnifiedScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SnowProvider>
  );
}
