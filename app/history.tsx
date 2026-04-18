import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import EntryCard from '../components/EntryCard';
import { Colors, Spacing, Typography, Radius } from '../constants/theme';
import { getAllEntries, JournalEntry } from '../hooks/useJournal';

export default function HistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const all = await getAllEntries();
    setEntries(all.filter((e) => e.content?.trim()));
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Garden</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : entries.length === 0 ? (
        /* Empty state */
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptySubtitle}>
            Start writing to watch your journal bloom.
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>Go plant a seed 🌱</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => <EntryCard entry={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          ListHeaderComponent={
            <Text style={styles.count}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in your garden
            </Text>
          }
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.bgDeep,
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.text,
    fontStyle: 'italic',
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  count: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    maxWidth: 220,
  },
  startBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
  },
  startBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 14,
    color: Colors.bgDeep,
  },
});
