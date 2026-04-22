import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors, Spacing, Typography, Radius } from "../constants/theme";
import {
  getAllEntries,
  JournalEntry,
  friendlyDate,
  shortFriendlyDate,
} from "../hooks/useJournal";
import { getPlantForDate } from "../hooks/usePlants";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const currentYear = new Date().getFullYear();
// ── Grid constants ────────────────────────────────────────────────────────────
const PLANTS_PER_ROW = 7;
const H_PAD = Spacing.lg;
const SLOT_W = Math.floor((SCREEN_W - H_PAD * 2) / PLANTS_PER_ROW);
const PLANT_SIZE = Math.floor(SLOT_W * 1.3); // plants are deliberately large to overlap organically

function getJitter(index: number) {
  // Deterministic pseudo-random offset so they aren't in boring straight lines
  const x = Math.sin(index * 12.9898) * 16;
  const y = Math.cos(index * 78.233) * 18;
  return { x, y };
}

// Split entries into rows of PLANTS_PER_ROW.
// Oldest entries first so the newest row sits at the very bottom.
function chunkIntoRows(entries: JournalEntry[]): JournalEntry[][] {
  const ordered = [...entries].reverse(); // oldest → newest
  const rows: JournalEntry[][] = [];
  for (let i = 0; i < ordered.length; i += PLANTS_PER_ROW) {
    rows.push(ordered.slice(i, i + PLANTS_PER_ROW));
  }
  return rows;
}

