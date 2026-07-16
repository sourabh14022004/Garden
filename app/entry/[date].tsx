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
  Image,
  Modal,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoodPicker from '../../components/MoodPicker';
import FontPicker from '../../components/FontPicker';
import AudioPlayerAttachment from '../../components/AudioPlayerAttachment';
import { Audio } from 'expo-av';
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
  Attachment,
  parseDate,
} from '../../hooks/useJournal';
import { 
  FontAwesome6,
  MaterialIcons,
  Feather,
  Ionicons,
  Octicons
 } from '@expo/vector-icons';

export default function EntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { currentFont } = useFontStyle();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, fadeIn: fadeInAmbient, fadeOut: fadeOutAmbient, isPlaying } = useAmbientSound();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(2);
  const [wordCount, setWordCount] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [displaySaveStatus, setDisplaySaveStatus] = useState('Save');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<{ title: string; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Track per-attachment drag positions
  const dragPositions = useRef<Record<string, Animated.ValueXY>>({});

  const getDragAnim = (id: string, initialX = 0, initialY = 0) => {
    if (!dragPositions.current[id]) {
      dragPositions.current[id] = new Animated.ValueXY({ x: initialX, y: initialY });
    }
    return dragPositions.current[id];
  };

  // Used to disable ScrollView scrolling while an attachment is being dragged.
  // A ref (not state) avoids triggering re-renders that would kill the gesture mid-drag.
  const isDragging = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTyping = useRef(false);
  const flipAnim = useRef(new Animated.Value(1)).current;

  // Load existing entry
  useEffect(() => {
    if (!date) return;
    getEntry(date).then((e) => {
      const loadedTitle = e?.title || '';
      const loadedContent = e?.content || '';

      if (e) {
        setTitle(loadedTitle);
        setContent(loadedContent);
        setMood(e.mood);
        setWordCount(e.wordCount);
        setAttachments(e.attachments || []);
        setIsLocked(!!e.isLocked);
      }

      // Initialize history with loaded state
      setHistory([{ title: loadedTitle, content: loadedContent }]);
      setHistoryIndex(0);
    });
  }, [date]);

  // Clean up sound, recording interval, and history timeout on unmount
  useEffect(() => {
    return () => {
      fadeOutAmbient();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recordHistoryTimeoutRef.current) {
        clearTimeout(recordHistoryTimeoutRef.current);
      }
    };
  }, [fadeOutAmbient]);

  // Pulsing animation for recording red dot
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.3);
    }
  }, [isRecording, pulseAnim]);

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

  const titleRef = useRef('');
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const getMetadataText = () => {
    const parsedDate = date ? parseDate(date) : new Date();
    const datePart = parsedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} at ${time} | ${content.length} ${content.length === 1 ? 'character' : 'characters'}`;
  };

  // Auto-save with debounce
  const triggerSave = useCallback(
    (text: string, currentMood: number, currentAttachments: Attachment[], currentIsLocked: boolean) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const currentTitle = titleRef.current;
        if (!text.trim() && !currentTitle.trim() && currentAttachments.length === 0) {
          await deleteEntry(date!);
          return;
        }
        const wc = countWords(text);
        const entry: JournalEntry = {
          date: date!,
          title: currentTitle,
          content: text,
          mood: currentMood,
          wordCount: wc,
          updatedAt: new Date().toISOString(),
          attachments: currentAttachments,
          isLocked: currentIsLocked,
        };
        await saveEntry(entry);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 800);
    },
    [date]
  );

  const historyIndexRef = useRef(-1);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const recordState = useCallback((newTitle: string, newContent: string) => {
    if (recordHistoryTimeoutRef.current) clearTimeout(recordHistoryTimeoutRef.current);
    
    recordHistoryTimeoutRef.current = setTimeout(() => {
      setHistory((prev) => {
        const currentIndex = historyIndexRef.current;
        const cleanHistory = prev.slice(0, currentIndex + 1);
        
        const lastState = cleanHistory[cleanHistory.length - 1];
        if (lastState && lastState.title === newTitle && lastState.content === newContent) {
          return prev;
        }
        
        const nextHistory = [...cleanHistory, { title: newTitle, content: newContent }];
        setHistoryIndex(nextHistory.length - 1);
        return nextHistory;
      });
    }, 400);
  }, []);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      
      setHistoryIndex(prevIndex);
      setTitle(state.title);
      setContent(state.content);
      setWordCount(countWords(state.content));
      
      setSaved(false);
      titleRef.current = state.title;
      triggerSave(state.content, mood, attachments, isLocked);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      
      setHistoryIndex(nextIndex);
      setTitle(state.title);
      setContent(state.content);
      setWordCount(countWords(state.content));
      
      setSaved(false);
      titleRef.current = state.title;
      triggerSave(state.content, mood, attachments, isLocked);
    }
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setSaved(false);
    titleRef.current = text;
    triggerSave(content, mood, attachments, isLocked);
    recordState(text, content);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setWordCount(countWords(text));
    setSaved(false);
    triggerSave(text, mood, attachments, isLocked);

    if (soundEnabled) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 4000); // fade out after 4s of inactivity
    }

    recordState(title, text);
  };

  const handleMoodChange = (m: number) => {
    setMood(m);
    triggerSave(content, m, attachments, isLocked);
  };

  const handleLockToggle = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !enrolled) {
      Alert.alert(
        'Biometrics Not Available',
        'Your device does not support or have biometric authentication set up. Please enable it in your device settings.'
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: isLocked ? 'Verify to unlock' : 'Confirm to lock',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        const newIsLocked = !isLocked;
        setIsLocked(newIsLocked);
        triggerSave(content, mood, attachments, newIsLocked);
      } else {
        Alert.alert('Authentication Failed', 'We could not verify your identity.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  const handleManualSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!content.trim() && !title.trim() && attachments.length === 0) {
      await deleteEntry(date!);
      router.back();
      return;
    }

    setSaving(true);
    const wc = countWords(content);
    await saveEntry({ date: date!, title, content, mood, wordCount: wc, updatedAt: new Date().toISOString(), attachments, isLocked });
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
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable microphone access in settings to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async (save: boolean) => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (!recording) {
      setIsRecording(false);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      if (save && uri) {
        const newAtt: Attachment = {
          id: Date.now().toString(),
          uri: uri,
          type: 'audio',
          name: `Voice Note ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        };
        const newAttachments = [...attachments, newAtt];
        setAttachments(newAttachments);
        triggerSave(content, mood, newAttachments, isLocked);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleAttach = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newAtt: Attachment = {
        id: Date.now().toString(),
        uri: asset.uri,
        type: 'image',
        name: asset.fileName || 'image.jpg',
      };
      const newAttachments = [...attachments, newAtt];
      setAttachments(newAttachments);
      triggerSave(content, mood, newAttachments, isLocked);
    }
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
  const showHistoryButtons = historyIndex > 0 || historyIndex < history.length - 1;

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
            <Text style={styles.navBtnText}>
              <Ionicons name='chevron-back' size={25} color={Colors.accent}/>
            </Text>
          </TouchableOpacity>

          <View style={styles.navbarRightContainer}>
            {showHistoryButtons && (
              <>
                {/* Undo Button */}
                <TouchableOpacity 
                  onPress={handleUndo} 
                  style={styles.navActionBtn} 
                  disabled={historyIndex <= 0}
                  activeOpacity={0.7}
                >
                  <Octicons 
                    name="undo" 
                    size={18} 
                    color={historyIndex <= 0 ? Colors.textFaint : Colors.accent} 
                  />
                </TouchableOpacity>

                {/* Redo Button */}
                <TouchableOpacity 
                  onPress={handleRedo} 
                  style={styles.navActionBtn} 
                  disabled={historyIndex >= history.length - 1}
                  activeOpacity={0.7}
                >
                  <Octicons 
                    name="redo" 
                    size={18} 
                    color={historyIndex >= history.length - 1 ? Colors.textFaint : Colors.accent} 
                  />
                </TouchableOpacity>
              </>
            )}

            {/* Save Button */}
            <TouchableOpacity 
              onPress={handleManualSave} 
              style={styles.navBtnRight} 
              disabled={saving || displaySaveStatus !== 'Save'}
            >
              <Animated.Text 
                style={[
                  styles.navBtnText, 
                  styles.navSave, 
                  displaySaveStatus === 'Saved' && styles.saveStatusSaved,
                  { transform: [{ rotateX: saveTextRotateX }] }
                ]}
              >
                {displaySaveStatus}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mood picker */}
          <MoodPicker selected={mood} onChange={handleMoodChange} />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { fontFamily: currentFont.bodyFont }]}
            placeholder="Title"
            placeholderTextColor={Colors.textFaint}
            value={title}
            onChangeText={handleTitleChange}
            selectionColor={Colors.accent}
          />

          {/* Metadata Text */}
          <Text style={styles.metadataText}>{getMetadataText()}</Text>

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

          {/* Attachments Section — draggable */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {attachments.map((att) => {
                const anim = getDragAnim(att.id, att.x || 0, att.y || 0);
                const panResponder = PanResponder.create({
                  // Capture the touch immediately so iOS ScrollView doesn't steal it.
                  onStartShouldSetPanResponder: () => false,
                  onStartShouldSetPanResponderCapture: () => false,
                  onMoveShouldSetPanResponder: (_, gs) =>
                    Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6,
                  onMoveShouldSetPanResponderCapture: (_, gs) =>
                    Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6,
                  onPanResponderGrant: () => {
                    // Disable scroll natively so ScrollView releases the gesture to us without re-rendering.
                    isDragging.current = true;
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                    anim.setOffset({
                      x: (anim.x as any)._value,
                      y: (anim.y as any)._value,
                    });
                    anim.setValue({ x: 0, y: 0 });
                  },
                  onPanResponderMove: Animated.event(
                    [null, { dx: anim.x, dy: anim.y }],
                    { useNativeDriver: false }
                  ),
                  onPanResponderRelease: () => {
                    anim.flattenOffset();
                    isDragging.current = false;
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                    
                    const finalX = (anim.x as any)._value;
                    const finalY = (anim.y as any)._value;
                    const updatedAttachments = attachments.map((a) => {
                      if (a.id === att.id) {
                        return { ...a, x: finalX, y: finalY };
                      }
                      return a;
                    });
                    setAttachments(updatedAttachments);
                    triggerSave(content, mood, updatedAttachments, isLocked);
                  },
                  onPanResponderTerminate: () => {
                    anim.flattenOffset();
                    isDragging.current = false;
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                    
                    const finalX = (anim.x as any)._value;
                    const finalY = (anim.y as any)._value;
                    const updatedAttachments = attachments.map((a) => {
                      if (a.id === att.id) {
                        return { ...a, x: finalX, y: finalY };
                      }
                      return a;
                    });
                    setAttachments(updatedAttachments);
                    triggerSave(content, mood, updatedAttachments, isLocked);
                  },
                });

                return (
                  <Animated.View
                    key={att.id}
                    style={[
                      styles.attachmentItem,
                      { transform: anim.getTranslateTransform() },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    {att.type === 'image' ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setLightboxUri(att.uri)}
                      >
                        <Image source={{ uri: att.uri }} style={styles.attachmentImage} />
                      </TouchableOpacity>
                    ) : att.type === 'audio' ? (
                      <AudioPlayerAttachment uri={att.uri} name={att.name} />
                    ) : (
                      <View style={styles.attachmentDoc}>
                        <Text style={styles.attachmentDocIcon}>📄</Text>
                        <Text style={styles.attachmentDocName} numberOfLines={1}>{att.name}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeAttachmentBtn}
                      onPress={() => {
                        const newAttachments = attachments.filter(a => a.id !== att.id);
                        delete dragPositions.current[att.id];
                        setAttachments(newAttachments);
                        triggerSave(content, mood, newAttachments, isLocked);
                      }}
                    >
                      <Text style={styles.removeAttachmentText}>✕</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Recording Overlay Bar */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingLeft}>
              <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
              <Text style={styles.recordingText}>
                Recording… {formatDuration(recordingDuration)}
              </Text>
            </View>
            <View style={styles.recordingRight}>
              <TouchableOpacity
                style={styles.recordingCancelBtn}
                onPress={() => stopRecording(false)}
              >
                <Text style={styles.recordingCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordingDoneBtn}
                onPress={() => stopRecording(true)}
              >
                <Text style={styles.recordingDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: 15 }]}>
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
              {soundEnabled ? 
              <Feather name='volume-2' size={16}/>
              :
              < Feather name='volume-x' size={16}/>}
            </Text>
          </TouchableOpacity>

          {/* Lock toggle */}
          <TouchableOpacity
            style={[
              styles.soundBtn,
              isLocked && styles.soundBtnActive,
            ]}
            onPress={handleLockToggle}
            activeOpacity={0.75}
          >
            <Text style={styles.soundBtnIcon}>
              {isLocked ? 
                <Feather name='lock' size={15} /> 
              : 
                <Feather name='unlock' size={15} />
              }
            </Text>
          </TouchableOpacity>

          {/* Voice Note Button */}
          <TouchableOpacity
            style={[
              styles.soundBtn,
              isRecording && styles.soundBtnActive,
            ]}
            onPress={isRecording ? () => stopRecording(true) : startRecording}
            activeOpacity={0.75}
          >
            <Text style={styles.soundBtnIcon}>
              {isRecording ? 
                <Feather name='mic-off' size={15} /> 
              : 
                <Feather name='mic' size={15} />
              }
            </Text>
          </TouchableOpacity>

          {/* Attach button */}
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleAttach}
            activeOpacity={0.75}
          >
            <Text style={styles.attachBtnIcon}>
              <FontAwesome6 name='image' size={15}/>
            </Text>
          </TouchableOpacity>

          {/* Font picker button */}
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => setShowFontPicker(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.fontBtnLabel, { fontFamily: currentFont.bodyFont }]}>Aa</Text>
          </TouchableOpacity>

          {/* Delete */}
          {content.trim() && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>
                <MaterialIcons name="delete-outline" size={16}/>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Font picker modal */}
      <FontPicker
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
      />

      {/* Lightbox modal */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxUri(null)}
      >
        <TouchableOpacity
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setLightboxUri(null)}
        >
          <View style={styles.lightboxContainer}>
            {lightboxUri && (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setLightboxUri(null)}
            >
              <Text style={styles.lightboxCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  navbarRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  navActionBtn: {
    padding: 6,
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
    justifyContent: 'flex-end',
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
    paddingVertical: 4,
    paddingHorizontal: 10,
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
  attachBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  attachBtnIcon: {
    fontSize: 14,
  },
  attachmentsContainer: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 130,
  },
  attachmentItem: {
    position: 'relative',
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  attachmentImage: {
    width: 110,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  attachmentDoc: {
    width: 110,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  attachmentDocIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  attachmentDocName: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.text,
    textAlign: 'center',
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.danger,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bg,
    zIndex: 10,
  },
  removeAttachmentText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
    borderRadius: 0,
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: Colors.danger,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  lightboxCloseText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    borderTopWidth: 1,
    borderTopColor: Colors.accentDim + '30',
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
  },
  recordingText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  recordingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordingCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  recordingCancelText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  recordingDoneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  recordingDoneText: {
    fontFamily: Typography.bodySemibold,
    fontSize: 14,
    color: '#FFF',
  },
  titleInput: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  metadataText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
});
