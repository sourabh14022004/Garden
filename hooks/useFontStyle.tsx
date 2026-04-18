import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FontOption {
  key: string;
  label: string;
  description: string;
  emoji: string;
  bodyFont: string;        // regular weight — for text input / previews
  bodyMediumFont: string;  // medium weight
  bodySemiboldFont: string;
  previewText: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'classic',
    label: 'Classic',
    description: 'Clean & modern',
    emoji: '✒️',
    bodyFont: 'Inter_400Regular',
    bodyMediumFont: 'Inter_500Medium',
    bodySemiboldFont: 'Inter_600SemiBold',
    previewText: 'Every day, a new seed is planted in your garden…',
  },
  {
    key: 'manuscript',
    label: 'Manuscript',
    description: 'Elegant serif',
    emoji: '📜',
    bodyFont: 'Lora_400Regular',
    bodyMediumFont: 'Lora_500Medium',
    bodySemiboldFont: 'Lora_600SemiBold',
    previewText: 'Every day, a new seed is planted in your garden…',
  },
  {
    key: 'diary',
    label: 'Diary',
    description: 'Romantic italic',
    emoji: '🌸',
    bodyFont: 'CrimsonPro_400Regular',
    bodyMediumFont: 'CrimsonPro_500Medium',
    bodySemiboldFont: 'CrimsonPro_600SemiBold',
    previewText: 'Every day, a new seed is planted in your garden…',
  },
  {
    key: 'soft',
    label: 'Soft',
    description: 'Rounded & gentle',
    emoji: '🌿',
    bodyFont: 'Nunito_400Regular',
    bodyMediumFont: 'Nunito_500Medium',
    bodySemiboldFont: 'Nunito_600SemiBold',
    previewText: 'Every day, a new seed is planted in your garden…',
  },
];

const STORAGE_KEY = '@garden:fontStyle';

interface FontContextValue {
  currentFont: FontOption;
  setFont: (key: string) => Promise<void>;
}

const FontContext = createContext<FontContextValue>({
  currentFont: FONT_OPTIONS[0],
  setFont: async () => {},
});

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [currentFont, setCurrentFont] = useState<FontOption>(FONT_OPTIONS[0]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((key) => {
      if (key) {
        const found = FONT_OPTIONS.find((f) => f.key === key);
        if (found) setCurrentFont(found);
      }
    });
  }, []);

  const setFont = async (key: string) => {
    const found = FONT_OPTIONS.find((f) => f.key === key);
    if (found) {
      setCurrentFont(found);
      await AsyncStorage.setItem(STORAGE_KEY, key);
    }
  };

  return (
    <FontContext.Provider value={{ currentFont, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFontStyle() {
  return useContext(FontContext);
}
