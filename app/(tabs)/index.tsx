import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getOrCreateMemberId } from "../constants/member";
import { getTierFromMemberId } from "../constants/tier";

export default function HomeTab() {
  const router = useRouter();
  const [tier, setTier] = useState<string>("");

  useEffect(() => {
    (async () => {
      const id = await getOrCreateMemberId();
      const t = getTierFromMemberId(id);
      setTier(t);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VALIDX</Text>

      <View style={{ height: 14 }} />

      <Text style={styles.line}>
        Status: <Text style={styles.bold}>VALID</Text>
      </Text>

      {tier !== "" && (
        <Text style={styles.line}>
          Tier: <Text style={styles.bold}>{tier}</Text>
        </Text>
      )}

      <Pressable
        onPress={() => router.push("/certificate")}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.linkText}>View Certification</Text>
      </Pressable>
    </View>
  );
}

const FG = "#EAE6DF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: FG,
    fontSize: 36,
    letterSpacing: 6,
    fontWeight: "600",
  },
  line: {
    marginTop: 10,
    color: "#8C8A86",
    letterSpacing: 1,
    fontSize: 15,
  },
  bold: {
    color: FG,
    fontWeight: "700",
    letterSpacing: 1,
  },
  link: {
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  linkText: {
    color: FG,
    letterSpacing: 1,
    fontWeight: "600",
  },
});
