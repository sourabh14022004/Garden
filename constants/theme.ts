export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:         '#FAF8F2',   // warm cream white
  bgDeep:     '#F0EBE0',   // light beige
  surface:    '#EDE8DC',   // warm beige surface
  card:       '#FFFFFF',   // pure white cards
  cardBorder: '#DDD7C8',   // soft beige border

  // ── Brand green ──────────────────────────────────────────────
  accent:     '#3E7D52',   // rich forest green
  accentDim:  '#6BA07C',   // muted sage
  accentSoft: '#E2EFE7',   // pale mint tint
  accentGlow: 'rgba(62, 125, 82, 0.14)',

  // ── Text ─────────────────────────────────────────────────────
  text:       '#1A2C1E',   // near-black with green tint
  textMuted:  '#5A7861',   // medium sage
  textFaint:  '#9CB5A2',   // faint sage-grey

  // ── Utility ──────────────────────────────────────────────────
  white:      '#FFFFFF',
  overlay:    'rgba(26, 44, 30, 0.55)',

  // ── Moods ────────────────────────────────────────────────────
  mood0: '#C46A5A',   // 😔 sad — terracotta
  mood1: '#B8922E',   // 😐 meh — golden
  mood2: '#3E7D52',   // 🙂 okay — green
  mood3: '#4A9DBF',   // 😊 happy — sky blue
  mood4: '#9B6FD4',   // 🌟 amazing — lavender

  danger: '#C46A5A',
};

export const Typography = {
  heading:       'PlayfairDisplay_700Bold',
  headingItalic: 'PlayfairDisplay_700Bold_Italic',
  body:          'Inter_400Regular',
  bodyMedium:    'Inter_500Medium',
  bodySemibold:  'Inter_600SemiBold',
  mono:          'Inter_400Regular',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#3E7D52',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  accent: {
    shadowColor: '#3E7D52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const MOODS = [
  { emoji: '😔', label: 'Sad',     color: Colors.mood0 },
  { emoji: '😐', label: 'Meh',     color: Colors.mood1 },
  { emoji: '🙂', label: 'Okay',    color: Colors.mood2 },
  { emoji: '😊', label: 'Happy',   color: Colors.mood3 },
  { emoji: '🌟', label: 'Amazing', color: Colors.mood4 },
];
