import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { isPaid } from "./constants/member";

const NAME_KEY = "validx.profileName.v1";
const ACCESS_GRANTED_KEY = "validx.accessGranted.v1";
const WELCOME_SEEN_KEY = "validx.welcomeSeen.v1";

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState("");

  const cleaned = useMemo(() => name.trim().replace(/\s+/g, " "), [name]);
  const canSave = cleaned.length >= 2;

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem(NAME_KEY);
      if (existing) {
        const paid = await isPaid();

        // ✅ si ya hay nombre, decide si toca welcome o no
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (!paid && seen !== "true") {
          router.replace("/welcome");
          return;
        }

        router.replace(paid ? "/(tabs)" : "/paywall");
      }
    })();
  }, [router]);

  async function save() {
    if (!canSave) return;

    await AsyncStorage.setItem(NAME_KEY, cleaned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const granted = await AsyncStorage.getItem(ACCESS_GRANTED_KEY);
    if (granted !== "true") {
      router.replace("/access");
      return;
    }

    const paid = await isPaid();

    // ✅ AQUÍ METEMOS WELCOME “ANTES DEL PAYWALL”
    const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
    if (!paid && seen !== "true") {
      router.replace("/welcome");
      return;
    }

    router.replace(paid ? "/(tabs)" : "/paywall");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>VALIDX</Text>

      <View style={{ height: 18 }} />
      <Text style={styles.title}>SET YOUR NAME</Text>
      <Text style={styles.sub}>This appears on your certificate.</Text>

      <View style={{ height: 22 }} />

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor="#555"
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <Pressable
        onPress={save}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.btn,
          !canSave && { opacity: 0.35 },
          pressed && canSave && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.btnText}>Continue</Text>
      </Pressable>

      <Text style={styles.note}>Keep it clean. No emojis. No titles.</Text>
    </View>
  );
}

const FG = "#EAE6DF";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 22, paddingTop: 80 },
  brand: { color: FG, fontSize: 18, letterSpacing: 6, fontWeight: "600" },
  title: { color: FG, fontSize: 22, letterSpacing: 2, fontWeight: "800" },
  sub: { color: "#8C8A86", marginTop: 8, letterSpacing: 0.5 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: FG,
    backgroundColor: "#060606",
    letterSpacing: 0.5,
  },
  btn: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: FG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: FG, letterSpacing: 1, fontWeight: "700" },
  note: { marginTop: 12, color: "#555", fontSize: 12, letterSpacing: 0.4 },
});
