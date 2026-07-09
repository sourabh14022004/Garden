import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    checkHardware();
  }, []);

  const checkHardware = async () => {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasHardware(hardware);
    setIsEnrolled(enrolled);
    
    if (hardware && enrolled) {
      handleAuth();
    } else {
      // Bypass if biometric auth is not set up on device
      onUnlock();
    }
  };

  const handleAuth = async () => {
    setErrorMsg('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your Garden',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });
      
      if (result.success) {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          onUnlock();
        });
      } else {
        setErrorMsg('Authentication failed. Please try again.');
      }
    } catch (e) {
      setErrorMsg('An error occurred.');
    }
  };

  if (!hasHardware || !isEnrolled) {
    return null;
  }

  return (
    <Animated.View style={[styles.absolute, { opacity }]}>
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={56} color={Colors.accent} style={styles.lockIcon} />
        <Text style={styles.title}>Private Garden</Text>
        <Text style={styles.subtitle}>Unlock to view your reflections.</Text>
        
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        
        <TouchableOpacity style={styles.button} onPress={handleAuth} activeOpacity={0.8}>
          <Ionicons name="finger-print" size={24} color="#FFF" style={styles.icon} />
          <Text style={styles.buttonText}>Authenticate</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  absolute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // Ensure it sits on top of everything
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    paddingHorizontal: 40,
  },
  lockIcon: {
    marginBottom: 20,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 32,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.bodyMedium,
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 50,
    textAlign: 'center',
  },
  error: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    fontFamily: Typography.bodySemibold,
    color: '#FFF',
    fontSize: 16,
  },
});
