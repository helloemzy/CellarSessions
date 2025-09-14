import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { MainTabParamList } from './types'
import { TastingNavigator } from './TastingNavigator'
import { HomeScreen } from '@/screens/HomeScreen'
import { CellarScreen } from '@/screens/CellarScreen'
import { SocialScreen } from '@/screens/SocialScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { COLORS, TYPOGRAPHY } from '@/constants'

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Cellar') {
            iconName = focused ? 'wine' : 'wine-outline'
          } else if (route.name === 'Tasting') {
            iconName = focused ? 'restaurant' : 'restaurant-outline'
          } else if (route.name === 'Social') {
            iconName = focused ? 'people' : 'people-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          } else {
            iconName = 'circle'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.GRAY_400,
        tabBarStyle: {
          backgroundColor: COLORS.WHITE,
          borderTopColor: COLORS.GRAY_100,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cellar" component={CellarScreen} />
      <Tab.Screen name="Tasting" component={TastingNavigator} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}