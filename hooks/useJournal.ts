import AsyncStorage from '@react-native-async-storage/async-storage';

export interface JournalEntry {
  date: string;      // "YYYY-MM-DD"
  content: string;
  mood: number;      // 0–4
  wordCount: number;
  updatedAt: string; // ISO timestamp
}

const STORAGE_KEY = '@garden:entries';

// ─── helpers ───────────────────────────────────────────────────────────────

async function getAllMap(): Promise<Record<string, JournalEntry>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveMap(map: Record<string, JournalEntry>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return formatDate(new Date());
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function friendlyDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (formatDate(d) === formatDate(today)) return 'Today';
  if (formatDate(d) === formatDate(yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function shortFriendlyDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (formatDate(d) === formatDate(today)) return 'Today';
  if (formatDate(d) === formatDate(yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function getEntry(date: string): Promise<JournalEntry | null> {
  const map = await getAllMap();
  return map[date] ?? null;
}

export async function saveEntry(entry: JournalEntry): Promise<void> {
  const map = await getAllMap();
  map[entry.date] = { ...entry, updatedAt: new Date().toISOString() };
  await saveMap(map);
}

export async function deleteEntry(date: string): Promise<void> {
  const map = await getAllMap();
  delete map[date];
  await saveMap(map);
}

export async function getAllEntries(): Promise<JournalEntry[]> {
  const map = await getAllMap();
  return Object.values(map).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function hasEntry(date: string): Promise<boolean> {
  const map = await getAllMap();
  return !!map[date]?.content?.trim();
}

export async function getDatesWithEntries(): Promise<Set<string>> {
  const map = await getAllMap();
  const dates = Object.entries(map)
    .filter(([, e]) => e.content?.trim())
    .map(([date]) => date);
  return new Set(dates);
}
