import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { FONT_OPTIONS, useFontStyle } from '../hooks/useFontStyle';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.72;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FontPicker({ visible, onClose }: Props) {
  const { currentFont, setFont } = useFontStyle();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(bgAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = async (key: string) => {
    await setFont(key);
    setTimeout(onClose, 180);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: bgAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Writing Style</Text>
          <Text style={styles.subtitle}>Choose how your words feel</Text>
        </View>

        {/* Font cards */}
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {FONT_OPTIONS.map((option) => {
            const isSelected = option.key === currentFont.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(option.key)}
                activeOpacity={0.75}
              >
                {/* Left: label + description */}
                <View style={styles.cardLeft}>
                  <Text style={styles.cardEmoji}>{option.emoji}</Text>
                  <View>
                    <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.cardDescription}>{option.description}</Text>
                  </View>
                </View>

                {/* Right: selected check */}
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}

                {/* Preview text in the actual font */}
                <Text
                  style={[
                    styles.preview,
                    { fontFamily: option.bodyFont },
                    isSelected && styles.previewSelected,
                  ]}
                  numberOfLines={2}
                >
                  {option.previewText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 44, 30, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardBorder,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  list: {
    padding: Spacing.md,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: 10,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardLabel: {
    fontFamily: Typography.bodySemibold,
    fontSize: 16,
    color: Colors.text,
  },
  cardLabelSelected: {
    color: Colors.accent,
  },
  cardDescription: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.bodySemibold,
  },
  preview: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  previewSelected: {
    color: Colors.text,
    borderTopColor: Colors.accent + '40',
  },
});
