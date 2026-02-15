import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="deliveryroutes"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarIconStyle: { marginBottom: 0 },
        tabBarLabelStyle: { textAlign: "center" },
      }}
    >
      <Tabs.Screen
        name="createroutes"
        options={{
          title: "Opret rute",
          tabBarButton: () => null,
          tabBarItemStyle: { flex: 0, width: 0, overflow: "hidden" },
        }}
      />
      <Tabs.Screen
        name="deliveryroutes"
        options={{
          title: "Leveringsruter",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
          tabBarItemStyle: { flex: 1 },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Kort",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          tabBarItemStyle: { flex: 1 },
        }}
      />
    </Tabs>
  );
}
