import { Stack } from "expo-router";
import { TamaguiProvider } from "tamagui";
import { APIProvider } from "@repo/api-client/provider";
import tamaguiConfig from "../tamagui.config";

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <APIProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      </APIProvider>
    </TamaguiProvider>
  );
}
