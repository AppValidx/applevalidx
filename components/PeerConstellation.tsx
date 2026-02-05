// ./components/PeerConstellation.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

type Node = {
  id: string;
  size: number;
  x: number; // 0..1
  y: number; // 0..1
  alpha: number; // 0..1
  stroke: number; // border width
  isAdd?: boolean;
};

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ========= Invite code (determinístico premium) =========
function makeInviteCode(seedKey: string) {
  const seed = hashSeed(seedKey + "|invite.v3");
  const rnd = mulberry32(seed);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => chars[Math.floor(rnd() * chars.length)];
  return `VX-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}`;
}

// ========= Storage keys =========
const peersListKey = (seedKey: string) =>
  `validx.peersList.v1.${(seedKey || "0000").trim()}`;

const peersCountKey = (seedKey: string) =>
  `validx.peersCount.v1.${(seedKey || "0000").trim()}`;

// ========= Helpers storage =========
async function loadPeersList(seedKey: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(peersListKey(seedKey));
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
    return null;
  } catch {
    return null;
  }
}

async function savePeersList(seedKey: string, peers: string[]) {
  try {
    await AsyncStorage.setItem(peersListKey(seedKey), JSON.stringify(peers));
  } catch {}
}

// Migración: si no hay lista pero sí count, genera IDs determinísticos
async function migrateCountToListIfNeeded(
  seedKey: string,
  defaultCount: number,
  maxCount: number
): Promise<string[]> {
  const existingList = await loadPeersList(seedKey);
  if (existingList && existingList.length) return existingList;

  let count = defaultCount;

  try {
    const raw = await AsyncStorage.getItem(peersCountKey(seedKey));
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) count = n;
    }
  } catch {}

  count = clamp(count, 0, maxCount);
  if (count <= 0) return [];

  const seed = hashSeed(seedKey + "|migratePeers.v1");
  const rnd = mulberry32(seed);

  const used = new Set<string>();
  const out: string[] = [];

  while (out.length < count) {
    const num = Math.floor(rnd() * 9950) + 50; // 0050..9999
    const id = String(num).padStart(4, "0");
    if (!used.has(id)) {
      used.add(id);
      out.push(id);
    }
  }

  await savePeersList(seedKey, out);
  return out;
}

function makeNewPeerId(seedKey: string, taken: Set<string>) {
  const seed = hashSeed(seedKey + "|newPeer|" + Date.now().toString());
  const rnd = mulberry32(seed);

  while (true) {
    const num = Math.floor(rnd() * 9950) + 50;
    const id = String(num).padStart(4, "0");
    if (!taken.has(id)) return id;
  }
}

