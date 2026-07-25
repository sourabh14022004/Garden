# Project Blueprint & Tracker — Garden 🌿

> **Note for AI Code Editors (Antigravity, Cursor, Claude, Copilot):**  
> Read this document first to quickly understand the project's architecture, data models, state patterns, implemented features, and paused/pending features without needing to parse the entire codebase.

---

## 📌 Executive Summary

**Garden** is a mindful, distraction-free daily note-taking and journaling app built with **React Native** and **Expo Router**. 

### Core Concept
Instead of just logging text, Garden gamifies self-reflection. Every journal entry written plants a "seed" that blossoms into a unique virtual flower/plant in a growing garden field. 

---

## 📂 Project Structure & Component Map

```
Garden/
├── app/                        # Expo Router Pages & Screen Controllers
│   ├── _layout.tsx             # Root layout & Navigation Stack configuration
│   ├── index.tsx               # Home screen (Date selector, seed prompt, entry preview)
│   ├── garden.tsx              # Virtual Garden view (Yearly plant field visualization)
│   ├── history.tsx             # Journal History (Search, filters, bookmark view)
│   ├── profile.tsx             # Gardener Profile & Settings (Stats, Ambient sound, Security)
│   └── entry/[date].tsx        # Core Mindful Note Editor ([date] = YYYY-MM-DD)
│
├── components/                 # Reusable UI Components & Modals
│   ├── CalendarStrip.tsx       # Date navigator & "Plant today's seed" header card
│   ├── EntryCard.tsx           # Home & History list item card preview
│   ├── FontPicker.tsx          # Custom typography selector bottom sheet
│   ├── MoodPicker.tsx          # Inline & collapsible mood selector pill
│   ├── ParagraphStyleModal.tsx # Text alignment & List formatting modal
│   ├── AudioPlayerAttachment.tsx # Voice note player component
│   └── SettingsModal.tsx       # Ambient sound volume & preference controls
│
├── hooks/                      # Custom React Hooks & Data Layer
│   ├── useJournal.ts           # Storage service (AsyncStorage CRUD, word count, date helpers)
│   ├── useFontStyle.ts         # Typography theme context & persistent font preferences
│   └── useAmbientSound.ts      # Audio loop manager (Rainforest ambience with auto fade-in/out)
│
├── constants/                  # Design Tokens & Theme Assets
│   ├── theme.ts                # Colors, Radius, Spacing, Typography tokens
│   └── plants.ts               # Plant image assets mapping & generation logic
│
└── assets/                     # Media & Image Assets
    ├── screenshots/            # App screenshots for README & docs
    ├── output_colored_plants/  # Visual plant graphics for the garden
    └── Audio/                  # Ambient sound audio files (.mp3)
```

---

## 🗄 Data Models & Storage Schema

All app data is persisted locally via `@react-native-async-storage/async-storage`.

### 1. `JournalEntry` Model (`hooks/useJournal.ts`)
```typescript
export interface Attachment {
  id: string;
  uri: string;
  type: 'image' | 'audio' | 'document';
  name: string;
  x?: number; // Draggable X coordinate
  y?: number; // Draggable Y coordinate
}

export interface JournalEntry {
  date: string;          // Format: 'YYYY-MM-DD' (Primary Key)
  title: string;
  content: string;        // Serialized text with optional alignment tags
  mood: number;           // Index 0 to 4 (Sad, Meh, Okay, Happy, Amazing)
  wordCount: number;
  updatedAt: string;      // ISO string timestamp
  attachments?: Attachment[];
  isLocked?: boolean;     // Biometric protection per entry
  isBookmarked?: boolean; // Bookmark toggle flag
  folder?: string;        // Assigned folder name (e.g., 'Personal', 'Ideas', 'Work')
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
  lineHeight?: number;
}
```

### 2. Primary AsyncStorage Keys
- `@journal_entries_v2`: Serialized array of `JournalEntry[]`
- `@garden_font_family`: Selected body font ID (`crimson`, `inter`, `lora`, `nunito`, `playfair`)
- `@garden_ambient_sound`: Ambient sound toggle (`'true'` | `'false'`)
- `@garden_app_lock`: Master biometric security toggle (`'true'` | `'false'`)

---

## ✅ Implemented Features (Completed)

