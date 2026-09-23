import React from 'react';
import { StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '../constants/theme';

interface VolumeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export function VolumeSlider({ value, onValueChange }: VolumeSliderProps) {
  return (
    <Slider
      style={styles.slider}
      minimumValue={0}
      maximumValue={1}
      step={0.05}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={Colors.accent}
      maximumTrackTintColor={Colors.cardBorder}
      thumbTintColor={Colors.accent}
    />
  );
}

const styles = StyleSheet.create({
  slider: {
    width: '100%',
    height: 40,
  },
});

export default VolumeSlider;
