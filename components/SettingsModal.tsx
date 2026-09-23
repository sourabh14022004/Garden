import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useAmbientSound } from '../hooks/useAmbientSound';
import VolumeSlider from './VolumeSlider';

// ── Settings Modal ───────────────────────────────────────────────────────────
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { enabled, setEnabled, volume, setVolume } = useAmbientSound();

  const volumePercent = Math.round(volume * 100);
  const volumeLabel =
    volumePercent === 0
      ? 'Muted'
      : volumePercent <= 30
      ? 'Low'
      : volumePercent <= 70
      ? 'Medium'
      : 'High';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sound effects section ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊  Sound Effects</Text>
            <Text style={styles.sectionDesc}>
              Play calming rainforest ambience while you write.
            </Text>

            {/* Toggle */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Ambient Sound</Text>
                <Text style={styles.rowSub}>
                  {enabled ? 'Plays while typing' : 'Turned off'}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{
                  false: Colors.cardBorder,
                  true: Colors.accent + '60',
                }}
                thumbColor={enabled ? Colors.accent : Colors.surface}
                ios_backgroundColor={Colors.cardBorder}
              />
            </View>

            {/* Volume slider */}
            {enabled && (
              <View style={styles.volumeSection}>
                <View style={styles.volumeHeader}>
                  <Text style={styles.rowLabel}>Volume</Text>
                  <Text style={styles.volumePercent}>
                    {volumeLabel} · {volumePercent}%
                  </Text>
                </View>
                <View style={styles.sliderRow}>
                  <TouchableOpacity onPress={() => setVolume(0)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
                    <Text style={styles.sliderIcon}>🔈</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <VolumeSlider value={volume} onValueChange={setVolume} />
                  </View>
                  <TouchableOpacity onPress={() => setVolume(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
                    <Text style={styles.sliderIcon}>🔊</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Done button */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.bg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#1A2C1E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    fontStyle: 'italic',
  },
  closeBtn: {
    fontSize: 18,
    color: Colors.textMuted,
    padding: 4,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.bodySemibold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionDesc: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rowLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 15,
    color: Colors.text,
  },
  rowSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
    marginTop: 2,
  },
  volumeSection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  volumePercent: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderIcon: {
    fontSize: 16,
  },
  doneBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 13,
    borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  doneBtnText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 15,
    color: Colors.accent,
  },
});
