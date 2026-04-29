import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Storage keys ─────────────────────────────────────────────────────────────
const ENABLED_KEY = '@garden:ambientEnabled';
const VOLUME_KEY = '@garden:ambientVolume';

// ── Context types ────────────────────────────────────────────────────────────
interface AmbientSoundContextValue {
  /** Whether the ambient sound feature is enabled by the user */
  enabled: boolean;
  setEnabled: (v: boolean) => Promise<void>;
  /** Volume 0–1 */
  volume: number;
  setVolume: (v: number) => Promise<void>;
  /** Start playing (loops). Respects `enabled`. */
  play: () => Promise<void>;
  /** Pause playback */
  pause: () => Promise<void>;
  /** Fade in playback */
  fadeIn: () => Promise<void>;
  /** Fade out and pause */
  fadeOut: () => Promise<void>;
  /** True while the sound is actively playing */
  isPlaying: boolean;
}

const AmbientSoundContext = createContext<AmbientSoundContextValue>({
  enabled: true,
  setEnabled: async () => {},
  volume: 0.5,
  setVolume: async () => {},
  play: async () => {},
  pause: async () => {},
  fadeIn: async () => {},
  fadeOut: async () => {},
  isPlaying: false,
});

// ── Provider ─────────────────────────────────────────────────────────────────
export function AmbientSoundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, _setEnabled] = useState(true);
  const [volume, _setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadedRef = useRef(false);
  const fadeRef = useRef<NodeJS.Timeout | null>(null);

  // Restore persisted prefs on mount
  useEffect(() => {
    (async () => {
      const [storedEnabled, storedVolume] = await Promise.all([
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(VOLUME_KEY),
      ]);
      if (storedEnabled !== null) _setEnabled(storedEnabled === 'true');
      if (storedVolume !== null) _setVolume(parseFloat(storedVolume));
    })();

    // Cleanup on unmount
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Load the sound object lazily (only once)
  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current && soundRef.current) return soundRef.current;

    // Configure audio mode for background-compatible playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/Audio/freesound_community-rainforest-33441.mp3'),
      {
        isLooping: true,
        volume: volume,
        shouldPlay: false,
      }
    );
    soundRef.current = sound;
    loadedRef.current = true;
    return sound;
  }, []); // volume is set separately via setVolumeAsync

  // ── Public API ─────────────────────────────────────────────────────────────

  const setEnabled = useCallback(
    async (v: boolean) => {
      _setEnabled(v);
      await AsyncStorage.setItem(ENABLED_KEY, String(v));
      if (!v && soundRef.current) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    },
    []
  );

  const setVolume = useCallback(
    async (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      _setVolume(clamped);
      await AsyncStorage.setItem(VOLUME_KEY, String(clamped));
      if (soundRef.current) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        await soundRef.current.setVolumeAsync(clamped);
      }
    },
    []
  );

  const play = useCallback(async () => {
    if (!enabled) return;
    try {
      if (fadeRef.current) clearInterval(fadeRef.current);
      const sound = await ensureLoaded();
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
      setIsPlaying(true);
    } catch (e) {
      console.warn('[AmbientSound] play error', e);
    }
  }, [enabled, volume, ensureLoaded]);

  const pause = useCallback(async () => {
    try {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (e) {
      console.warn('[AmbientSound] pause error', e);
    }
  }, []);

  const fadeIn = useCallback(async () => {
    if (!enabled) return;
    try {
      const sound = await ensureLoaded();
      if (fadeRef.current) clearInterval(fadeRef.current);
      
      let currentVol = 0;
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      setIsPlaying(true);

      const targetVol = volume;
      const steps = 20;
      const stepVol = targetVol / steps;
      
      fadeRef.current = setInterval(async () => {
        currentVol += stepVol;
        if (currentVol >= targetVol) {
          currentVol = targetVol;
          if (fadeRef.current) clearInterval(fadeRef.current);
        }
        await sound.setVolumeAsync(currentVol);
      }, 50);
    } catch (e) {
      console.warn('[AmbientSound] fadeIn error', e);
    }
  }, [enabled, volume, ensureLoaded]);

  const fadeOut = useCallback(async () => {
    try {
      if (soundRef.current) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        const sound = soundRef.current;
        
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        
        let currentVol = status.volume || volume;
        const steps = 20;
        const stepVol = currentVol / steps;
        
        fadeRef.current = setInterval(async () => {
          currentVol -= stepVol;
          if (currentVol <= 0) {
            currentVol = 0;
            if (fadeRef.current) clearInterval(fadeRef.current);
            await sound.pauseAsync();
            setIsPlaying(false);
          }
          await sound.setVolumeAsync(Math.max(0, currentVol));
        }, 50);
      }
    } catch (e) {
      console.warn('[AmbientSound] fadeOut error', e);
    }
  }, [volume]);

  return (
    <AmbientSoundContext.Provider
      value={{
        enabled,
        setEnabled,
        volume,
        setVolume,
        play,
        pause,
        fadeIn,
        fadeOut,
        isPlaying,
      }}
    >
      {children}
    </AmbientSoundContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAmbientSound() {
  return useContext(AmbientSoundContext);
}
