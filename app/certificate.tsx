import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getOrCreateMemberId } from "./constants/member";
import { getTierFromMemberId } from "./constants/tier";

// ✅ Peers component
import PeerConstellation from "../components/PeerConstellation";

const PHOTO_KEY = "validx.profilePhotoUri.v1";

// ✅ Owner access (tu código)
const OWNER_CODE = "ADRX";
const ACCESS_CODE_KEY = "validx.accessCode.v1";
const OWNER_CERT_NUMBER = "0001";

// ✅ Nombre (opción 1)
const NAME_KEY = "validx.profileName.v1";

export default function Certificate() {
  const router = useRouter();

  // ✅ id real (interno)
  const [memberId, setMemberId] = useState("....");
  // ✅ id que se muestra (puede ser 0001)
  const [displayId, setDisplayId] = useState("....");

  const [tier, setTier] = useState("");

  // ✅ Nombre mostrado
  const [displayName, setDisplayName] = useState<string>("—");

  // Foto de perfil (persistente)
  const [photo, setPhoto] = useState<string | null>(null);

  // ✅ Modo presumir
  const [flexMode, setFlexMode] = useState(false);
  const lastTap = useRef<number | null>(null);

  // ✅ Auto-apagado Flex (30s)
  const flexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Content microfade
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  // Frame pulse
  const framePulse = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  function startFramePulse(isFlex: boolean) {
    pulseLoopRef.current?.stop();

    const duration = isFlex ? 900 : 1600;

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(framePulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(framePulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoopRef.current.start();
  }

  // ✅ Cargar nombre (se usa en foco también)
  const loadName = useCallback(async () => {
    const savedName = await AsyncStorage.getItem(NAME_KEY);
    if (savedName && savedName.trim().length > 0) setDisplayName(savedName);
    else setDisplayName("—");
  }, []);

  // ✅ refresca cada vez que entras a Certificate
  useFocusEffect(
    useCallback(() => {
      loadName();
    }, [loadName])
  );

  useEffect(() => {
    (async () => {
      // 1) cargar memberId real
      const id = await getOrCreateMemberId();
      setMemberId(id);

      // 2) leer access code (para overrides)
      const accessCode = await AsyncStorage.getItem(ACCESS_CODE_KEY);

      // ✅ OWNER OVERRIDE (ADRX = FOUNDING + Certificate # = 0001)
      if (accessCode === OWNER_CODE) {
        setTier("FOUNDING");
        setDisplayId(OWNER_CERT_NUMBER);
      } else {
        setTier(getTierFromMemberId(id));
        setDisplayId(id);
      }

      // 3) cargar foto guardada
      const saved = await AsyncStorage.getItem(PHOTO_KEY);
      if (saved) setPhoto(saved);

      // 4) cargar nombre inicial (por si entras directo)
      await loadName();
    })();

    // Content entrance
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();

    // iniciar pulso normal
    startFramePulse(false);

    return () => {
      pulseLoopRef.current?.stop();
      if (flexTimer.current) clearTimeout(flexTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadName]);

  // Reinicia pulso cuando cambia flexMode
  useEffect(() => {
    startFramePulse(flexMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flexMode]);

  const isFounding = tier === "FOUNDING";

  const frameOpacity = framePulse.interpolate({
    inputRange: [0, 1],
    outputRange: flexMode ? [0.85, 1] : [0.45, 1],
  });

  function handleFlexTap() {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      setFlexMode((v) => {
        const next = !v;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (flexTimer.current) clearTimeout(flexTimer.current);

        if (next) {
          flexTimer.current = setTimeout(() => {
            setFlexMode(false);
          }, 30000);
        }

        return next;
      });
    }
    lastTap.current = now;
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhoto(uri);
      await AsyncStorage.setItem(PHOTO_KEY, uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handlePeerPress(peerId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Peer", `Selected: ${peerId}`, [{ text: "OK" }]);
    // luego aquí puedes: router.push("/peers") o abrir modal
  }

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.goldFrame,
          { opacity: frameOpacity },
          flexMode && styles.goldFrameFlex,
          flexMode && { borderWidth: 1.5 },
        ]}
      />

      <Pressable onPress={handleFlexTap}>
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <Text style={styles.top}>CERTIFICATION</Text>

          <View style={{ height: 18 }} />

          <Text style={styles.blockTitle}>Certified Individual</Text>

          <Pressable
            onPress={pickPhoto}
            hitSlop={12}
            style={({ pressed }) => [
              styles.avatarWrap,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarEmpty}>
                    <Text style={styles.plus}>+</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>

          <Pressable
            onLongPress={() => router.push("/message")}
            delayLongPress={420}
            style={styles.tierBlock}
          >
            <Text style={styles.tierLabel}>TIER</Text>

            <Text style={styles.tierValue}>
              {tier}
              {isFounding && " — LIMITED SERIES"}
            </Text>

            {isFounding && <Text style={styles.tierClosed}>Closed: 2026</Text>}
          </Pressable>

          <Text style={styles.line}>
            Name: <Text style={styles.bold}>{displayName}</Text>
          </Text>

          <Text style={styles.line}>
            Certificate #: <Text style={styles.bold}>{displayId}</Text>
          </Text>

          <Text style={styles.line}>
            Issued: <Text style={styles.bold}>2026</Text>
          </Text>

          <Text style={styles.line}>
            Location: <Text style={styles.bold}>San Antonio</Text>
          </Text>

          <View style={{ height: 18 }} />
          <View style={styles.divider} />
          <View style={{ height: 18 }} />

          <Text style={styles.status}>Status: VALID</Text>

          <Text style={styles.disclaimer}>
            Private digital status certification. No benefits included.
          </Text>

          {/* ✅ PEERS */}
          <PeerConstellation
            seedKey={displayId} // determinístico por certificado
            onPressPeer={handlePeerPress}
          />

          {flexMode && <Text style={styles.flexHint}>FLEX MODE</Text>}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const FG = "#EAE6DF";
const GOLD = "#B89B5E";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 22,
    paddingTop: 70,
  },

  goldFrame: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GOLD,
    borderRadius: 22,

    ...(Platform.OS === "ios"
      ? {
          shadowColor: GOLD,
          shadowOpacity: 1,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 0 },
        }
      : {
          elevation: 2,
        }),
  },

  goldFrameFlex:
    Platform.OS === "ios"
      ? {
          shadowOpacity: 1,
          shadowRadius: 34,
        }
      : {
          elevation: 6,
        },

  top: {
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 2,
  },
  blockTitle: {
    color: FG,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },

  avatarWrap: {
    position: "absolute",
    right: 50,
    top: 193,
    zIndex: 999,
    elevation: 10,
  },

  avatarOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 4,
  },

  avatarInner: {
    flex: 1,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    backgroundColor: "#050505",
    padding: 3,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },

  avatarEmpty: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },

  plus: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 28,
  },

  tierBlock: {
    marginTop: 18,
    marginBottom: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2B2B2B",
  },
  tierLabel: {
    color: "#8C8A86",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  tierValue: {
    color: FG,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
  },
  tierClosed: {
    marginTop: 6,
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 1,
  },

  line: {
    color: FG,
    fontSize: 16,
    lineHeight: 26,
  },
  bold: {
    color: FG,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#2B2B2B",
  },
  status: {
    color: FG,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  disclaimer: {
    marginTop: 14,
    color: "#555",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  flexHint: {
    marginTop: 10,
    color: "#1A1A1A",
    fontSize: 10,
    letterSpacing: 2,
  },
});
