import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Colors, MOODS, Radius, Spacing, Typography } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  selected: number;
  onChange: (mood: number) => void;
  metadataText?: string;
}

export default function MoodPicker({ selected, onChange, metadataText }: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeMood = MOODS[selected] || MOODS[2];

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleSelect = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(idx);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {/* Left: Metadata text */}
        {metadataText ? (
          <Text style={styles.metadataText} numberOfLines={1}>
            {metadataText}
          </Text>
        ) : null}

        {/* Right: Compact Mood Pill Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleExpand}
          style={[
            styles.chip,
            {
              backgroundColor: activeMood.color + '15',
              borderColor: activeMood.color + '45',
            },
          ]}
        >
          <Text style={styles.chipEmoji}>{activeMood.emoji}</Text>
          <Text style={[styles.chipLabel, { color: activeMood.color }]}>
            {activeMood.label}
          </Text>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={activeMood.color}
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Inline Selector */}
      {expanded && (
        <View style={styles.expandedRow}>
          {MOODS.map((mood, idx) => {
            const isSelected = selected === idx;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => handleSelect(idx)}
                style={[
                  styles.optionPill,
                  isSelected
                    ? {
                        backgroundColor: mood.color + '25',
                        borderColor: mood.color,
                        transform: [{ scale: 1.04 }],
                      }
                    : {
                        backgroundColor: Colors.bgDeep,
                        borderColor: 'transparent',
                      },
                ]}
              >
                <Text style={styles.optionEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? mood.color : Colors.textMuted },
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  metadataText: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipLabel: {
    fontFamily: Typography.bodySemibold,
    fontSize: 11,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs + 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: Colors.surface + '80',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 3,
  },
  optionEmoji: {
    fontSize: 13,
  },
  optionLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 10,
  },
});
