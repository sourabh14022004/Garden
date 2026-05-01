import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  PanResponder,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useAmbientSound } from '../hooks/useAmbientSound';
import { getAllEntries, JournalEntry } from '../hooks/useJournal';

// ── Custom volume slider ─────────────────────────────────────────────────────
function VolumeSlider({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (v: number) => void;
}) {
  const trackRef = React.useRef<View>(null);
  const [trackWidth, setTrackWidth] = React.useState(0);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (trackWidth > 0) {
          const ratio = Math.max(0, Math.min(1, x / trackWidth));
          const stepped = Math.round(ratio * 20) / 20;
          onValueChange(stepped);
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (trackWidth > 0) {
          const ratio = Math.max(0, Math.min(1, x / trackWidth));
          const stepped = Math.round(ratio * 20) / 20;
          onValueChange(stepped);
        }
      },
    })
  ).current;

  return (
    <View
      ref={trackRef}
      style={sliderStyles.track}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View
        style={[sliderStyles.filled, { width: `${value * 100}%` }]}
      />
      <View
        style={[sliderStyles.thumb, { left: `${value * 100}%` }]}
      />
    </View>
  );
}

const THUMB_SIZE = 22;
const sliderStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cardBorder,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  filled: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.card,
    marginLeft: -THUMB_SIZE / 2,
    top: -(THUMB_SIZE - 6) / 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
});

// ── Profile Screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const hasNavigated = React.useRef(false);
  const { enabled, setEnabled, volume, setVolume } = useAmbientSound();

  const [totalEntries, setTotalEntries] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Compute stats
  useFocusEffect(
    useCallback(() => {
      hasNavigated.current = false;
      (async () => {
        const all = await getAllEntries();
        const withContent = all.filter((e) => e.content?.trim());
        setTotalEntries(withContent.length);
        setTotalWords(withContent.reduce((sum, e) => sum + (e.wordCount || 0), 0));

        // Calculate streak
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (withContent.some((e) => e.date === key)) {
            streak++;
          } else {
            break;
          }
        }
        setCurrentStreak(streak);
      })();
    }, [])
  );

  // Left swipe to go back to home
  const swipeHandlers = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        return gs.dx < -20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx < -30 && !hasNavigated.current) {
          hasNavigated.current = true;
          router.back();
        }
      },
    })
  ).current;

  const volumePercent = Math.round(volume * 100);
  const volumeLabel =
    volumePercent === 0
      ? 'Muted'
      : volumePercent <= 30
      ? 'Low'
      : volumePercent <= 70
      ? 'Medium'
      : 'High';

  return (
    <SafeAreaView style={styles.safe} edges={['top']} {...swipeHandlers.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={26} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile avatar area ─────────────────────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🌳</Text>
          </View>
          <Text style={styles.profileName}>Gardener</Text>
          <Text style={styles.profileTagline}>Growing one day at a time</Text>
        </View>

        {/* ── Stats cards ─────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalEntries}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalWords.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {currentStreak}{currentStreak > 0 ? '🔥' : ''}
            </Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* ── Sound Effects section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sound Effects</Text>
          <Text style={styles.sectionDesc}>
            Calming rainforest ambience while you write.
          </Text>

          {/* Toggle row */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Ambient Sound</Text>
              <Text style={styles.settingSub}>
                {enabled ? 'Plays when writing' : 'Turned off'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{
                false: Colors.cardBorder,
                true: Colors.accent + '60',
              }}
              thumbColor={enabled ? Colors.accent : Colors.surface}
              ios_backgroundColor={Colors.cardBorder}
            />
          </View>

          {/* Volume */}
          {enabled && (
            <View style={styles.volumeCard}>
              <View style={styles.volumeHeader}>
                <Text style={styles.settingLabel}>Volume</Text>
                <Text style={styles.volumePercent}>
                  {volumeLabel} · {volumePercent}%
                </Text>
              </View>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderIcon}>🔈</Text>
                <View style={{ flex: 1 }}>
                  <VolumeSlider value={volume} onValueChange={setVolume} />
                </View>
                <Text style={styles.sliderIcon}>🔊</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── About section ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutName}>Garden</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              A mindful journaling app that grows with you. Every word you write plants a seed in your personal garden.
            </Text>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.bg,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
    fontStyle: 'italic',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // ── Profile section ──
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentSoft,
    borderWidth: 2,
    borderColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  profileName: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  profileTagline: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },

  // ── Stats grid ──
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.accent,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Section ──
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionDesc: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textFaint,
    marginBottom: Spacing.md,
    lineHeight: 19,
  },

  // ── Settings rows ──
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  settingLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 15,
    color: Colors.text,
  },
  settingSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
    marginTop: 2,
  },

  // ── Volume ──
  volumeCard: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  volumePercent: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderIcon: {
    fontSize: 16,
  },

  // ── About ──
  aboutCard: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  aboutName: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  aboutVersion: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
    marginBottom: Spacing.sm,
  },
  aboutDesc: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
});