### 1. Mindful Note Editor (`app/entry/[date].tsx`)
- **Per-Paragraph Text Alignment**: Supports `left`, `center`, `right`, and `justify` alignment per paragraph block via alignment groups.
- **Per-Paragraph Alignment Tags**: Automatically serializes/deserializes alignment blocks using standard tags: `<center>...</center>`, `<right>...</right>`, `<justify>...</justify>`, and untagged for left.
- **Smart List Formatting**:
  - **Bulleted (`•`)**, **Numbered (`1.`)**, and **Lettered (`a.`)** list options in `ParagraphStyleModal`.
  - **Auto-Continuation**: Pressing `Enter` automatically increments/continues list prefixes (`2.`, `3.` or `b.`, `c.`).
  - **Auto-Termination**: Pressing `Enter` or `Backspace` on an empty list item strips the prefix and resets to normal text position.
- **Typography Switcher**: Supports 5 Google fonts (*Crimson Pro*, *Inter*, *Lora*, *Nunito*, *Playfair Display*) via `FontPicker.tsx`.
- **Ambient Sound Integration**: Calming nature soundscapes (`useAmbientSound`) that automatically fade in while typing and fade out when paused.
- **Voice Recording & Playback**: Record voice memos directly into the entry with custom UI controls (`AudioPlayerAttachment`).
- **Draggable Photo Attachments**: Attach photos from library (`expo-image-picker`), drag them freely on canvas (`PanResponder`), and view full-screen via Lightbox.
- **Undo / Redo History**: History stack tracking title and content edits for instant undo (`Octicons undo`) and redo (`Octicons redo`).
- **Auto-Save & Manual Save**: Debounced auto-save (800ms) with a manual checkmark save button.
- **Biometric Security**: Lock/unlock individual entries using device biometrics (`expo-local-authentication`).

### 2. Home Screen (`app/index.tsx`)
- **Interactive Calendar Strip**: Horizontal date strip for quick day switching.
- **Dynamic Seed Prompt**: "Plant today's seed" empty state with cute flower illustration when no entry exists for the selected date.
- **Entry Card Preview**: Displays mood badge, word count, character count, and formatted excerpt.

### 3. Virtual Garden (`app/garden.tsx`)
- **Visual Plant Grid**: Every entry grows a unique flower/plant graphic.
- **Yearly Filtering**: Filter plants by year (e.g., 2026).
- **Interactive Tap**: Tap any plant in the garden grid to open that date's journal entry.

### 4. History Screen (`app/history.tsx`)
- Search entries by title or text content.
- Filter by Bookmarked entries (`isBookmarked`).

### 5. Gardener Profile & Settings (`app/profile.tsx`)
- **User Stats**: Displays total entry count, total words written, and daily streak counter.
- **Ambient Sound Settings**: Master toggle & volume slider (`SettingsModal.tsx`).
- **Biometric Lock Settings**: Enable/disable biometric app protection.

---

## ⏸️ Commented-Out & Pending Features (Roadmap)

The following features have partial backend logic implemented in `[date].tsx`, but the UI controls are currently commented out in the post-save bottom bar (lines 1625–1648 of `[date].tsx`):

### 1. Journal Reminders & Alarms ⏰
- **Status**: Paused / Commented out (`handleReminderToggle`)
- **Location**: `app/entry/[date].tsx` (lines 1090-1102 & 1628-1631)
- **Description**: Allows users to set daily local notifications to remind them to log their thoughts.

### 2. Entry Categories & Tagging 🏷️
- **Status**: Paused / Commented out (`handleTagCategory`)
- **Location**: `app/entry/[date].tsx` (lines 1124-1130 & 1634-1637)
- **Description**: Provides entry metadata overview and allows categorizing notes with tags/icons.

### 3. Folder Organization 📁
- **Status**: Paused / Commented out (`handleMoveFolder` & `selectFolder`)
- **Location**: `app/entry/[date].tsx` (lines 1104-1122 & 1644-1648)
- **Description**: Organize notes into custom folders (`Personal`, `Ideas`, `Work`).  
  *Note: The `folder?: string` property is already fully supported in the `JournalEntry` data model!*

---

## 🔑 Key Engineering Conventions for AI Code Editors

1. **Avoid Stale Closures on Inputs**:
   - `[date].tsx` uses `selectionRef`, `groupsRef`, and `activeGroupIdRef` alongside state.
   - When modifying text handlers (`handleGroupTextChange`, `handleKeyPress`, `onApplyList`), always reference the `ref.current` values to prevent stale closure bugs during rapid keyboard input.
2. **Text Change Race Condition Prevention**:
   - `skipNextTextChangeRef` is set by `handleKeyPress` whenever Backspace modifies list prefixes so that the subsequent native `onChangeText` event does not overwrite the updated state.
3. **Styling & Design System**:
   - Always use design tokens from `constants/theme.ts` (`Colors`, `Radius`, `Spacing`, `Typography`).
   - Do NOT introduce inline arbitrary colors unless matching existing theme constants.