// ========= Main =========
export default function PeerConstellation({
  seedKey,
  title = "Peers",
  onPressPeer,

  defaultCount = 0,
  maxCount = 30,
  showAdd = true,
}: {
  seedKey: string;
  title?: string;
  onPressPeer?: (peerId: string) => void;

  defaultCount?: number;
  maxCount?: number;
  showAdd?: boolean;
}) {
  const GOLD = "#B89B5E";
  const HERO_SLOTS = 5;

  // ✅ peers reales (persistidos)
  const [peers, setPeers] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  // UI
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [search, setSearch] = useState("");

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // animations
  const float = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(18)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  const listY = useRef(new Animated.Value(18)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  // ===== hydrate peers list per seedKey =====
  useEffect(() => {
    (async () => {
      hydratedRef.current = false;
      const list = await migrateCountToListIfNeeded(
        seedKey,
        defaultCount,
        maxCount
      );
      setPeers(list.slice(0, maxCount));
      hydratedRef.current = true;
    })();
  }, [seedKey, defaultCount, maxCount]);

  // ===== persist peers list =====
  useEffect(() => {
    if (!hydratedRef.current) return;
    savePeersList(seedKey, peers.slice(0, maxCount));
  }, [seedKey, peers, maxCount]);

  // float loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const count = peers.length;
  const remaining = Math.max(0, maxCount - count);

  // ✅ 5 heroes = los últimos 5 (newest)
  const heroPeers = peers.slice(Math.max(0, peers.length - HERO_SLOTS));
  const olderPeers = peers.slice(0, Math.max(0, peers.length - HERO_SLOTS));

  function openSheet() {
    const code = makeInviteCode(seedKey || "0000");
    setInviteCode(code);
    setSheetOpen(true);

    sheetY.setValue(18);
    sheetOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeSheet() {
    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 18,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setSheetOpen(false));
  }

  async function handleCopyInvite() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
  }

  function addPeerLocally() {
    setPeers((prev) => {
      if (prev.length >= maxCount) return prev;
      const taken = new Set(prev);
      const id = makeNewPeerId(seedKey, taken);
      // ✅ newest al final → entra a top 5 automáticamente
      return [...prev, id];
    });
  }

  async function openScan() {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    scannedRef.current = false;
    setScanOpen(true);
  }

  function closeScan() {
    setScanOpen(false);
  }

  function openList() {
    setSearch("");
    setListOpen(true);

    listY.setValue(18);
    listOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(listY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeList() {
    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(listY, {
        toValue: 18,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setListOpen(false));
  }

  // ✅ Canvas = SOLO 5 heroes + (+)
  const nodes = useMemo(() => {
    const out: Node[] = [];

    // 5 slots estilo tu screenshot
    const heroSlots = [
      { x: 0.18, y: 0.18, size: 64 },
      { x: 0.5, y: 0.2, size: 72 },
      { x: 0.82, y: 0.18, size: 66 },
      { x: 0.22, y: 0.62, size: 78 },
      { x: 0.72, y: 0.6, size: 110 },
    ];

    // jitter suave por usuario (NO depende del count)
    const seed = hashSeed(seedKey + "|heroSlots.v1");
    const rnd = mulberry32(seed);

    heroPeers.forEach((peerId, i) => {
      const slot = heroSlots[i % heroSlots.length];

      const jx = (rnd() - 0.5) * 0.06;
      const jy = (rnd() - 0.5) * 0.06;
      const js = (rnd() - 0.5) * 10;

      out.push({
        id: peerId,
        size: clamp(slot.size + js, 58, 120),
        x: clamp(slot.x + jx, 0.08, 0.92),
        y: clamp(slot.y + jy, 0.08, 0.92),
        alpha: 0.94,
        stroke: 2,
      });
    });

    if (showAdd) {
      out.push({
        id: "ADD",
        isAdd: true,
        size: 58,
        x: 0.5,
        y: 0.82,
        alpha: 0.95,
        stroke: 2,
      });
    }

    return out;
  }, [seedKey, heroPeers.join("|"), showAdd]);

  // ✅ Lista: newest arriba, search
  const listData = useMemo(() => {
    const q = search.trim().toLowerCase();
    const newestFirst = [...peers].reverse();

    const filtered =
      q.length === 0
        ? newestFirst
        : newestFirst.filter((id) => id.toLowerCase().includes(q));

    return filtered;
  }, [peers, search]);

  function isHero(peerId: string) {
    return heroPeers.includes(peerId);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.hTitle}>{title}</Text>

        {/* ✅ Tap “Constellation” → LISTA */}
        <Pressable
          onPress={openList}
          hitSlop={10}
          style={({ pressed }) => pressed && { opacity: 0.8 }}
        >
          <Text style={styles.hSub}>Constellation</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
        <Text style={styles.cap}>
          {count}/{maxCount}
        </Text>
      </View>

      <View style={styles.canvas}>
        {nodes.map((n, i) => {
          const dx = (i % 2 === 0 ? 1 : -1) * (2 + (i % 6));
          const dy = (i % 2 === 0 ? -1 : 1) * (2 + (i % 6));

          const translateX = float.interpolate({
            inputRange: [0, 1],
            outputRange: [0, dx],
          });
          const translateY = float.interpolate({
            inputRange: [0, 1],
            outputRange: [0, dy],
          });

          const isAdd = !!n.isAdd;

          return (
            <Animated.View
              key={n.id}
              style={[
                styles.nodeWrap,
                {
                  left: `${n.x * 100}%`,
                  top: `${n.y * 100}%`,
                  transform: [
                    { translateX: -n.size / 2 },
                    { translateY: -n.size / 2 },
                    { translateX },
                    { translateY },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  if (isAdd) {
                    openSheet();
                    return;
                  }
                  onPressPeer?.(n.id);
                }}
                style={({ pressed }) => [
                  styles.node,
                  {
                    width: n.size,
                    height: n.size,
                    borderRadius: n.size / 2,
                    borderColor: GOLD,
                    borderWidth: n.stroke,
                    opacity: pressed ? 0.78 : n.alpha,
                  },
                ]}
              >
                <View style={styles.innerGlow} />
                {isAdd && <Text style={[styles.plus, { color: GOLD }]}>＋</Text>}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.hint}>
        Clean view shows the latest 5. Tap “Constellation” for full roster.
      </Text>

      {/* ✅ LIST SHEET */}
      <Modal
        visible={listOpen}
        transparent
        animationType="none"
        onRequestClose={closeList}
      >
        <Pressable style={styles.backdrop} onPress={closeList} />

        <Animated.View
          style={[
            styles.listSheet,
            { opacity: listOpacity, transform: [{ translateY: listY }] },
          ]}
        >
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>PEERS</Text>
            <Pressable
              onPress={closeList}
              hitSlop={10}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              <Text style={styles.sheetClose}>CLOSE</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetSub}>
            Latest peers appear in the top 5 rings. Older peers live here.
          </Text>

          <View style={{ height: 12 }} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by certificate #"
            placeholderTextColor="#3C3C3C"
            style={styles.search}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={{ height: 12 }} />

          <View style={styles.listMetaRow}>
            <Text style={styles.listMeta}>
              Total: <Text style={styles.metaBold}>{count}</Text>
            </Text>
            <Text style={styles.listMeta}>
              Hero: <Text style={styles.metaBold}>{heroPeers.length}</Text>
            </Text>
            <Text style={styles.listMeta}>
              Older: <Text style={styles.metaBold}>{olderPeers.length}</Text>
            </Text>
          </View>

          <View style={{ height: 10 }} />

          <FlatList
            data={listData}
            keyExtractor={(id) => id}
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const hero = isHero(item);
              return (
                <Pressable
                  onPress={() => {
                    onPressPeer?.(item);
                    closeList();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.badge, hero && styles.badgeHero]}>
                      <Text style={[styles.badgeText, hero && styles.badgeTextHero]}>
                        {hero ? "HERO" : "PEER"}
                      </Text>
                    </View>

                    <Text style={styles.rowId}>{item}</Text>
                  </View>

                  <Text style={styles.rowArrow}>›</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={() => (
              <Text style={styles.empty}>No peers found.</Text>
            )}
          />

          <Text style={styles.sheetHint}>
            Tip: invite/scan adds a new peer and it will enter the 5 rings.
          </Text>
        </Animated.View>
      </Modal>

      {/* ✅ PREMIUM INVITE SHEET */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet} />

        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>PEER ACCESS</Text>
            <Pressable
              onPress={closeSheet}
              hitSlop={10}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              <Text style={styles.sheetClose}>CLOSE</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetSub}>
            Invite a peer into your proximity graph. (Demo local)
          </Text>

          <View style={{ height: 14 }} />

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={styles.codeValue}>{inviteCode}</Text>

            <View style={{ height: 12 }} />

            <View style={styles.qrRow}>
              <View style={styles.qrBox}>
                <QRCode
                  value={inviteCode || "VX-XXXX-XX"}
                  size={92}
                  backgroundColor="transparent"
                  color="#EAE6DF"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.qrHint}>
                  Share the QR or code. Scanning adds a node (demo).
                </Text>

                <View style={{ height: 10 }} />

                <Pressable
                  onPress={handleCopyInvite}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.copyText}>COPY</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.actions}>
            <Pressable
              onPress={addPeerLocally}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.85 },
                remaining <= 0 && { opacity: 0.35 },
              ]}
              disabled={remaining <= 0}
            >
              <Text style={styles.actionText}>INVITE + ADD PEER</Text>
            </Pressable>

            <Pressable
              onPress={openScan}
              style={({ pressed }) => [
                styles.actionBtnGhost,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.actionTextGhost}>SCAN CODE</Text>
            </Pressable>

            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.actionBtnGhost,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.actionTextGhost}>REQUEST REVEAL</Text>
            </Pressable>
          </View>

          <Text style={styles.sheetHint}>
            Remaining capacity: {remaining}. (Demo local)
          </Text>
        </Animated.View>
      </Modal>

      {/* ✅ SCAN MODAL */}
      <Modal
        visible={scanOpen}
        transparent
        animationType="fade"
        onRequestClose={closeScan}
      >
        <View style={styles.scanWrap}>
          <View style={styles.scanCard}>
            <View style={styles.scanTop}>
              <Text style={styles.scanTitle}>SCAN</Text>
              <Pressable
                onPress={closeScan}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.8 }}
              >
                <Text style={styles.sheetClose}>CLOSE</Text>
              </Pressable>
            </View>

            <Text style={styles.scanSub}>Point at a ValidX invite QR.</Text>

            <View style={{ height: 12 }} />

            <View style={styles.cameraBox}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  if (scannedRef.current) return;
                  scannedRef.current = true;

                  const txt = String(data || "").trim();
                  const ok =
                    txt.startsWith("VX-") && txt.length >= 6 && txt.length <= 24;

                  if (ok) {
                    addPeerLocally();
                    closeScan();
                    closeSheet();
                  } else {
                    scannedRef.current = false;
                  }
                }}
              />
              <View style={styles.scanFrame} pointerEvents="none" />
            </View>

            <Text style={styles.scanHint}>
              Scanning is demo: it just adds a node locally.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  headerRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  hTitle: {
    color: "#EAE6DF",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  hSub: { color: "#2E2A22", fontSize: 12, letterSpacing: 2 },
  cap: { color: "#3A3A3A", fontSize: 11, letterSpacing: 1 },

  canvas: {
    marginTop: 14,
    height: 230,
    borderRadius: 22,
    overflow: "hidden",
  },

  nodeWrap: { position: "absolute" },
  node: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  innerGlow: {
    position: "absolute",
    width: "72%",
    height: "72%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,155,94,0.25)",
  },
  plus: { fontSize: 22, fontWeight: "300", lineHeight: 22 },

  hint: {
    marginTop: 10,
    color: "#555",
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // overlays
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  // invite sheet
  sheet: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B1B1B",
    backgroundColor: "#050505",
    padding: 16,
  },

  // list sheet
  listSheet: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B1B1B",
    backgroundColor: "#050505",
    padding: 16,
  },

  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    color: "#EAE6DF",
    letterSpacing: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  sheetClose: { color: "#777", letterSpacing: 2, fontSize: 11 },
  sheetSub: { marginTop: 10, color: "#666", fontSize: 12, lineHeight: 16 },

  // list UI
  search: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#060606",
    paddingHorizontal: 12,
    color: "#EAE6DF",
    letterSpacing: 1,
  },
  listMetaRow: { flexDirection: "row", gap: 14 },
  listMeta: { color: "#444", fontSize: 11, letterSpacing: 0.4 },
  metaBold: { color: "#777", fontWeight: "700" },

  row: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#060606",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#070707",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeHero: {
    borderColor: "rgba(184,155,94,0.45)",
    backgroundColor: "rgba(184,155,94,0.06)",
  },
  badgeText: { color: "#777", fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  badgeTextHero: { color: "#B89B5E" },
  rowId: { color: "#EAE6DF", fontSize: 14, letterSpacing: 2, fontWeight: "700" },
  rowArrow: { color: "#333", fontSize: 22, marginTop: -2 },
  sep: { height: 10 },
  empty: { color: "#444", fontSize: 12, paddingVertical: 14, textAlign: "center" },

  // invite code box
  codeBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#060606",
    padding: 14,
  },
  codeLabel: { color: "#6A6A6A", fontSize: 10, letterSpacing: 2 },
  codeValue: {
    marginTop: 8,
    color: "#EAE6DF",
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: "700",
  },

  qrRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  qrBox: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  qrHint: { color: "#666", fontSize: 12, lineHeight: 16 },

  copyBtn: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070707",
  },
  copyText: { color: "#EAE6DF", fontSize: 11, letterSpacing: 2, fontWeight: "800" },

  actions: { gap: 10 },
  actionBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAE6DF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070707",
  },
  actionText: { color: "#EAE6DF", fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  actionBtnGhost: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#060606",
  },
  actionTextGhost: { color: "#9A9A9A", fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  sheetHint: { marginTop: 12, color: "#333", fontSize: 11, letterSpacing: 0.3, lineHeight: 15 },

  // Scan UI
  scanWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: 16,
  },
  scanCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B1B1B",
    backgroundColor: "#050505",
    padding: 14,
  },
  scanTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scanTitle: { color: "#EAE6DF", letterSpacing: 3, fontSize: 11, fontWeight: "800" },
  scanSub: { marginTop: 10, color: "#666", fontSize: 12 },
  cameraBox: {
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#000",
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(184,155,94,0.35)",
    borderRadius: 18,
  },
  scanHint: { marginTop: 10, color: "#444", fontSize: 11, letterSpacing: 0.2 },
});