// ── Animated plant cell ───────────────────────────────────────────────────────
function PlantCell({
  entry,
  delay,
  jitter,
  onPress,
}: {
  entry: JournalEntry;
  delay: number;
  jitter: { x: number; y: number };
  onPress: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        damping: 13,
        stiffness: 130,
      }),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.plantSlot,
        { transform: [{ translateX: jitter.x }, { translateY: jitter.y }] },
      ]}
    >
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <Image
          source={getPlantForDate(entry.date)}
          style={{
            width: PLANT_SIZE,
            height: PLANT_SIZE,
            resizeMode: "contain",
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Plant row ─────────────────────────────────────────────────────────────────
function PlantRow({
  rowEntries,
  rowIndex,
  totalRows,
  onPlantPress,
}: {
  rowEntries: JournalEntry[];
  rowIndex: number;
  totalRows: number;
  onPlantPress: (entry: JournalEntry) => void;
}) {
  // Pad the last row with empty slots so that real plants always hug the left
  const slots = [...rowEntries];
  while (slots.length < PLANTS_PER_ROW) slots.push(null as any);

  return (
    <View style={styles.plantRow}>
      {slots.map((entry, i) => {
        const absIndex = rowIndex * PLANTS_PER_ROW + i;
        const jitter = getJitter(absIndex);

        return entry ? (
          <PlantCell
            key={entry.date}
            entry={entry}
            delay={(totalRows - 1 - rowIndex) * 60 + i * 50}
            jitter={jitter}
            onPress={() => onPlantPress(entry)}
          />
        ) : (
          // Empty slot — subtle dotted placeholder with organic jitter
          <View
            key={`empty-${i}`}
            style={[
              styles.emptySlot,
              {
                transform: [{ translateX: jitter.x }, { translateY: jitter.y }],
              },
            ]}
          >
            <View style={styles.emptyDot} />
          </View>
        );
      })}
    </View>
  );
}

// ── Empty forest ──────────────────────────────────────────────────────────────
function EmptyForest({ onWrite }: { onWrite: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyContainer, { opacity: fade }]}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>Your garden is empty</Text>
      <Text style={styles.emptySubtitle}>
        Write your first entry to plant{"\n"}the seed of your forest.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={onWrite}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyBtnText}>Plant a seed 🌿</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ForestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const legendScrollRef = useRef<ScrollView>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await getAllEntries();
    setEntries(all.filter((e) => e.content?.trim()));
    setLoading(false);
  }, []);

  const hasNavigated = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      hasNavigated.current = false;
      setLoading(true);
      load();
    }, [load]),
  );

  // Load entries when screen comes into focus

  const rows = chunkIntoRows(entries);

  // Calculate how many rows fill the viewable garden area to paint the background grid
  const ROW_HEIGHT = PLANT_SIZE; // no extra margin to pack them tightly
  const availableHeight = SCREEN_H - insets.top - 80 - 104; // Total ht - headerSp - bottomBar
  const minRows = Math.max(1, Math.ceil(availableHeight / ROW_HEIGHT));

  // Pad the grid with empty rows so the dots cover the remaining screen real estate
  while (rows.length < minRows) {
    rows.push([]);
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  const swipeHandlers = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          gestureState.dx > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 30 && !hasNavigated.current) {
          hasNavigated.current = true;
          router.back();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.root} {...swipeHandlers.panHandlers}>
      {/* Background */}
      <View style={styles.bg} />

      <SafeAreaView
        style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
        edges={["top"]}
        pointerEvents="box-none"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={26} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{currentYear}</Text>
            {entries.length > 0 && (
              <Text style={styles.subtitle}>
                {entries.length} {entries.length === 1 ? "plant" : "plants"}{" "}
                growing 🌿
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.writeBtn}
            onPress={() => router.push(`/entry/${todayKey}`)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={26} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Garden content ────────────────────────────────────────────── */}
      {loading ? null : entries.length === 0 ? (
        <EmptyForest onWrite={() => router.push(`/entry/${todayKey}`)} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Spacer so plants don't hide behind header */}
          <View style={{ height: insets.top + 80 }} />

          {/* Plant grid — oldest rows at top, newest at bottom */}
          {rows.map((rowEntries, rowIdx) => (
            <PlantRow
              key={rowIdx}
              rowEntries={rowEntries}
              rowIndex={rowIdx}
              totalRows={rows.length}
              onPlantPress={(entry) => router.push(`/entry/${entry.date}`)}
            />
          ))}
        </ScrollView>
      )}

      {/* Legend pinned to bottom bar */}
      {!loading && entries.length > 0 && (
        <View style={[styles.legendWrapper, { paddingBottom: insets.bottom }]}>
          {/* Ground strip moved to sit directly on top of the bottom bar */}
          <View style={styles.ground} />

          <View>
            <ScrollView
              ref={legendScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.legendContent}
              onContentSizeChange={() =>
                legendScrollRef.current?.scrollToEnd({ animated: false })
              }
            >
              {/* Show oldest to newest in left-to-right sequence */}
              {entries
                .slice(0, 12)
                .reverse()
                .map((entry) => (
                  <TouchableOpacity
                    key={entry.date}
                    style={styles.legendItem}
                    onPress={() => router.push(`/entry/${entry.date}`)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={getPlantForDate(entry.date)}
                      style={styles.legendPlant}
                    />
                    <Text style={styles.legendDate}>
                      {shortFriendlyDate(entry.date)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Edge fades */}
            <View pointerEvents="none" style={styles.fadeLeft}>
              <Svg height="100%" width="100%">
                <Defs>
                  <LinearGradient id="gradL" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#FAF7F0" stopOpacity="0.95" />
                    <Stop offset="1" stopColor="#FAF7F0" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradL)" />
              </Svg>
            </View>
            <View pointerEvents="none" style={styles.fadeRight}>
              <Svg height="100%" width="100%">
                <Defs>
                  <LinearGradient id="gradR" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#FAF7F0" stopOpacity="0" />
                    <Stop offset="1" stopColor="#FAF7F0" stopOpacity="0.95" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradR)" />
              </Svg>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF7F0",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FAF7F0",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: "rgba(250, 247, 240, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerBtn: { minWidth: 60 },
  backText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  headerCenter: { alignItems: "center" },
  title: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.text,
    fontStyle: "italic",
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  writeBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    minWidth: 60,
    alignItems: "center",
  },
  writeBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
  },

  // ── Scroll / grid ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: "flex-start", // plants start from the top, under the header
  },

  plantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    // removing bottom margin makes them overlap physically, jitter moves them around
  },
  plantSlot: {
    width: SLOT_W,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // Empty slot — subtle dot placeholder so the grid shape is visible
  emptySlot: {
    width: SLOT_W,
    height: PLANT_SIZE,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  emptyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.cardBorder,
  },

  // Ground acts as the top border of the legend wrapper
  ground: {
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.25,
    marginHorizontal: Spacing.lg,
  },

  // ── Legend ──
  legendWrapper: {
    backgroundColor: "rgba(250, 247, 240, 0.85)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
  },
  legendContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xl,
    alignItems: "flex-start",
  },
  legendItem: {
    alignItems: "center",
    width: 64,
  },
  legendPlant: {
    width: 44,
    height: 44,
    resizeMode: "contain",
    marginBottom: 8,
  },
  legendDate: {
    fontFamily: Typography.bodyMedium,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
    opacity: 0.5,
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    marginTop: 80,
  },
  emptyEmoji: { fontSize: 60, marginBottom: Spacing.md },
  emptyTitle: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent + "60",
  },
  emptyBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 15,
    color: Colors.accent,
  },
});
