// app/welcome.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

const FG = "#EAE6DF";
const GOLD = "#B89B5E";
const WELCOME_SEEN_KEY = "validx.welcomeSeen.v1";

export default function Welcome() {
  const router = useRouter();

  // paragraph anims
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;
  const p4 = useRef(new Animated.Value(0)).current;
  const p5 = useRef(new Animated.Value(0)).current;
  const div = useRef(new Animated.Value(0)).current;
  const btn = useRef(new Animated.Value(0)).current;

  // luxury pulse for frame + spotlight
  const pulse = useRef(new Animated.Value(0)).current;

  function fadeUp(v: Animated.Value) {
    return {
      opacity: v,
      transform: [
        {
          translateY: v.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0],
          }),
        },
      ],
    };
  }

  useEffect(() => {
    // ✅ reset para que siempre haga la animación igual al entrar
    p1.setValue(0);
    p2.setValue(0);
    p3.setValue(0);
    p4.setValue(0);
    p5.setValue(0);
    div.setValue(0);
    btn.setValue(0);

    const frameLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    frameLoop.start();

    // ✅ stagger paragraphs
    Animated.stagger(140, [
      Animated.timing(p1, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(p2, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(p3, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(p4, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(p5, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(div, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(btn, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    return () => {
      frameLoop.stop();
    };
  }, [p1, p2, p3, p4, p5, div, btn, pulse]);

  const frameOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.95],
  });

  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.12], // ✅ más sutil
  });

  const btnShine = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  async function goNext() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "true");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/paywall");
  }

  return (
    <View style={styles.container}>
      {/* ✅ luxury frame */}
      <Animated.View
        pointerEvents="none"
        style={[styles.goldFrame, { opacity: frameOpacity }]}
      />

      {/* ✅ subtle spotlight (halo) */}
      <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity }]} />
      {/* ✅ dim overlay arriba del halo para que no “pinte” el fondo */}
      <View pointerEvents="none" style={styles.haloDim} />

      {/* top brand */}
      <Text style={styles.brand}>VALIDX</Text>

      <View style={{ height: 18 }} />

      <Animated.View style={fadeUp(p1)}>
        <Text style={styles.h1}>Felicidades.</Text>
        <Text style={styles.p}>Has sido seleccionado entre un grupo muy reducido.</Text>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Animated.View style={fadeUp(p2)}>
        <Text style={styles.p}>
          Creemos que tu criterio puede aportar valor real{"\n"}
          a este entorno privado de evaluación entre pares.
        </Text>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Animated.View style={fadeUp(p3)}>
        <Text style={styles.p}>
          ValidX no es una red social.{"\n"}
          Es un sistema diseñado para entender cómo eres percibido{"\n"}
          por personas con estándares similares al tuyo.
        </Text>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Animated.View style={fadeUp(p4)}>
        <Text style={styles.p}>
          Aquí no se busca visibilidad.{"\n"}
          Se busca claridad.
        </Text>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Animated.View style={fadeUp(p5)}>
        <Text style={styles.p}>
          El acceso es limitado.{"\n"}
          La participación es intencional.{"\n"}
          Los resultados son discretos.
        </Text>
      </Animated.View>

      <View style={{ height: 18 }} />

      <Animated.View style={fadeUp(div)}>
        <View style={styles.divider} />
      </Animated.View>

      <View style={{ height: 18 }} />

      <Animated.View style={fadeUp(btn)}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.btn,
            pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] },
          ]}
        >
          {/* subtle shine */}
          <Animated.View pointerEvents="none" style={[styles.btnShine, { opacity: btnShine }]} />
          <Text style={styles.btnText}>Welcome to ValidX</Text>
        </Pressable>

        <Text style={styles.note}>ONE TIME</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 22,
    paddingTop: 80,
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
    shadowColor: GOLD,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },

  halo: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 999,
    backgroundColor: GOLD,
    top: -200,
    left: -140,
  },
  haloDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  brand: {
    color: FG,
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: "600",
    textShadowColor: "rgba(184,155,94,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  h1: {
    color: FG,
    fontSize: 22,
    letterSpacing: 1,
    fontWeight: "900",
    marginBottom: 8,
  },

  p: {
    color: "#8C8A86",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  divider: {
    height: 1,
    backgroundColor: "#151515",
  },

  btn: {
    borderWidth: 1,
    borderColor: FG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070707",
    overflow: "hidden",
  },
  btnShine: {
    position: "absolute",
    left: -40,
    right: -40,
    top: -18,
    height: 46,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  btnText: {
    color: FG,
    letterSpacing: 1,
    fontWeight: "900",
  },

  note: {
    marginTop: 12,
    color: GOLD,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    opacity: 0.9,
  },
});
