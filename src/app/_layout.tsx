import '../global.css';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  "ScrollView doesn't take rejection well - scrolls anyway",
]);

// Extracted render functions to prevent inline allocation on every frame/re-render
const renderIndexIcon = ({ color, focused }: { color: any, focused: boolean }) => (
  <Ionicons name={focused ? 'water' : 'water-outline'} size={24} color={color} />
);

const renderProfileIcon = ({ color, focused }: { color: any, focused: boolean }) => (
  <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
);

const renderSettingsIcon = ({ color, focused }: { color: any, focused: boolean }) => (
  <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
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
      }}>
      
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
