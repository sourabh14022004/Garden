import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, MOODS, Radius, Spacing, Typography } from '../constants/theme';
import { JournalEntry, friendlyDate } from '../hooks/useJournal';
import { getPlantForDate } from '../hooks/usePlants';
import { useFontStyle } from '../hooks/useFontStyle';

interface Props {
  entry: JournalEntry;
  onDelete?: (date: string) => void;
}

export default function EntryCard({ entry, onDelete }: Props) {
  const router = useRouter();
  const mood = MOODS[entry.mood];
  const preview = entry.content.trim().slice(0, 130);
  const isLong = entry.content.trim().length > 130;
  const plant = getPlantForDate(entry.date);
  const { currentFont } = useFontStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/entry/${entry.date}`)}
      style={styles.card}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Plant thumbnail */}
          <Image source={plant} style={styles.plantThumb} />
          <View style={[styles.moodBadge, { backgroundColor: mood.color + '20', borderColor: mood.color + '50' }]}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          </View>
          <View>
            <Text style={styles.dateText}>{friendlyDate(entry.date)}</Text>
            <Text style={styles.dateRaw}>{entry.date}</Text>
          </View>
        </View>
        <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content preview — in the user's chosen writing font */}
      <Text style={[styles.preview, { fontFamily: currentFont.bodyFont }]}>
        {preview}{isLong ? '…' : ''}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.wordCount}>{entry.wordCount} words</Text>
        <Text style={styles.editHint}>Tap to edit →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  plantThumb: {
    width: 38,
    height: 38,
    resizeMode: 'contain',
  },
  moodBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 18,
  },
  dateText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 14,
    color: Colors.text,
  },
  dateRaw: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textFaint,
    marginTop: 1,
  },
  moodLabel: {
    fontFamily: Typography.bodySemibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
  },
  preview: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  wordCount: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  editHint: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.accentDim,
  },
});
