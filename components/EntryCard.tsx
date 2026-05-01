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

  const [year, month, day] = entry.date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const absoluteDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/entry/${entry.date}`)}
      style={styles.card}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerTextStack}>
          <Text style={styles.relativeDate}>{friendlyDate(entry.date)}</Text>
          <Text style={[styles.moodLabel, { color: mood.color }]} numberOfLines={2}>
            {mood.label}
          </Text>
          <Text style={styles.absoluteDate}>{absoluteDate}</Text>
        </View>

        <View style={styles.headerIcons}>
          <View style={[styles.moodBadge, { backgroundColor: mood.color + '20', borderColor: mood.color + '50' }]}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          </View>
          <Image source={plant} style={styles.plantThumb} />
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerTextStack: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  relativeDate: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  moodLabel: {
    fontFamily: Typography.heading,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  absoluteDate: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  headerIcons: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  plantThumb: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  moodBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 16,
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
