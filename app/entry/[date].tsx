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
  Keyboard,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoodPicker from '../../components/MoodPicker';
import FontPicker from '../../components/FontPicker';
import ParagraphStyleModal from '../../components/ParagraphStyleModal';
import AudioPlayerAttachment from '../../components/AudioPlayerAttachment';
import { Audio } from 'expo-av';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useFontStyle } from '../../hooks/useFontStyle';
import { useAmbientSound } from '../../hooks/useAmbientSound';
import {
  getEntry,
  saveEntry,
  deleteEntry,
  countWords,
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

export interface AlignmentGroup {
  id: string;
  align: 'left' | 'center' | 'right' | 'justify';
  text: string;
}

export function parseContentToAlignmentGroups(rawContent: string): AlignmentGroup[] {
  if (!rawContent) {
    return [{ id: 'group-0', align: 'left', text: '' }];
  }

  const groups: AlignmentGroup[] = [];
  const tagRegex = /<(center|right|justify|left)>([\s\S]*?)<\/\1>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const addUntagged = (text: string) => {
    if (text) {
      if (groups.length > 0 && groups[groups.length - 1].align === 'left') {
        groups[groups.length - 1].text += text;
      } else {
        groups.push({
          id: `group-${groups.length}-${Date.now()}-${Math.random()}`,
          align: 'left',
          text: text,
        });
      }
    }
  };

  while ((match = tagRegex.exec(rawContent)) !== null) {
    const beforeText = rawContent.substring(lastIndex, match.index);
    addUntagged(beforeText);

    const alignType = match[1].toLowerCase() as 'center' | 'right' | 'justify' | 'left';
    const groupText = match[2];

    groups.push({
      id: `group-${groups.length}-${Date.now()}-${Math.random()}`,
      align: alignType,
      text: groupText,
    });

    lastIndex = tagRegex.lastIndex;
  }

  const remainingText = rawContent.substring(lastIndex);
  addUntagged(remainingText);

  if (groups.length === 0) {
    groups.push({ id: 'group-0', align: 'left', text: '' });
  }

  return groups;
}

export function serializeAlignmentGroups(groups: AlignmentGroup[]): string {
  return groups
    .map((g) => {
      if (!g.text) return '';
      if (g.align === 'left') {
        return g.text;
      }
      return `<${g.align}>${g.text}</${g.align}>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function applyAlignmentToGroup(
  groups: AlignmentGroup[],
  activeGroupId: string,
  selectionInGroup: { start: number; end: number },
  newAlign: 'left' | 'center' | 'right' | 'justify'
): { 
  updatedGroups: AlignmentGroup[]; 
  newActiveId: string; 
  relativeStart: number; 
  relativeEnd: number;
} {
  const groupIndex = groups.findIndex((g) => g.id === activeGroupId);
  if (groupIndex === -1) {
    return { 
      updatedGroups: groups, 
      newActiveId: activeGroupId, 
      relativeStart: selectionInGroup.start, 
      relativeEnd: selectionInGroup.end 
    };
  }

  const currentGroup = groups[groupIndex];
  if (currentGroup.align === newAlign) {
    return { 
      updatedGroups: groups, 
      newActiveId: activeGroupId, 
      relativeStart: selectionInGroup.start, 
      relativeEnd: selectionInGroup.end 
    };
  }

  const text = currentGroup.text;
  const selStart = Math.min(selectionInGroup.start, selectionInGroup.end);
  const selEnd = Math.max(selectionInGroup.start, selectionInGroup.end);

  const textBeforeSel = text.substring(0, selStart);
  const startLineIdx = (textBeforeSel.match(/\n/g) || []).length;

  const textBeforeEnd = text.substring(0, selEnd);
  const endLineIdx = (textBeforeEnd.match(/\n/g) || []).length;

  const lines = text.split('\n');

  const beforeLines = lines.slice(0, startLineIdx);
  const selectedLines = lines.slice(startLineIdx, endLineIdx + 1);
  const afterLines = lines.slice(endLineIdx + 1);

  const newGroupList: AlignmentGroup[] = [];
  const now = Date.now();

  const beforeText = beforeLines.join('\n');
  const beforeLength = beforeText ? beforeText.length + 1 : 0; // +1 for the newline separating beforeLines from selectedLines

  const relativeStart = Math.max(0, selectionInGroup.start - beforeLength);
  const relativeEnd = Math.max(0, selectionInGroup.end - beforeLength);

  if (beforeLines.length > 0) {
    newGroupList.push({
      id: `group-${now}-1`,
      align: currentGroup.align,
      text: beforeText,
    });
  }

  const newActiveId = `group-${now}-2`;
  newGroupList.push({
    id: newActiveId,
    align: newAlign,
    text: selectedLines.join('\n'),
  });

  if (afterLines.length > 0) {
    newGroupList.push({
      id: `group-${now}-3`,
      align: currentGroup.align,
      text: afterLines.join('\n'),
    });
  }

  const finalGroups = [
    ...groups.slice(0, groupIndex),
    ...newGroupList,
    ...groups.slice(groupIndex + 1),
  ];

  const mergedGroups: AlignmentGroup[] = [];
  let mergedActiveId = newActiveId;
  let mergedOffset = 0;

  finalGroups.forEach((g) => {
    if (mergedGroups.length > 0 && mergedGroups[mergedGroups.length - 1].align === g.align) {
      const prev = mergedGroups[mergedGroups.length - 1];
      if (g.id === newActiveId) {
        mergedActiveId = prev.id;
        mergedOffset = prev.text.length + 1; // +1 for newline
      }
      prev.text = prev.text ? `${prev.text}\n${g.text}` : g.text;
    } else {
      mergedGroups.push({ ...g });
    }
  });

  return { 
    updatedGroups: mergedGroups, 
    newActiveId: mergedActiveId, 
    relativeStart: relativeStart + mergedOffset, 
    relativeEnd: relativeEnd + mergedOffset 
  };
}

interface ParagraphInputProps {
  groupId: string;
  align: 'left' | 'center' | 'right' | 'justify';
  text: string;
  isActive: boolean;
  currentFont: any;
  indent: number;
  lineHeight: number;
  isOnly: boolean;
  selection?: { start: number; end: number };
  onFocus: (id: string, align: 'left' | 'center' | 'right' | 'justify') => void;
  onChangeText: (id: string, text: string) => void;
  onSelectionChange: (id: string, sel: { start: number; end: number }) => void;
  onKeyPress: (id: string, key: string) => void;
  inputRef?: (ref: TextInput | null) => void;
}

const ParagraphInput = React.memo(({
  groupId,
  align,
  text,
  isActive,
  currentFont,
  indent,
  lineHeight,
  isOnly,
  selection,
  onFocus,
  onChangeText,
  onSelectionChange,
  onKeyPress,
  inputRef,
}: ParagraphInputProps) => {
  const handleFocus = () => {
    onFocus(groupId, align);
  };

  const handleChangeText = (newText: string) => {
    onChangeText(groupId, newText);
  };

  const handleSelectionChange = (e: any) => {
    if (isActive) {
      onSelectionChange(groupId, e.nativeEvent.selection);
    }
  };

  const handleKeyPress = (e: any) => {
    onKeyPress(groupId, e.nativeEvent.key);
  };

  return (
    <TextInput
      ref={inputRef}
      style={[
        styles.input,
        {
          fontFamily: currentFont.bodyFont,
          textAlign: align,
          paddingLeft: indent * 20,
          lineHeight: lineHeight,
          minHeight: isOnly ? 320 : undefined,
        },
      ]}
      multiline
      placeholder={isOnly ? "What's growing in your mind today…" : undefined}
      placeholderTextColor={Colors.textFaint}
      value={text}
      selection={isActive ? selection : undefined}
      onFocus={handleFocus}
      onChangeText={handleChangeText}
      onSelectionChange={handleSelectionChange}
      onKeyPress={handleKeyPress}
      textAlignVertical="top"
      selectionColor={Colors.accent}
    />
  );
});

export default function EntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { currentFont } = useFontStyle();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, fadeIn: fadeInAmbient, fadeOut: fadeOutAmbient } = useAmbientSound();

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [folder, setFolder] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(true);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const isBookmarkedRef = useRef(false);
  const folderRef = useRef<string | undefined>(undefined);
  const moodRef = useRef(2);
  const attachmentsRef = useRef<Attachment[]>([]);
  const isLockedRef = useRef(false);
  const contentRef = useRef('');

  useEffect(() => { isBookmarkedRef.current = isBookmarked; }, [isBookmarked]);
  useEffect(() => { folderRef.current = folder; }, [folder]);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);
  useEffect(() => { contentRef.current = content; }, [content]);

  // Keyboard listener to activate edit mode on typing
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsEditing(true);
      }
    );
    return () => showSub.remove();
  }, []);

  // Undo/Redo history
  const [history, setHistory] = useState<{ title: string; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Paragraph & Text styles
  const [showParagraphStyleModal, setShowParagraphStyleModal] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [indent, setIndent] = useState(0);
  const [lineHeight, setLineHeight] = useState(30);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const selectionRef = useRef({ start: 0, end: 0 });
  useEffect(() => { selectionRef.current = selection; }, [selection]);

  // Alignment groups state for per-paragraph alignment
  const [groups, setGroups] = useState<AlignmentGroup[]>([
    { id: 'group-0', align: 'left', text: '' },
  ]);
  const groupsRef = useRef<AlignmentGroup[]>([{ id: 'group-0', align: 'left', text: '' }]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  const [activeGroupId, setActiveGroupId] = useState<string>('group-0');
  const activeGroupIdRef = useRef<string>('group-0');
  useEffect(() => { activeGroupIdRef.current = activeGroupId; }, [activeGroupId]);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

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
  const isDragging = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTyping = useRef(false);
  const skipNextTextChangeRef = useRef(false);


  const textAlignRef = useRef<'left' | 'center' | 'right' | 'justify'>('left');
  const indentRef = useRef(0);
  const lineHeightRef = useRef(30);

  useEffect(() => {
    textAlignRef.current = textAlign;
  }, [textAlign]);

  useEffect(() => {
    indentRef.current = indent;
  }, [indent]);

  useEffect(() => {
    lineHeightRef.current = lineHeight;
  }, [lineHeight]);

  // Load existing entry
  useEffect(() => {
    if (!date) return;
    getEntry(date).then((e) => {
      const loadedTitle = e?.title || '';
      const loadedContent = e?.content || '';

      if (e) {
        setTitle(loadedTitle);
        setContent(loadedContent);

        const parsedGroups = parseContentToAlignmentGroups(loadedContent);
        setGroups(parsedGroups);
        if (parsedGroups.length > 0) {
          setActiveGroupId(parsedGroups[0].id);
          setTextAlign(parsedGroups[0].align);
        }

        setMood(e.mood);
        setWordCount(e.wordCount);
        setAttachments(e.attachments || []);
        setIsLocked(!!e.isLocked);
        setIsBookmarked(!!e.isBookmarked);
        setFolder(e.folder);
        setTextAlign(e.textAlign || 'left');
        setIndent(e.indent || 0);
        setLineHeight(e.lineHeight || 30);

        if (loadedTitle.trim() || loadedContent.trim() || (e.attachments && e.attachments.length > 0)) {
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } else {
        setGroups([{ id: 'group-0', align: 'left', text: '' }]);
        setIsEditing(true);
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
    (
      text?: string,
      moodOrOverrides?: number | Partial<JournalEntry>,
      attachmentsParam?: Attachment[],
      isLockedParam?: boolean
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const textToSave = text !== undefined ? text : contentRef.current;
        const currentTitle = titleRef.current;
        
        let currentMood = moodRef.current;
        let currentAttachments = attachmentsRef.current;
        let currentIsLocked = isLockedRef.current;
        let currentIsBookmarked = isBookmarkedRef.current;
        let currentFolder = folderRef.current;

        if (typeof moodOrOverrides === 'object' && moodOrOverrides !== null) {
          if (moodOrOverrides.mood !== undefined) currentMood = moodOrOverrides.mood;
          if (moodOrOverrides.attachments !== undefined) currentAttachments = moodOrOverrides.attachments;
          if (moodOrOverrides.isLocked !== undefined) currentIsLocked = moodOrOverrides.isLocked;
          if (moodOrOverrides.isBookmarked !== undefined) currentIsBookmarked = moodOrOverrides.isBookmarked;
          if (moodOrOverrides.folder !== undefined) currentFolder = moodOrOverrides.folder;
        } else if (typeof moodOrOverrides === 'number') {
          currentMood = moodOrOverrides;
          if (attachmentsParam !== undefined) currentAttachments = attachmentsParam;
          if (isLockedParam !== undefined) currentIsLocked = isLockedParam;
        }

        const currentTextAlign = textAlignRef.current;
        const currentIndent = indentRef.current;
        const currentLineHeight = lineHeightRef.current;

        if (!textToSave.trim() && !currentTitle.trim() && currentAttachments.length === 0) {
          await deleteEntry(date!);
          return;
        }
        const wc = countWords(textToSave);
        const entry: JournalEntry = {
          date: date!,
          title: currentTitle,
          content: textToSave,
          mood: currentMood,
          wordCount: wc,
          updatedAt: new Date().toISOString(),
          attachments: currentAttachments,
          isLocked: currentIsLocked,
          isBookmarked: currentIsBookmarked,
          folder: currentFolder,
          textAlign: currentTextAlign,
          indent: currentIndent,
          lineHeight: currentLineHeight,
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
      setGroups(parseContentToAlignmentGroups(state.content));
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
      setGroups(parseContentToAlignmentGroups(state.content));
      setWordCount(countWords(state.content));
      
      setSaved(false);
      titleRef.current = state.title;
      triggerSave(state.content, mood, attachments, isLocked);
    }
  };

  const handleGroupTextChange = useCallback((groupId: string, newText: string) => {
    // If handleKeyPress already handled this backspace (prefix removal),
    // skip the stale native onChangeText that follows
    if (skipNextTextChangeRef.current) {
      skipNextTextChangeRef.current = false;
      return;
    }

    setGroups((prevGroups) => {
      const groupIndex = prevGroups.findIndex((g) => g.id === groupId);
      const currentGroup = groupIndex !== -1 ? prevGroups[groupIndex] : null;
      const oldText = currentGroup ? currentGroup.text : '';

      let finalText = newText;
      const sel = selectionRef.current;

      // Auto list continuation on Enter
      if (newText.length === oldText.length + 1 && sel.start === sel.end) {
        const idx = sel.start;
        if (newText[idx] === '\n') {
          const lastNewlineBefore = oldText.lastIndexOf('\n', idx - 1);
          const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
          const lineText = oldText.substring(lineStart, idx);

          let prefixToInsert = '';
          let isEmptyListItem = false;

          const matchBullet = lineText.match(/^(\s*•\s)/);
          const matchNumbered = lineText.match(/^(\s*(\d+)\.\s)/);
          const matchLettered = lineText.match(/^(\s*([a-zA-Z])\.\s)/);

          if (matchBullet) {
            if (lineText.trim() === '•') {
              isEmptyListItem = true;
            } else {
              prefixToInsert = '   • ';
            }
          } else if (matchNumbered) {
            const numStr = matchNumbered[2];
            if (lineText.trim() === `${numStr}.`) {
              isEmptyListItem = true;
            } else {
              const nextNum = parseInt(numStr, 10) + 1;
              prefixToInsert = `   ${nextNum}. `;
            }
          } else if (matchLettered) {
            const charStr = matchLettered[2];
            if (lineText.trim() === `${charStr}.`) {
              isEmptyListItem = true;
            } else {
              const charCode = charStr.charCodeAt(0);
              const nextChar = String.fromCharCode(charCode + 1);
              prefixToInsert = `   ${nextChar}. `;
            }
          }

          if (isEmptyListItem) {
            finalText = oldText.substring(0, lineStart) + oldText.substring(idx);
            setTimeout(() => {
              setSelection({ start: lineStart, end: lineStart });
            }, 10);
          } else if (prefixToInsert) {
            finalText = newText.substring(0, idx + 1) + prefixToInsert + newText.substring(idx + 1);
            const newCursor = idx + 1 + prefixToInsert.length;
            setTimeout(() => {
              setSelection({ start: newCursor, end: newCursor });
            }, 10);
          }
        }
      }
      // Note: Backspace list-prefix removal is handled exclusively by handleKeyPress
      // to avoid double-processing

      const updated = prevGroups.map((g) => (g.id === groupId ? { ...g, text: finalText } : g));
      const serialized = serializeAlignmentGroups(updated);
      setContent(serialized);
      setWordCount(countWords(serialized));
      setSaved(false);
      triggerSave(serialized, mood, attachments, isLocked);
      recordState(titleRef.current, serialized);
      return updated;
    });

    if (soundEnabled) {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 4000);
    }
  }, [mood, attachments, isLocked, soundEnabled]);

  const handleAlignmentChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    const { updatedGroups, newActiveId, relativeStart, relativeEnd } = applyAlignmentToGroup(
      groups,
      activeGroupId,
      selection,
      newAlign
    );
    setGroups(updatedGroups);
    setActiveGroupId(newActiveId);
    setTextAlign(newAlign);

    setTimeout(() => {
      inputRefs.current[newActiveId]?.focus();
      setSelection({ start: relativeStart, end: relativeEnd });
    }, 50);

    const serialized = serializeAlignmentGroups(updatedGroups);
    setContent(serialized);
    setWordCount(countWords(serialized));
    setSaved(false);
    triggerSave(serialized, mood, attachments, isLocked);
  };

  const handleFocus = useCallback((groupId: string, align: 'left' | 'center' | 'right' | 'justify') => {
    setActiveGroupId(groupId);
    setTextAlign(align);
    setIsEditing(true);
  }, []);

  const handleSelectionChange = useCallback((groupId: string, sel: { start: number; end: number }) => {
    setSelection(sel);
  }, []);

  const handleKeyPress = useCallback((groupId: string, key: string) => {
    const sel = selectionRef.current;
    const currentGroups = groupsRef.current;

    if (key === 'Backspace' && sel.start === sel.end) {
      const groupIndex = currentGroups.findIndex((g) => g.id === groupId);
      if (groupIndex !== -1) {
        const text = currentGroups[groupIndex].text || '';
        const selStart = sel.start;
        const textBefore = text.substring(0, selStart);
        const lineStart = textBefore.lastIndexOf('\n') === -1 ? 0 : textBefore.lastIndexOf('\n') + 1;
        const lineAfterStart = text.substring(lineStart);
        const nextNewline = lineAfterStart.indexOf('\n');
        const currentLineText = nextNewline === -1 ? lineAfterStart : lineAfterStart.substring(0, nextNewline);

        const prefixMatch = currentLineText.match(/^(\s*•\s*|\s*\d+\.\s*|\s*[a-zA-Z]\.\s*)/);
        const incompleteMatch = currentLineText.match(/^(\s*•|\s*\d+\.|\s*\d+|\s*[a-zA-Z]\.|\s*[a-zA-Z])$/);

        // Check if this is an empty list item (line is ONLY a prefix with no real content)
        // Behave identically to pressing Enter on an empty list item: strip entire prefix
        const isEmptyListItem = prefixMatch && currentLineText.trim().length <= prefixMatch[0].trim().length;

        if (isEmptyListItem && selStart >= lineStart && selStart <= lineStart + currentLineText.length) {
          // Remove the entire prefix line content, same as Enter on empty list item
          const afterLine = nextNewline === -1 ? '' : lineAfterStart.substring(nextNewline);
          const newGroupText = text.substring(0, lineStart) + afterLine;

          const updatedGroups = currentGroups.map((g, idx) =>
            idx === groupIndex ? { ...g, text: newGroupText } : g
          );

          skipNextTextChangeRef.current = true;
          setGroups(updatedGroups);
          setSelection({ start: lineStart, end: lineStart });

          const serialized = serializeAlignmentGroups(updatedGroups);
          setContent(serialized);
          setWordCount(countWords(serialized));
          setSaved(false);
          triggerSave(serialized, mood, attachments, isLocked);
          recordState(titleRef.current, serialized);
          return;
        } else if (prefixMatch && !isEmptyListItem && selStart >= lineStart && selStart <= lineStart + prefixMatch[0].length + 1) {
          const prefixLen = prefixMatch[0].length;
          const restOfLine = currentLineText.substring(prefixLen);
          const afterLine = nextNewline === -1 ? '' : lineAfterStart.substring(nextNewline);
          const newGroupText = text.substring(0, lineStart) + restOfLine + afterLine;

          const updatedGroups = currentGroups.map((g, idx) =>
            idx === groupIndex ? { ...g, text: newGroupText } : g
          );

          skipNextTextChangeRef.current = true;
          setGroups(updatedGroups);
          setSelection({ start: lineStart, end: lineStart });

          const serialized = serializeAlignmentGroups(updatedGroups);
          setContent(serialized);
          setWordCount(countWords(serialized));
          setSaved(false);
          triggerSave(serialized, mood, attachments, isLocked);
          recordState(titleRef.current, serialized);
          return;
        } else if (incompleteMatch && selStart >= lineStart && selStart <= lineStart + currentLineText.length + 1) {
          const afterLine = nextNewline === -1 ? '' : lineAfterStart.substring(nextNewline);
          const newGroupText = text.substring(0, lineStart) + afterLine;

          const updatedGroups = currentGroups.map((g, idx) =>
            idx === groupIndex ? { ...g, text: newGroupText } : g
          );

          skipNextTextChangeRef.current = true;
          setGroups(updatedGroups);
          setSelection({ start: lineStart, end: lineStart });

          const serialized = serializeAlignmentGroups(updatedGroups);
          setContent(serialized);
          setWordCount(countWords(serialized));
          setSaved(false);
          triggerSave(serialized, mood, attachments, isLocked);
          recordState(titleRef.current, serialized);
          return;
        }
      }
    }

    if (key === 'Backspace') {
      setGroups((prevGroups) => {
        const groupIndex = prevGroups.findIndex((g) => g.id === groupId);
        if (groupIndex > 0 && sel.start === 0 && sel.end === 0) {
          const currentGroup = prevGroups[groupIndex];
          const prevGroup = prevGroups[groupIndex - 1];

          const originalPrevLength = prevGroup.text.length;
          const newText = prevGroup.text ? `${prevGroup.text}\n${currentGroup.text}` : currentGroup.text;

          const updatedGroups = prevGroups
            .map((g, idx) => {
              if (idx === groupIndex - 1) {
                return { ...g, text: newText };
              }
              return g;
            })
            .filter((_, idx) => idx !== groupIndex);

          setActiveGroupId(prevGroup.id);
          setTextAlign(prevGroup.align);

          setTimeout(() => {
            inputRefs.current[prevGroup.id]?.focus();
            setSelection({ start: originalPrevLength, end: originalPrevLength });
          }, 10);

          const serialized = serializeAlignmentGroups(updatedGroups);
          setContent(serialized);
          setWordCount(countWords(serialized));
          setSaved(false);
          triggerSave(serialized, mood, attachments, isLocked);
          recordState(titleRef.current, serialized);

          return updatedGroups;
        }
        return prevGroups;
      });
    }
  }, [mood, attachments, isLocked]);


  const handleTitleChange = (text: string) => {
    setTitle(text);
    setSaved(false);
    titleRef.current = text;
    triggerSave(content, mood, attachments, isLocked);
    recordState(text, content);
  };

  // Note: handleContentChange was removed — all text editing is now handled
  // through handleGroupTextChange which operates on alignment groups.

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
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!content.trim() && !title.trim() && attachments.length === 0) {
      await deleteEntry(date!);
      router.back();
      return;
    }

    setSaving(true);
    const wc = countWords(content);
    await saveEntry({
      date: date!,
      title,
      content,
      mood,
      wordCount: wc,
      updatedAt: new Date().toISOString(),
      attachments,
      isLocked,
      isBookmarked,
      folder,
      textAlign,
      indent,
      lineHeight,
    });
    setSaving(false);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleBookmarkToggle = () => {
    const nextVal = !isBookmarked;
    setIsBookmarked(nextVal);
    isBookmarkedRef.current = nextVal;
    triggerSave(content, { isBookmarked: nextVal });
  };

  const handleShare = async () => {
    try {
      const textToShare = title ? `${title}\n\n${content}` : content;
      if (!textToShare.trim()) {
        Alert.alert('Empty Entry', 'There is no content to share.');
        return;
      }
      await Share.share({
        title: title || 'Journal Entry',
        message: textToShare,
      });
    } catch (error) {
      console.error('Error sharing entry:', error);
    }
  };

  const handleReminderToggle = () => {
    Alert.alert(
      'Journal Reminder',
      'Set a reminder for this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set Daily Reminder', 
          onPress: () => Alert.alert('Reminder Active', 'A notification reminder has been set for this note.') 
        }
      ]
    );
  };

  const handleMoveFolder = () => {
    Alert.alert(
      'Move to Folder',
      folder ? `Current folder: ${folder}` : 'Select a folder for this note:',
      [
        { text: 'Personal', onPress: () => selectFolder('Personal') },
        { text: 'Ideas', onPress: () => selectFolder('Ideas') },
        { text: 'Work', onPress: () => selectFolder('Work') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const selectFolder = (folderName: string) => {
    setFolder(folderName);
    folderRef.current = folderName;
    triggerSave(content, { folder: folderName });
    Alert.alert('Folder Updated', `Entry moved to "${folderName}".`);
  };

  const handleTagCategory = () => {
    Alert.alert(
      'Note Info',
      `Mood rating: ${mood + 1}/5\n${folder ? `Folder: ${folder}` : 'No folder assigned'}\nWord count: ${wordCount} words`,
      [{ text: 'OK' }]
    );
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

  const getActiveListType = (): 'bullet' | 'number' | 'letter' | null => {
    const currentSel = selectionRef.current;
    const currentActiveGroupId = activeGroupIdRef.current;
    const currentGroups = groupsRef.current;
    const activeGroup = currentGroups.find((g) => g.id === currentActiveGroupId) || currentGroups[0];
    if (!activeGroup || !activeGroup.text) return null;
    const text = activeGroup.text;
    const selStart = currentSel.start;
    const textBeforeSel = text.substring(0, selStart);
    const lineStart = textBeforeSel.lastIndexOf('\n') === -1 ? 0 : textBeforeSel.lastIndexOf('\n') + 1;
    const nextNewline = text.indexOf('\n', selStart);
    const lineEnd = nextNewline === -1 ? text.length : nextNewline;
    const lineText = text.substring(lineStart, lineEnd);

    if (/^\s*•\s/.test(lineText)) return 'bullet';
    if (/^\s*\d+\.\s/.test(lineText)) return 'number';
    if (/^\s*[a-zA-Z]\.\s/.test(lineText)) return 'letter';
    return null;
  };

  const onApplyList = (type: 'bullet' | 'number' | 'letter') => {
    const sel = selectionRef.current;
    const currentActiveGroupId = activeGroupIdRef.current;

    setGroups((prevGroups) => {
      const groupIndex = prevGroups.findIndex((g) => g.id === currentActiveGroupId);
      const targetIndex = groupIndex === -1 ? 0 : groupIndex;
      const currentGroup = prevGroups[targetIndex];
      if (!currentGroup) return prevGroups;

      const text = currentGroup.text || '';
      const selStart = Math.min(sel.start, sel.end);
      const selEnd = Math.max(sel.start, sel.end);

      const textBeforeStart = text.substring(0, selStart);
      const lineStartIdx = textBeforeStart.lastIndexOf('\n') === -1 ? 0 : textBeforeStart.lastIndexOf('\n') + 1;

      const textBeforeEnd = text.substring(0, selEnd);

      const lines = text.split('\n');
      const lineCountBeforeStart = (textBeforeStart.match(/\n/g) || []).length;
      const lineCountBeforeEnd = (textBeforeEnd.match(/\n/g) || []).length;

      const affectedLines = lines.slice(lineCountBeforeStart, lineCountBeforeEnd + 1);

      const isBulletPattern = (l: string) => /^\s*•\s/.test(l);
      const isNumberPattern = (l: string) => /^\s*\d+\.\s/.test(l);
      const isLetterPattern = (l: string) => /^\s*[a-zA-Z]\.\s/.test(l);

      let allHaveTargetPrefix = false;
      if (type === 'bullet') {
        allHaveTargetPrefix = affectedLines.every(isBulletPattern);
      } else if (type === 'number') {
        allHaveTargetPrefix = affectedLines.every(isNumberPattern);
      } else if (type === 'letter') {
        allHaveTargetPrefix = affectedLines.every(isLetterPattern);
      }

      const removeAnyListPrefix = (l: string) => {
        return l.replace(/^\s*(•\s|\d+\.\s|[a-zA-Z]\.\s)/, '');
      };

      // Track cumulative offset caused by prefix changes on lines before cursor
      let offsetBeforeCursorStart = 0;
      let offsetBeforeCursorEnd = 0;

      const newLines = lines.map((line, idx) => {
        if (idx >= lineCountBeforeStart && idx <= lineCountBeforeEnd) {
          if (allHaveTargetPrefix) {
            // Removing prefixes (toggle off)
            const cleaned = removeAnyListPrefix(line);
            const diff = line.length - cleaned.length;
            if (idx <= lineCountBeforeStart) offsetBeforeCursorStart += diff;
            offsetBeforeCursorEnd += diff;
            return cleaned;
          } else {
            // Adding prefixes
            const cleaned = removeAnyListPrefix(line);
            let prefix = '';
            if (type === 'bullet') {
              prefix = '   • ';
            } else if (type === 'number') {
              const num = idx - lineCountBeforeStart + 1;
              prefix = `   ${num}. `;
            } else if (type === 'letter') {
              const letterCode = 'a'.charCodeAt(0) + (idx - lineCountBeforeStart);
              const letter = String.fromCharCode(letterCode);
              prefix = `   ${letter}. `;
            }

            const newLine = prefix + cleaned;
            const diff = newLine.length - line.length;
            if (idx <= lineCountBeforeStart) offsetBeforeCursorStart += diff;
            offsetBeforeCursorEnd += diff;
            return newLine;
          }
        }
        return line;
      });

      const newSelStart = allHaveTargetPrefix
        ? Math.max(lineStartIdx, selStart - offsetBeforeCursorStart)
        : selStart + offsetBeforeCursorStart;
      const newSelEnd = allHaveTargetPrefix
        ? Math.max(0, selEnd - offsetBeforeCursorEnd)
        : selEnd + offsetBeforeCursorEnd;

      const newGroupText = newLines.join('\n');
      const updatedGroups = prevGroups.map((g, idx) =>
        idx === targetIndex ? { ...g, text: newGroupText } : g
      );

      const serialized = serializeAlignmentGroups(updatedGroups);
      setContent(serialized);
      setWordCount(countWords(serialized));
      setSaved(false);
      triggerSave(serialized, mood, attachments, isLocked);
      recordState(titleRef.current, serialized);

      setTimeout(() => {
        inputRefs.current[currentGroup.id]?.focus();
        setSelection({ start: newSelStart, end: newSelEnd });
      }, 50);

      return updatedGroups;
    });

    // Close the modal after applying
    setShowParagraphStyleModal(false);
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

          {isEditing ? (
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

              {/* Save Checkmark Button */}
              <TouchableOpacity 
                onPress={handleManualSave} 
                style={styles.navActionBtn} 
                disabled={saving}
                activeOpacity={0.7}
              >
                <Feather name="check" size={22} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.navbarRightContainer}>
              <TouchableOpacity 
                onPress={handleBookmarkToggle} 
                style={styles.navActionBtn} 
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={22} 
                  color={isBookmarked ? '#F59E0B' : Colors.accent} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { fontFamily: currentFont.bodyFont }]}
            placeholder="Title"
            placeholderTextColor={Colors.textFaint}
            value={title}
            onChangeText={handleTitleChange}
            selectionColor={Colors.accent}
          />

          {/* Metadata & Compact Mood Picker Row */}
          <MoodPicker
            selected={mood}
            onChange={handleMoodChange}
            metadataText={getMetadataText()}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Text inputs — per-paragraph alignment */}
          <View style={{ width: '100%' }}>
            {groups.map((group) => {
              const isActive = group.id === activeGroupId;
              return (
                <ParagraphInput
                  key={group.id}
                  groupId={group.id}
                  align={group.align}
                  text={group.text}
                  isActive={isActive}
                  selection={selection}
                  currentFont={currentFont}
                  indent={indent}
                  lineHeight={lineHeight}
                  isOnly={groups.length === 1}
                  onFocus={handleFocus}
                  onChangeText={handleGroupTextChange}
                  onSelectionChange={handleSelectionChange}
                  onKeyPress={handleKeyPress}
                  inputRef={(r) => {
                    inputRefs.current[group.id] = r;
                  }}
                />
              );
            })}
          </View>

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
        {isEditing ? (
          /* Writing Mode Bottom Bar (Only typing/writing tools) */
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

            {/* Paragraph Style Button */}
            <TouchableOpacity
              style={styles.soundBtn}
              onPress={() => setShowParagraphStyleModal(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.soundBtnIcon}>
                <Feather name="align-left" size={15} />
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
          </View>
        ) : (
          /* Post-Save Mode Bottom Bar (Note Management Options: Clock, Tag/Shirt, Trash, Folder, Lock, Share) */
          <View style={[styles.bottomBar, { paddingBottom: 15, justifyContent: 'space-around' }]}>
            {/* Reminder / Alarm */}
            {/* This feature is not needed right now  */}
            {/* <TouchableOpacity style={styles.savedBarBtn} onPress={handleReminderToggle} activeOpacity={0.75}>
              <Feather name="clock" size={16} color={Colors.accent} />
            </TouchableOpacity> */}

            {/* Tag / Category / Shirt */}
            {/* This feature is not needed right now  */}
            {/* <TouchableOpacity style={styles.savedBarBtn} onPress={handleTagCategory} activeOpacity={0.75}>
              <FontAwesome6 name="shirt" size={15} color={Colors.accent} />
            </TouchableOpacity> */}

            {/* Delete */}
            <TouchableOpacity style={styles.savedBarDeleteBtn} onPress={handleDelete} activeOpacity={0.75}>
              <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>

            {/* Move to Folder */} 
            {/* this feature is not needed right now  */}
            {/* <TouchableOpacity style={styles.savedBarBtn} onPress={handleMoveFolder} activeOpacity={0.75}>
              <Feather name="folder" size={16} color={Colors.accent} />
            </TouchableOpacity> */}

            {/* Lock / Unlock */}
            <TouchableOpacity
              style={[styles.savedBarBtn, isLocked && styles.soundBtnActive]}
              onPress={handleLockToggle}
              activeOpacity={0.75}
            >
              <Feather name={isLocked ? "lock" : "unlock"} size={16} color={isLocked ? Colors.accent : Colors.accent} />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.savedBarBtn} onPress={handleShare} activeOpacity={0.75}>
              <Ionicons name="share-outline" size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Font picker modal */}
      <FontPicker
        visible={showFontPicker}
        onClose={() => setShowFontPicker(false)}
      />

      {/* Paragraph Style Modal */}
      <ParagraphStyleModal
        visible={showParagraphStyleModal}
        onClose={() => setShowParagraphStyleModal(false)}
        textAlign={textAlign}
        onChangeTextAlign={handleAlignmentChange}
        onApplyList={onApplyList}
        activeListType={getActiveListType()}
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
  navEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentDim + '40',
  },
  navEditText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: Colors.accent,
  },
  savedBarBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBarDeleteBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.danger + '12',
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    paddingTop: 4,
    paddingBottom: 4,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  metadataText: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 16,
  },
});
