import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      {/* Tabs group */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Access screen */}
      <Stack.Screen name="access" options={{ presentation: "card" }} />
    </Stack>
  );
}
