import { TamaguiProvider } from "tamagui";
import { Slot } from "expo-router";
import { APIProvider } from "@repo/api-client";
import config from "../tamagui.config";

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      <APIProvider>
        <Slot />
      </APIProvider>
    </TamaguiProvider>
  );
}
