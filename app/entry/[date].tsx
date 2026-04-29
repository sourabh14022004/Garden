import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoodPicker from '../../components/MoodPicker';
import FontPicker from '../../components/FontPicker';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { useFontStyle } from '../../hooks/useFontStyle';
import { useAmbientSound } from '../../hooks/useAmbientSound';
import {
  getEntry,
  saveEntry,
  deleteEntry,
  countWords,
  friendlyDate,
  JournalEntry,
} from '../../hooks/useJournal';

export default function EntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { currentFont } = useFontStyle();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, fadeIn: fadeInAmbient, fadeOut: fadeOutAmbient, isPlaying } = useAmbientSound();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState(2);
  const [wordCount, setWordCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displaySaveStatus, setDisplaySaveStatus] = useState('Save');
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTyping = useRef(false);
  const flipAnim = useRef(new Animated.Value(1)).current;

  // Load existing entry
  useEffect(() => {
    if (!date) return;
    getEntry(date).then((e) => {
      if (e) {
        setContent(e.content);
        setMood(e.mood);
        setWordCount(e.wordCount);
      }
    });
  }, [date]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      fadeOutAmbient();
    };
  }, []);

  // Handle automatic fade in / fade out based on typing state
  useEffect(() => {
    if (!soundEnabled) return;
    if (isTyping && !wasTyping.current) {
      fadeInAmbient();
      wasTyping.current = true;
    } else if (!isTyping && wasTyping.current) {
      fadeOutAmbient();
      wasTyping.current = false;
    }
  }, [isTyping, soundEnabled, fadeInAmbient, fadeOutAmbient]);

  // Auto-save with debounce
  const triggerSave = useCallback(
    (text: string, currentMood: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!text.trim()) {
          await deleteEntry(date!);
          return;
        }
        const wc = countWords(text);
        const entry: JournalEntry = {
          date: date!,
          content: text,
          mood: currentMood,
          wordCount: wc,
          updatedAt: new Date().toISOString(),
        };
        await saveEntry(entry);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 800);
    },
    [date]
  );

  const handleContentChange = (text: string) => {
    setContent(text);
    setWordCount(countWords(text));
    setSaved(false);
    triggerSave(text, mood);

    if (soundEnabled) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 4000); // fade out after 4s of inactivity
    }
  };

  const handleMoodChange = (m: number) => {
    setMood(m);
    triggerSave(content, m);
  };

  const handleManualSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!content.trim()) {
      await deleteEntry(date!);
      router.back();
      return;
    }

    setSaving(true);
    const wc = countWords(content);
    await saveEntry({ date: date!, content, mood, wordCount: wc, updatedAt: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to remove this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(date!);
            router.back();
          },
        },
      ]
    );
  };

  const currentSaveStatus = saving ? 'Saving…' : saved ? '✓ Saved' : 'Save';

  useEffect(() => {
    if (displaySaveStatus !== currentSaveStatus) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setDisplaySaveStatus(currentSaveStatus);
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentSaveStatus, displaySaveStatus, flipAnim]);

  const saveTextRotateX = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '0deg'],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Nav bar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Text style={styles.navBtnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.navCenter}>
            <Text style={styles.navDate}>{friendlyDate(date ?? '')}</Text>
          </View>

          <TouchableOpacity 
            onPress={handleManualSave} 
            style={styles.navBtnRight} 
            disabled={saving || displaySaveStatus !== 'Save'}
          >
            <Animated.Text 
              style={[
                styles.navBtnText, 
                styles.navSave, 
                displaySaveStatus === '✓ Saved' && styles.saveStatusSaved,
                { transform: [{ rotateX: saveTextRotateX }] }
              ]}
            >
              {displaySaveStatus}
            </Animated.Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mood picker */}
          <MoodPicker selected={mood} onChange={handleMoodChange} />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Text input — uses selected font */}
          <TextInput
            style={[styles.input, { fontFamily: currentFont.bodyFont }]}
            multiline
            placeholder="What's growing in your mind today…"
            placeholderTextColor={Colors.textFaint}
            value={content}
            onChangeText={handleContentChange}
            autoFocus={!content}
            textAlignVertical="top"
            selectionColor={Colors.accent}
          />
        </ScrollView>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: 24 }]}>
          {/* Word count */}
          <Text style={styles.wordCountText}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Text>

          {/* Ambient sound toggle */}
          <TouchableOpacity
            style={[
              styles.soundBtn,
              soundEnabled && styles.soundBtnActive,
            ]}
            onPress={() => setSoundEnabled(!soundEnabled)}
            activeOpacity={0.75}
          >
            <Text style={styles.soundBtnIcon}>
              {soundEnabled ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          {/* Font picker button */}
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => setShowFontPicker(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.fontBtnLabel, { fontFamily: currentFont.bodyFont }]}>Aa</Text>
            <Text style={styles.fontBtnName}>{currentFont.label}</Text>
          </TouchableOpacity>

          {/* Delete */}
          {content.trim() && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Font picker modal */}
      <FontPicker
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.bgDeep,
  },
  navBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 80,
  },
  navBtnRight: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 80,
    alignItems: 'flex-end',
  },
  navBtnText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  navSave: {
    color: Colors.accent,
    textAlign: 'right',
  },
  navCenter: {
    alignItems: 'center',
  },
  navDate: {
    fontFamily: Typography.heading,
    fontSize: 16,
    color: Colors.text,
    fontStyle: 'italic',
  },
  saveStatus: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textFaint,
    marginTop: 2,
  },
  saveStatusSaved: {
    color: Colors.accent,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 60,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  input: {
    fontSize: 17,
    color: Colors.text,
    lineHeight: 30,
    minHeight: 320,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.bgDeep,
    gap: Spacing.sm,
  },
  wordCountText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textFaint,
  },
  soundBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  soundBtnActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentDim + '60',
  },
  soundBtnIcon: {
    fontSize: 14,
  },
  fontBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentDim + '60',
  },
  fontBtnLabel: {
    fontSize: 16,
    color: Colors.accent,
  },
  fontBtnName: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.accentDim,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.danger + '12',
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  deleteBtnText: {
    fontSize: 15,
  },
});
