import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function BlackAccess() {
  const router = useRouter();

  // Ceremonial fade
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  // Frame pulse
  const framePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry haptic (subtle)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Slow entrance
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Frame “breath”
    Animated.loop(
      Animated.sequence([
        Animated.timing(framePulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(framePulse, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const frameOpacity = framePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const onContinue = async () => {
    // Exit haptic (subtle but “confirmed”)
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.replace("/certificate");
  };

  return (
    <Pressable style={styles.container} onPress={onContinue}>
      {/* Gold frame + glow */}
      <Animated.View
        pointerEvents="none"
        style={[styles.frame, { opacity: frameOpacity }]}
      />

      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={styles.kicker}>BLACK ACCESS</Text>

        <View style={{ height: 46 }} />

        <Text style={styles.title}>Welcome.</Text>

        <View style={{ height: 28 }} />

        <Text style={styles.body}>Nothing changes.</Text>
        <Text style={styles.body}>Everything is acknowledged.</Text>

        <View style={{ height: 70 }} />

        <Text style={styles.meta}>Tap to continue</Text>
      </Animated.View>
    </Pressable>
  );
}

const FG = "#EAE6DF";
const GOLD = "#B89B5E";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  frame: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 26,

    ...(Platform.OS === "ios"
      ? {
          shadowColor: GOLD,
          shadowOpacity: 1,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 0 },
        }
      : {
          elevation: 2,
        }),
  },

  kicker: {
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 3,
    textAlign: "center",
  },

  title: {
    color: FG,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },

  body: {
    color: FG,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  meta: {
    color: "#555",
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
