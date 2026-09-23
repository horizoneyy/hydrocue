import '../global.css';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { type ColorValue } from 'react-native';


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

export default function Layout() {
  return (
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
      {/* Urutan Tab: Profile (kiri) -> Today (tengah) -> Alerts (kanan) */}
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
  );
}
