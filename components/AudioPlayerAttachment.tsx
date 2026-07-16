import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';

interface AudioPlayerAttachmentProps {
  uri: string;
  name: string;
}

export default function AudioPlayerAttachment({ uri, name }: AudioPlayerAttachmentProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const isSeeking = useRef(false);

  useEffect(() => {
    let active = true;
    let loadedSound: Audio.Sound | null = null;

    async function loadSound() {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          (status) => {
            if (!active) return;
            if (status.isLoaded) {
              if (!isSeeking.current) {
                setPosition(status.positionMillis || 0);
              }
              setDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish && !status.isLooping) {
                setIsPlaying(false);
                setPosition(0);
                s.setPositionAsync(0);
              }
            }
          }
        );
        loadedSound = s;
        if (active) {
          setSound(s);
        }
      } catch (err) {
        console.warn('Error loading audio attachment sound', err);
      }
    }

    loadSound();

    return () => {
      active = false;
      if (loadedSound) {
        loadedSound.unloadAsync();
      }
    };
  }, [uri]);

  const handlePlayPause = async () => {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // Configure audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        await sound.playAsync();
      }
    } catch (err) {
      console.warn('Error playing/pausing sound', err);
    }
  };

  const formatTime = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSlidingStart = () => {
    isSeeking.current = true;
  };

  const handleSlidingComplete = async (value: number) => {
    isSeeking.current = false;
    if (!sound) return;
    try {
      await sound.setPositionAsync(value);
      setPosition(value);
    } catch (err) {
      console.warn('Error seeking sound', err);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause} activeOpacity={0.85}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color="#FFF"
            style={!isPlaying && styles.playIconPlay}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.title} numberOfLines={1}>{name || 'Voice Note'}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 100}
          value={position}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={Colors.accent}
          maximumTrackTintColor={Colors.cardBorder}
          thumbTintColor={Colors.accent}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 228,
    height: 80,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  leftCol: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    // display: "none"
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconPlay: {
    paddingLeft: 2, // Optically center the play triangle
  },
  rightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.bodySemibold,
    fontSize: 11,
    color: Colors.text,
    marginBottom: 2,
    paddingLeft: 4,
  },
  slider: {
    width: '100%',
    height: 24,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  timeText: {
    fontFamily: Typography.body,
    fontSize: 9,
    color: Colors.textMuted,
  },
});
