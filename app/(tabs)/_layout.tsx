// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      {/* Existing tabs */}

<Tabs.Screen
  name="index"
  options={{
    title: 'Flashcards',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>

      {/* NEW: BlockBlast tab */}
      <Tabs.Screen
        name="explore" // matches the filename blockblast.tsx
        options={{
          title: 'Games',
          // You can change "gamecontroller.fill" to any SF Symbol you prefer
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gamecontroller.fill" color={color} />,
        }}
      />

    </Tabs>
    
  );
}
