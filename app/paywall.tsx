import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ensurePaidAndMember } from "./constants/member";

// 🔒 misma key que usas en access.tsx
const ACCESS_GRANTED_KEY = "validx.accessGranted.v1";

export default function Paywall() {
  const router = useRouter();
  const navigation = useNavigation();

  const blockingRef = useRef(false);

  // ✅ util: solo considera "back" si la acción es POP/GO_BACK
  function isBackAction(action: any) {
    const t = action?.type;
    return t === "POP" || t === "GO_BACK" || t === "POP_TO_TOP";
  }

  async function unlockBlack() {
    // ✅ NO toques allowExitRef/unlockingRef: ya no los necesitamos con el fix correcto
    await ensurePaidAndMember();
    router.replace("/black-unlocked");
  }

  const revokeAndExit = useCallback(async () => {
    // ✅ revoca sesión local
    await AsyncStorage.removeItem(ACCESS_GRANTED_KEY);

    // ✅ a Access sin posibilidad de volver con back
    router.replace("/access");
  }, [router]);

  const confirmExit = useCallback(() => {
    // evita dobles alerts
    if (blockingRef.current) return;
    blockingRef.current = true;

    Alert.alert(
      "LEAVE BLACK ACCESS?",
      "If you go back, access will be revoked and you'll need a new code to enter again.",
      [
        {
          text: "STAY",
          style: "cancel",
          onPress: () => {
            blockingRef.current = false;
          },
        },
        {
          text: "REVOKE & EXIT",
          style: "destructive",
          onPress: async () => {
            await revokeAndExit();
            blockingRef.current = false;
          },
        },
      ],
      { cancelable: true }
    );
  }, [revokeAndExit]);

  useFocusEffect(
    useCallback(() => {
      blockingRef.current = false;

      // Android hardware back
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        confirmExit();
        return true;
      });

      // ✅ SOLO bloquear cuando sea un BACK real.
      const unsubNav = navigation.addListener("beforeRemove", (e: any) => {
        const action = e?.data?.action;

        // Si NO es back (por ejemplo REPLACE/NAVIGATE), no bloquees.
        if (!isBackAction(action)) return;

        // Bloquear back y mostrar confirm
        e.preventDefault();
        confirmExit();
      });

      return () => {
        sub.remove();
        unsubNav();
      };
    }, [navigation, confirmExit])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>VALIDX</Text>

      <View style={{ height: 18 }} />
      <Text style={styles.title}>BLACK ACCESS</Text>
      <Text style={styles.sub}>Digital Status Certification</Text>

      <View style={{ height: 28 }} />

      <View style={styles.valueBlock}>
        <Text style={styles.valueText}>ValidX is not an app.</Text>
        <Text style={styles.valueText}>
          It’s private access to a closed digital status.
        </Text>
        <Text style={styles.valueText}>
          Once access is revoked, it cannot be restored.
        </Text>
      </View>

      <View style={{ height: 26 }} />

      <View style={styles.card}>
        <Text style={styles.price}>$499</Text>
        <Text style={styles.note}>One-time certification</Text>

        <View style={styles.availabilityBlock}>
          <Text style={styles.availabilityTitle}>BLACK TIER</Text>
          <Text style={styles.availabilitySub}>Limited availability</Text>
          <Text style={styles.availabilityCount}>9,998 remaining</Text>
        </View>
      </View>

      <View style={{ height: 22 }} />

      <Pressable
        onPress={unlockBlack}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.ctaText}>Unlock BLACK</Text>
      </Pressable>

      {/* BACK */}
      <Pressable onPress={confirmExit} style={styles.backWrap}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
    </View>
  );
}

const FG = "#EAE6DF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 22,
    paddingTop: 80,
  },
  brand: {
    color: FG,
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: "600",
  },
  title: {
    color: FG,
    fontSize: 26,
    letterSpacing: 2,
    fontWeight: "700",
  },
  sub: {
    color: "#8C8A86",
    marginTop: 6,
    letterSpacing: 1,
  },
  valueBlock: { maxWidth: 320 },
  valueText: {
    color: "#8C8A86",
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  card: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2B2B2B",
    paddingVertical: 18,
  },
  price: {
    color: FG,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 2,
  },
  note: { color: "#8C8A86", marginTop: 6, letterSpacing: 1 },
  availabilityBlock: { marginTop: 14 },
  availabilityTitle: { color: FG, fontSize: 12, letterSpacing: 2 },
  availabilitySub: {
    marginTop: 6,
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 1,
  },
  availabilityCount: {
    marginTop: 4,
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 1,
  },
  cta: {
    borderWidth: 1,
    borderColor: FG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: FG, letterSpacing: 1, fontWeight: "700" },
  backWrap: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 40,
    alignItems: "center",
  },
  back: { color: FG, letterSpacing: 1 },
});
