import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MOODS, Radius, Spacing, Typography } from '../constants/theme';
import { JournalEntry, friendlyDate, getEntryDisplay } from '../hooks/useJournal';
import { getPlantForDate } from '../hooks/usePlants';
import { useFontStyle } from '../hooks/useFontStyle';

interface Props {
  entry: JournalEntry;
  onDelete?: (date: string) => void;
}

export default function EntryCard({ entry, onDelete }: Props) {
  const router = useRouter();
  const mood = MOODS[entry.mood];
  const { title: displayTitle, preview: displayPreview } = getEntryDisplay(entry);
  const preview = displayPreview.slice(0, 130);
  const isLong = displayPreview.length > 130;
  const plant = getPlantForDate(entry.date);
  const { currentFont } = useFontStyle();

  const [year, month, day] = entry.date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const absoluteDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  const handlePress = async () => {
    if (entry.isLocked) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `"Garden" is encrypted`,
          fallbackLabel: 'Use Passcode',
        });
        if (!result.success) {
          return;
        }
      }
    }
    router.push(`/entry/${entry.date}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.card}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerTextStack}>
          <Text style={styles.relativeDate}>{friendlyDate(entry.date)}</Text>
          {!entry.isLocked ? (
            <Text style={[styles.moodLabel, { color: mood.color }]} numberOfLines={2}>
              {mood.label}
            </Text>
          ) : (
            <Text style={[styles.moodLabel, { color: Colors.textMuted }]} numberOfLines={2}>
              Locked
            </Text>
          )}
          <Text style={styles.absoluteDate}>{absoluteDate}</Text>
        </View>

        <View style={styles.headerIcons}>
          {!entry.isLocked ? (
            <View style={[styles.moodBadge, { backgroundColor: mood.color + '20', borderColor: mood.color + '50' }]}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            </View>
          ) : (
            <View style={[styles.moodBadge, { backgroundColor: Colors.accentSoft, borderColor: Colors.accentDim }]}>
              <Ionicons name="lock-closed" size={14} color={Colors.accent} />
            </View>
          )}
          <Image source={plant} style={styles.plantThumb} />
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content preview — in the user's chosen writing font */}
      {displayTitle ? (
        <Text style={[styles.cardTitle, { fontFamily: currentFont.bodyFont }]}>
          {displayTitle}
        </Text>
      ) : null}
      <Text style={[styles.preview, { fontFamily: currentFont.bodyFont }]} numberOfLines={2}>
        {entry.isLocked ? 'This entry is locked.' : `${preview}${isLong ? '…' : ''}`}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.wordCount}>{entry.wordCount} words</Text>
          {entry.attachments && entry.attachments.length > 0 && (
            <Text style={styles.attachmentCount}> • {entry.attachments.length} attachment{entry.attachments.length > 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={styles.footerRight}>
          {entry.isLocked && <Ionicons name="lock-closed" size={14} color={Colors.accentDim} style={styles.lockIcon} />}
          <Text style={styles.editHint}>Tap to edit →</Text>
        </View>
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
  cardTitle: {
    fontSize: 16,
    fontFamily: Typography.bodySemibold,
    color: Colors.text,
    marginBottom: 4,
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordCount: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  attachmentCount: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.accentDim,
  },
  editHint: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.accentDim,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 4,
  },
});
