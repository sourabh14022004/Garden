import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
} from '@expo-google-fonts/nunito';
import {
  CrimsonPro_400Regular,
  CrimsonPro_500Medium,
  CrimsonPro_600SemiBold,
} from '@expo-google-fonts/crimson-pro';
import { View, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LockScreen from '../components/LockScreen';
import { Colors } from '../constants/theme';
import { FontProvider } from '../hooks/useFontStyle';
import { AmbientSoundProvider } from '../hooks/useAmbientSound';

export default function RootLayout() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    CrimsonPro_400Regular,
    CrimsonPro_500Medium,
    CrimsonPro_600SemiBold,
  });

  useEffect(() => {
    async function loadAppLockSetting() {
      try {
        const val = await AsyncStorage.getItem('@garden:app_lock');
        if (val === 'true') {
          setIsUnlocked(false);
        } else {
          setIsUnlocked(true);
        }
      } catch {
        setIsUnlocked(true);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadAppLockSetting();
  }, []);

  if (!fontsLoaded || loadingSettings) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
      <FontProvider>
        <AmbientSoundProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FAF8F2' },
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="profile"
              options={{ animation: 'slide_from_left' }}
            />
            <Stack.Screen name="history" />
            <Stack.Screen name="garden" />
            <Stack.Screen
              name="entry/[date]"
              options={{ animation: 'slide_from_bottom' }}
            />
          </Stack>
          {!isUnlocked && <LockScreen onUnlock={() => setIsUnlocked(true)} />}
        </AmbientSoundProvider>
      </FontProvider>
  );
}
