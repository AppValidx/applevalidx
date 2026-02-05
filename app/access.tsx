import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isPaid } from "./constants/member";

// ✅ Códigos “quemables” (persisten en el device)
const CODES_KEY = "validx.burnCodes.v1";

// ✅ Sesión local
const ACCESS_GRANTED_KEY = "validx.accessGranted.v1";

// ✅ Guardamos el último código usado (para overrides / trazabilidad local)
const ACCESS_CODE_KEY = "validx.accessCode.v1";
const OWNER_CODE = "ADRX";

// ✅ Nombre del usuario (opción 1)
const NAME_KEY = "validx.profileName.v1";

// ✅ Welcome one-time
const WELCOME_SEEN_KEY = "validx.welcomeSeen.v1";

type BurnCode = { code: string; used: boolean; usedAt?: number };

function randomCode4() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
    ""
  );
}

function generateCodes(count = 20): BurnCode[] {
  const set = new Set<string>();
  while (set.size < count) set.add(randomCode4());
  return Array.from(set).map((c) => ({ code: c, used: false }));
}

export default function Access() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const [codes, setCodes] = useState<BurnCode[]>([]);
  const [msg, setMsg] = useState<string>("");

  // ✅ Admin overlay
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const adminResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canContinue = code.trim().length >= 4;

  const unusedCount = useMemo(() => codes.filter((c) => !c.used).length, [codes]);
  const usedCount = useMemo(() => codes.filter((c) => c.used).length, [codes]);

  async function loadOrCreateCodes() {
    const raw = await AsyncStorage.getItem(CODES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as BurnCode[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCodes(parsed);
          return;
        }
      } catch {}
    }
    const fresh = generateCodes(20);
    setCodes(fresh);
    await AsyncStorage.setItem(CODES_KEY, JSON.stringify(fresh));
  }

  async function persistCodes(next: BurnCode[]) {
    setCodes(next);
    await AsyncStorage.setItem(CODES_KEY, JSON.stringify(next));
  }

  // ✅ Ruteo central (orden correcto)
  async function routeAfterAccess() {
    // 1) si no hay nombre todavía, primero set name
    const savedName = await AsyncStorage.getItem(NAME_KEY);
    if (!savedName) {
      router.replace("/profile-setup");
      return;
    }

    // 2) welcome ONE TIME (solo si ya hay nombre)
    const seenWelcome = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
    if (seenWelcome !== "true") {
      router.replace("/welcome");
      return;
    }

    // 3) luego paywall o tabs
    const paid = await isPaid();
    router.replace(paid ? "/(tabs)" : "/paywall");
  }

  // ✅ Si ya tiene sesión, brinca Access automáticamente (usando el mismo route)
  useEffect(() => {
    (async () => {
      const granted = await AsyncStorage.getItem(ACCESS_GRANTED_KEY);
      if (granted === "true") {
        await routeAfterAccess();
      }
    })();

    return () => {
      if (adminResetTimer.current) clearTimeout(adminResetTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    loadOrCreateCodes();
  }, []);

  async function handleContinue() {
    if (!canContinue) return;

    const input = code.trim().toUpperCase();

    // ✅ OWNER CODE (ADRX) entra siempre
    if (input === OWNER_CODE) {
      await AsyncStorage.setItem(ACCESS_CODE_KEY, input);
      await AsyncStorage.setItem(ACCESS_GRANTED_KEY, "true");

      setMsg("Accepted.");
      setCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await routeAfterAccess();
      return;
    }

    // ✅ validar y “quemar” código
    const idx = codes.findIndex((c) => c.code === input);
    if (idx === -1) {
      setMsg("Invalid code.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (codes[idx].used) {
      setMsg("Code already used.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const nextCodes = [...codes];
    nextCodes[idx] = { ...nextCodes[idx], used: true, usedAt: Date.now() };
    await persistCodes(nextCodes);

    // ✅ sesión + guardar código usado
    await AsyncStorage.setItem(ACCESS_GRANTED_KEY, "true");
    await AsyncStorage.setItem(ACCESS_CODE_KEY, input);

    setMsg("Accepted. Code burned.");
    setCode("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await routeAfterAccess();
  }

  async function handleResetAll() {
    Alert.alert(
      "Reset codes?",
      "This will reactivate all codes so you can test again (and will log you out).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const reset = codes.map((c) => ({
              ...c,
              used: false,
              usedAt: undefined,
            }));
            await persistCodes(reset);

            // logout para probar desde cero
            await AsyncStorage.removeItem(ACCESS_GRANTED_KEY);
            await AsyncStorage.removeItem(ACCESS_CODE_KEY);
            await AsyncStorage.removeItem(NAME_KEY);
            await AsyncStorage.removeItem(WELCOME_SEEN_KEY);

            setMsg("Codes reactivated. Logged out.");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  }

  async function regenerateNew20() {
    Alert.alert(
      "Regenerate 20 new codes?",
      "This will create a brand new set of 20 codes (old ones will disappear) and will log you out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            const fresh = generateCodes(20);
            await persistCodes(fresh);

            await AsyncStorage.removeItem(ACCESS_GRANTED_KEY);
            await AsyncStorage.removeItem(ACCESS_CODE_KEY);
            await AsyncStorage.removeItem(NAME_KEY);
            await AsyncStorage.removeItem(WELCOME_SEEN_KEY);

            setMsg("New codes generated. Logged out.");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  }

  function handleSecretAdminTap() {
    setAdminTapCount((c) => {
      const next = c + 1;
      if (next >= 6) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAdminOpen(true);
        return 0;
      }
      return next;
    });

    if (adminResetTimer.current) clearTimeout(adminResetTimer.current);
    adminResetTimer.current = setTimeout(() => setAdminTapCount(0), 700);
  }

  function formatUsedAt(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${mon}/${day} ${hh}:${mm}`;
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={handleSecretAdminTap} hitSlop={14}>
        <Text style={styles.title}>VALIDX</Text>
      </Pressable>

      <Text style={styles.label}>Enter Access Code</Text>

      <TextInput
        style={styles.input}
        placeholder="••••"
        placeholderTextColor="#555"
        value={code}
        onChangeText={(t) => {
          setCode(t.toUpperCase());
          if (msg) setMsg("");
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={4}
      />

      <Pressable
        disabled={!canContinue}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.button,
          !canContinue && styles.buttonDisabled,
          pressed && canContinue && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      <Text style={styles.footer}>Access is limited.</Text>

      {adminOpen && (
        <View style={styles.adminOverlay}>
          <View style={styles.adminCard}>
            <View style={styles.adminTopRow}>
              <Text style={styles.adminTitle}>ADMIN CODES</Text>
              <Pressable
                onPress={() => setAdminOpen(false)}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                <Text style={styles.close}>CLOSE</Text>
              </Pressable>
            </View>

            <Text style={styles.adminMeta}>
              Remaining: <Text style={styles.adminMetaBold}>{unusedCount}</Text> / 20{" "}
              <Text style={{ color: "#333" }}>•</Text>{" "}
              Used: <Text style={styles.adminMetaBold}>{usedCount}</Text>
            </Text>

            <View style={styles.adminBtnRow}>
              <Pressable
                onPress={handleResetAll}
                style={({ pressed }) => [styles.adminBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.adminBtnText}>RESET USED</Text>
              </Pressable>

              <Pressable
                onPress={regenerateNew20}
                style={({ pressed }) => [
                  styles.adminBtnDanger,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.adminBtnText}>NEW 20</Text>
              </Pressable>
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.hCol}>CODE</Text>
              <Text style={styles.hCol}>STATUS</Text>
              <Text style={[styles.hCol, { textAlign: "right" }]}>USED</Text>
            </View>

            <FlatList
              data={codes}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 340, marginTop: 10 }}
              contentContainerStyle={{ paddingBottom: 6 }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Pressable
                    onPress={() => {
                      setCode(item.code);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      styles.codePill,
                      pressed && { opacity: 0.85 },
                      item.used && { borderColor: "#222" },
                    ]}
                  >
                    <Text style={[styles.codeText, item.used && { color: "#555" }]}>
                      {item.code}
                    </Text>
                  </Pressable>

                  <Text
                    style={[
                      styles.statusText,
                      item.used ? styles.used : styles.available,
                    ]}
                  >
                    {item.used ? "USED" : "AVAILABLE"}
                  </Text>

                  <Text style={styles.usedAt}>{formatUsedAt(item.usedAt)}</Text>
                </View>
              )}
            />

            <Text style={styles.adminHint}>Tip: tap a code to auto-fill the input.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#EAE6DF",
    fontSize: 34,
    letterSpacing: 6,
    fontWeight: "600",
    marginBottom: 40,
  },
  label: { color: "#EAE6DF", marginBottom: 12, letterSpacing: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#2B2B2B",
    width: "80%",
    color: "#EAE6DF",
    padding: 14,
    borderRadius: 14,
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 3,
    backgroundColor: "#060606",
  },
  button: {
    borderWidth: 1,
    borderColor: "#EAE6DF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { color: "#EAE6DF", letterSpacing: 1, fontWeight: "600" },
  msg: { marginTop: 12, color: "#888", fontSize: 12, letterSpacing: 0.5 },
  footer: { position: "absolute", bottom: 40, color: "#555", fontSize: 12 },

  adminOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
    padding: 18,
    justifyContent: "center",
  },
  adminCard: {
    borderWidth: 1,
    borderColor: "#1F1F1F",
    borderRadius: 18,
    backgroundColor: "#050505",
    padding: 16,
  },
  adminTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminTitle: {
    color: "#EAE6DF",
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: "700",
  },
  close: { color: "#777", letterSpacing: 2, fontSize: 11 },
  adminMeta: { marginTop: 8, color: "#777", fontSize: 12, letterSpacing: 0.5 },
  adminMetaBold: { color: "#EAE6DF", fontWeight: "700" },

  adminBtnRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 12 },
  adminBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070707",
  },
  adminBtnDanger: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0505",
  },
  adminBtnText: {
    color: "#EAE6DF",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },

  listHeader: { marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  hCol: { color: "#555", fontSize: 10, letterSpacing: 2, width: "33%" },
  sep: { height: 1, backgroundColor: "#101010", marginVertical: 8 },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codePill: {
    width: "33%",
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#060606",
  },
  codeText: { color: "#EAE6DF", letterSpacing: 3, fontWeight: "700" },
  statusText: {
    width: "33%",
    textAlign: "center",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  available: { color: "#B89B5E" },
  used: { color: "#555" },
  usedAt: { width: "33%", textAlign: "right", color: "#555", fontSize: 11, letterSpacing: 0.5 },
  adminHint: {
    marginTop: 10,
    color: "#333",
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
