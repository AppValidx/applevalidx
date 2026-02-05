import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { wipeIdentity } from "../constants/storage";

const FG = "#EAE6DF";

export default function Settings() {
  const router = useRouter();

  // 🔒 Revoke BLACK + borrar identidad (para que el siguiente código sea “nuevo usuario”)
  function revoke() {
    Alert.alert(
      "Revoke access?",
      "This will remove BLACK access and clear this identity from the device.\nYou’ll need a NEW code to enter again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            // ✅ wipe completo (borra paid + memberId + nombre + foto + sesión)
            // ✅ pero si eres ADRX, preserva founder identity (solo te desloguea)
            await wipeIdentity({ keepBurnCodes: true, keepOwner: true });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/access");
          },
        },
      ]
    );
  }

  // 🚪 Logout real (requiere nuevo código)
  function handleLogout() {
    Alert.alert(
      "Log out?",
      "If you log out, you will need a NEW access code to enter again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            // ✅ Solo logout (si eres ADRX te conserva identidad; si no, solo te saca)
            // Esto mantiene la regla “nuevo code requerido” porque ACCESS_GRANTED se borra.
            await wipeIdentity({ keepBurnCodes: true, keepOwner: true });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/access");
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SETTINGS</Text>

      <View style={{ height: 18 }} />

      {/* Revoke BLACK / Paid + wipe */}
      <Pressable
        onPress={revoke}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.btnText}>Revoke Access</Text>
      </Pressable>

      <Text style={styles.note}>
        Revoking removes access and clears identity on this device.
      </Text>

      <View style={{ height: 30 }} />

      {/* Logout (nuevo código requerido) */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Text style={styles.logoutText}>LOG OUT</Text>
      </Pressable>

      <Text style={styles.logoutNote}>
        Logging out will require a new access code.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 22,
    paddingTop: 70,
  },
  title: {
    color: "#8C8A86",
    letterSpacing: 2,
    fontSize: 12,
  },
  btn: {
    borderWidth: 1,
    borderColor: FG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: FG,
    letterSpacing: 1,
    fontWeight: "700",
  },
  note: {
    color: "#8C8A86",
    marginTop: 14,
    letterSpacing: 1,
    fontSize: 12,
  },

  // 🔽 Logout styling (discreto)
  logoutText: {
    color: "#666",
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 2,
  },
  logoutNote: {
    marginTop: 8,
    color: "#444",
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
