import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = memo(() => {
  return (
    <View 
      className="flex-row justify-between items-center bg-transparent px-5 py-3 z-50"
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="HydroCue App Header"
    >
      <View className="flex-row items-center">
        {/* Droplet Logo */}
        <View 
          className="mr-2" 
          accessible={false} 
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden={true} // FIX: iOS VoiceOver support
        >
          <Ionicons name="water" size={26} color="#0284c7" />
        </View>
        
        <View className="flex-row items-end">
          <Text 
            className="text-[#041d32] font-black text-xl tracking-tight" 
            importantForAccessibility="no"
            accessibilityElementsHidden={true}
          >
            HydroCue
          </Text>
        </View>
      </View>
    </View>
  );
});

// FIX: Display name is required for debugging when using memo with anonymous function
Header.displayName = 'Header';

export default Header;
