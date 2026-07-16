import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import CalendarStrip from '../components/CalendarStrip';
import FloatingButton from '../components/FloatingButton';
import { Colors, MOODS, Radius, Shadows, Spacing, Typography } from '../constants/theme';
import {
  formatDate,
  todayKey,
  friendlyDate,
  getEntry,
  getDatesWithEntries,
  getAllEntries,
  JournalEntry,
  isEntryNonEmpty,
  getEntryDisplay,
} from '../hooks/useJournal';
import { getPlantForDate } from '../hooks/usePlants';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up? 🌙';
  if (h < 12) return 'Good morning ☀️';
  if (h < 17) return 'Good afternoon 🌿';
  if (h < 21) return 'Good evening 🍃';
  return 'Good night 🌙';
}

export default function HomeScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [totalPlants, setTotalPlants] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const prevTotalPlants = React.useRef<number | null>(null);
  const toastAnim = React.useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (prevTotalPlants.current !== null && totalPlants > prevTotalPlants.current) {
      setShowToast(true);
      Animated.spring(toastAnim, {
        toValue: 12,
        useNativeDriver: true,
        damping: 14,
        stiffness: 100,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowToast(false));
      }, 4000);
      
      prevTotalPlants.current = totalPlants;
      return () => clearTimeout(timer);
    }
    prevTotalPlants.current = totalPlants;
  }, [totalPlants]);

  const load = useCallback(async () => {
    const [e, dates, all] = await Promise.all([
      getEntry(selectedDate),
      getDatesWithEntries(),
      getAllEntries(),
    ]);
    setEntry(e);
    setMarkedDates(dates);
    setTotalPlants(all.filter(isEntryNonEmpty).length);
  }, [selectedDate]);

  const hasNavigated = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      hasNavigated.current = false;
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const mood = entry ? MOODS[entry.mood] : null;
  const isToday = selectedDate === todayKey();
  const todayPlant = getPlantForDate(selectedDate);

  const handleEntryPress = async () => {
    if (entry?.isLocked) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Garden is encrypted',
          fallbackLabel: 'Use Passcode',
        });
        if (!result.success) {
          return;
        }
      }
    }
    router.push(`/entry/${selectedDate}`);
  };

  const swipeHandlers = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!hasNavigated.current) {
          if (gestureState.dx < -30) {
            // Left swipe → Garden
            hasNavigated.current = true;
            router.push('/garden');
          } else if (gestureState.dx > 30) {
            // Right swipe → Profile
            hasNavigated.current = true;
            router.push('/profile');
          }
        }
      },
    })
  ).current;

  return (
      <SafeAreaView style={styles.safe} edges={['top']} {...swipeHandlers.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>{getGreeting()}</Text>
          <Text style={styles.tagline} numberOfLines={1}>Your garden is growing 🌱</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.gardenBtn}
            onPress={() => router.push('/garden')}
            activeOpacity={0.7}
          >
            <Text style={styles.gardenBtnText}>Garden</Text>
            <Text style={styles.gardenBtnIcon}>🌿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.historyBtnText}>All</Text>
            <Text style={styles.historyBtnIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Garden stats strip (now a Toast) */}
      {showToast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
          <TouchableOpacity
            style={styles.statsStrip}
            onPress={() => {
              router.push('/garden');
              setShowToast(false);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.statsRow}>
              <Image source={todayPlant} style={styles.statPlantThumb} />
              <Text style={styles.statsText}>
                <Text style={styles.statsCount}>{totalPlants}</Text>
                {' '}
                {totalPlants === 1 ? 'plant' : 'plants'} in your garden — tap to explore
              </Text>
              <Text style={styles.statsArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Calendar */}
      <View style={styles.calendarWrapper}>
        <CalendarStrip
          selectedDate={selectedDate}
          markedDates={markedDates}
          onSelectDate={setSelectedDate}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {entry && isEntryNonEmpty(entry) ? (
          /* ── Existing entry card ── */
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleEntryPress}
            style={styles.entryCard}
          >
            {/* Plant + Mood row */}
            <View style={styles.moodRow}>
              <Image source={todayPlant} style={styles.plantBadge} />
              {!entry.isLocked && (
                <>
                  <View style={[styles.moodBadge, { backgroundColor: mood!.color + '25', borderColor: mood!.color + '60' }]}>
                    <Text style={styles.moodEmoji}>{mood!.emoji}</Text>
                  </View>
                  <Text style={[styles.moodLabelText, { color: mood!.color }]}>
                    Feeling {mood!.label}
                  </Text>
                </>
              )}
            </View>

            {/* Entry preview */}
            {(() => {
              const { title: displayTitle, preview: displayPreview } = getEntryDisplay(entry);
              return (
                <>
                  {displayTitle ? (
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {displayTitle}
                    </Text>
                  ) : null}
                  <Text style={styles.entryPreview} numberOfLines={1}>
                    {entry.isLocked ? 'This entry is locked.' : displayPreview}
                  </Text>
                </>
              );
            })()}

            {/* Footer */}
            <View style={styles.entryFooter}>
              <Text style={styles.wordCountText}>{entry.wordCount} words planted</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {entry.isLocked && <Ionicons name="lock-closed" size={14} color={Colors.accentDim} style={{ marginRight: 4 }} />}
                <Text style={styles.editText}>Tap to continue →</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          /* ── Empty state ── */
          <View style={styles.emptyState}>
            <Image source={todayPlant} style={styles.emptyPlantImg} />
            <Text style={styles.emptyTitle}>
              {isToday ? "Plant today's seed" : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isToday
                ? 'Write a few words and watch your garden grow.'
                : "This day has no entry yet — it's not too late to plant one."}
            </Text>
          </View>
        )}
      </ScrollView>

      <FloatingButton onPress={() => router.push(`/entry/${selectedDate}`)} />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greeting: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  tagline: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnIcon: {
    fontSize: 16,
  },
  gardenBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentDim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gardenBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
    lineHeight: 16,
  },
  gardenBtnIcon: {
    fontSize: 13,
    lineHeight: 16,
  },
  historyBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
    lineHeight: 16,
  },
  historyBtnIcon: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
    lineHeight: 16,
  },
  // Stats strip
  toastContainer: {
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  statsStrip: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentDim + '80',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    ...Shadows.card,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPlantThumb: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  statsText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  statsCount: {
    fontFamily: Typography.bodySemibold,
    color: Colors.accent,
  },
  statsArrow: {
    fontFamily: Typography.bodySemibold,
    fontSize: 20,
    color: Colors.accentDim,
  },
  calendarWrapper: {
    backgroundColor: Colors.bgDeep,
    paddingBottom: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  // Entry card
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  plantBadge: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  moodBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabelText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 15,
  },
  entryTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  entryPreview: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  wordCountText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  editText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: Colors.accentDim,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  emptyPlantImg: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: Spacing.md,
    opacity: 0.85,
  },
  emptyTitle: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 240,
    marginBottom: Spacing.lg,
  },
  emptyBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: Radius.full,
    ...Shadows.accent,
  },
  emptyBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 15,
    color: Colors.bgDeep,
  },
});
