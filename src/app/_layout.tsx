import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import '../global.css';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { type ColorValue } from 'react-native';
import CircularProgress from '../components/CircularProgress';

// [REFACTOR: Ekstrak icon render functions ke luar komponen — mencegah re-alokasi tiap render]
// [FIX: Tipe color diperbaiki ke ColorValue — expo-router tabBarIcon mengoper OpaqueColorValue]
const renderProfileIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color as string} />
);

const renderIndexIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={focused ? 'water' : 'water-outline'} size={24} color={color as string} />
);

const renderSettingsIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color as string} />
);


const CustomSplashScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Trigger the fluid fill animation once on mount to simulate splash entry
    const timer = setTimeout(() => {
      setProgress(1.1); // Fill to 100% full before entering the app
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.splashContainer}>
      <CircularProgress progress={progress} target={100} current={0} isLogo={true} />
    </View>
  );
};

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Fill animation takes ~1.5s. Start fading out at 2.0s
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsReady(true);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0284c7',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: renderProfileIcon,
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: renderIndexIcon,
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Alerts',
            tabBarIcon: renderSettingsIcon,
          }}
        />
      </Tabs>
      {!isReady && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 999 }]}>
          <CustomSplashScreen />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
