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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoodPicker from '../../components/MoodPicker';
import FontPicker from '../../components/FontPicker';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { useFontStyle } from '../../hooks/useFontStyle';
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

  const [content, setContent] = useState('');
  const [mood, setMood] = useState(2);
  const [wordCount, setWordCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const saveStatus = saving ? 'Saving…' : saved ? '✓ Saved' : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
            {saveStatus ? (
              <Text style={[styles.saveStatus, saved && styles.saveStatusSaved]}>
                {saveStatus}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={handleManualSave} style={styles.navBtn} disabled={saving}>
            <Text style={[styles.navBtnText, styles.navSave]}>Save</Text>
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
        <View style={styles.bottomBar}>
          {/* Word count */}
          <Text style={styles.wordCountText}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Text>

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
    backgroundColor: Colors.bg,
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
    minWidth: 60,
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
