import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';

interface AudioPlayerAttachmentProps {
  uri: string;
  name: string;
}

export default function AudioPlayerAttachment({ uri, name }: AudioPlayerAttachmentProps) {
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const isSeeking = useRef(false);

  useEffect(() => {
    let active = true;
    let createdPlayer: AudioPlayer | null = null;

    async function loadSound() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });

        const p = createAudioPlayer(uri, { updateInterval: 250 });
        createdPlayer = p;

        p.addListener('playbackStatusUpdate', (status) => {
          if (!active) return;
          if (status.isLoaded) {
            if (!isSeeking.current) {
              setPosition(status.currentTime || 0);
            }
            setDuration(status.duration || 0);
            setIsPlaying(status.playing);
            if (status.didJustFinish && !status.loop) {
              setIsPlaying(false);
              setPosition(0);
              p.seekTo(0);
            }
          }
        });

        if (active) {
          setPlayer(p);
        }
      } catch (err) {
        console.warn('Error loading audio attachment sound', err);
      }
    }

    loadSound();

    return () => {
      active = false;
      if (createdPlayer) {
        createdPlayer.remove();
      }
    };
  }, [uri]);

  const handlePlayPause = async () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
      } else {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        player.play();
      }
    } catch (err) {
      console.warn('Error playing/pausing sound', err);
    }
  };

  const formatTime = (secs: number) => {
    const totalSecs = Math.floor(secs || 0);
    const mins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleSlidingStart = () => {
    isSeeking.current = true;
  };

  const handleSlidingComplete = async (value: number) => {
    isSeeking.current = false;
    if (!player) return;
    try {
      await player.seekTo(value);
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
