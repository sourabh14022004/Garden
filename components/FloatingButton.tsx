import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors, Radius, Shadows, Typography } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface Props {
  onPress: () => void;
  label?: string;
}

export default function FloatingButton({ onPress, label = '+ New Entry' }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.fab}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: Radius.full,
    ...Shadows.accent,
  },
  label: {
    fontFamily: Typography.bodySemibold,
    fontSize: 15,
    color: Colors.bgDeep,
    letterSpacing: 0.3,
  },
});
