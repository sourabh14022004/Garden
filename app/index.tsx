import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const load = useCallback(async () => {
    const [e, dates, all] = await Promise.all([
      getEntry(selectedDate),
      getDatesWithEntries(),
      getAllEntries(),
    ]);
    setEntry(e);
    setMarkedDates(dates);
    setTotalPlants(all.filter((x) => x.content?.trim()).length);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.tagline}>Your garden is growing 🌱</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.forestBtn}
            onPress={() => router.push('/forest')}
            activeOpacity={0.7}
          >
            <Text style={styles.forestBtnText}>Forest 🌿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.historyBtnText}>All →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Forest stats strip */}
      {totalPlants > 0 && (
        <TouchableOpacity
          style={styles.statsStrip}
          onPress={() => router.push('/forest')}
          activeOpacity={0.85}
        >
          <View style={styles.statsRow}>
            <Image source={getPlantForDate(todayKey())} style={styles.statPlantThumb} />
            <Text style={styles.statsText}>
              <Text style={styles.statsCount}>{totalPlants}</Text>
              {' '}
              {totalPlants === 1 ? 'plant' : 'plants'} in your forest — tap to explore
            </Text>
            <Text style={styles.statsArrow}>›</Text>
          </View>
        </TouchableOpacity>
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
        {/* Selected date label */}
        <Text style={styles.selectedDateLabel}>{friendlyDate(selectedDate)}</Text>

        {entry ? (
          /* ── Existing entry card ── */
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/entry/${selectedDate}`)}
            style={styles.entryCard}
          >
            {/* Plant + Mood row */}
            <View style={styles.moodRow}>
              <Image source={todayPlant} style={styles.plantBadge} />
              <View style={[styles.moodBadge, { backgroundColor: mood!.color + '25', borderColor: mood!.color + '60' }]}>
                <Text style={styles.moodEmoji}>{mood!.emoji}</Text>
              </View>
              <Text style={[styles.moodLabelText, { color: mood!.color }]}>
                Feeling {mood!.label}
              </Text>
            </View>

            {/* Entry preview */}
            <Text style={styles.entryPreview} numberOfLines={6}>
              {entry.content}
            </Text>

            {/* Footer */}
            <View style={styles.entryFooter}>
              <Text style={styles.wordCountText}>{entry.wordCount} words planted</Text>
              <Text style={styles.editText}>Tap to continue →</Text>
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

      {/* FAB — always visible for selected date */}
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
  forestBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  forestBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
  },
  historyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  historyBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
    color: Colors.accent,
  },
  // Stats strip
  statsStrip: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentDim + '80',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  selectedDateLabel: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
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
