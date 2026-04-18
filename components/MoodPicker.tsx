import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, MOODS, Radius, Spacing, Typography } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface Props {
  selected: number;
  onChange: (mood: number) => void;
}

export default function MoodPicker({ selected, onChange }: Props) {
  const handleSelect = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(idx);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How are you feeling?</Text>
      <View style={styles.row}>
        {MOODS.map((mood, idx) => {
          const isSelected = selected === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSelect(idx)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                isSelected && { backgroundColor: mood.color + '22', borderColor: mood.color },
              ]}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
              {isSelected && (
                <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    gap: 5,
  },
  emoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontFamily: Typography.bodySemibold,
    fontSize: 13,
  },
});
