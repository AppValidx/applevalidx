import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { setPaid } from "./constants/member";

export default function Settings() {
  const router = useRouter();

  async function revoke() {
    await setPaid(false);
    router.replace("/access");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SETTINGS</Text>

      <View style={{ height: 18 }} />

      <Pressable onPress={revoke} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
        <Text style={styles.btnText}>Revoke Access</Text>
      </Pressable>

      <Text style={styles.note}>Revoking disables BLACK access on this device.</Text>
    </View>
  );
}

const FG = "#EAE6DF";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 22, paddingTop: 70 },
  title: { color: "#8C8A86", letterSpacing: 2, fontSize: 12 },
  btn: {
    borderWidth: 1,
    borderColor: FG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: FG, letterSpacing: 1, fontWeight: "700" },
  note: { color: "#8C8A86", marginTop: 14, letterSpacing: 1, fontSize: 12 },
});
