import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getDailyMessage } from "./constants/dailyMessage";

export default function Message() {
  const [msg, setMsg] = useState<string>("…");

  // microfade
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    setMsg(getDailyMessage());

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
  }, []);

  // tiny “breathing” underline (muy sutil)
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const lineOpacity = useMemo(
    () =>
      breathe.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.7],
      }),
    [breathe]
  );

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={styles.kicker}>MESSAGE</Text>

        <Animated.View style={[styles.rule, { opacity: lineOpacity }]} />

        <Text style={styles.message}>{msg}</Text>

        <Text style={styles.meta}>Changes every 24 hours.</Text>
      </Animated.View>
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
  kicker: {
    color: "#8C8A86",
    fontSize: 12,
    letterSpacing: 3,
  },
  rule: {
    marginTop: 14,
    height: 1,
    backgroundColor: "#2B2B2B",
  },
  message: {
    marginTop: 26,
    color: FG,
    fontSize: 22,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
  meta: {
    marginTop: 18,
    color: "#555",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
