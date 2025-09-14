import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { TastingStackParamList } from './types'
import { TastingHomeScreen } from '@/screens/tasting/TastingHomeScreen'
import { WSETTastingFormScreen } from '@/screens/WSETTastingFormScreen'
import { TastingHistoryScreen } from '@/screens/tasting/TastingHistoryScreen'
import { BlindTastingScreen } from '@/screens/tasting/BlindTastingScreen'
import { COLORS, TYPOGRAPHY } from '@/constants'

const Stack = createNativeStackNavigator<TastingStackParamList>()

export function TastingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.WHITE,
        headerTitleStyle: {
          fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
        },
        contentStyle: {
          backgroundColor: COLORS.GRAY_50
        }
      }}
    >
      <Stack.Screen 
        name="TastingHome" 
        component={TastingHomeScreen}
        options={{ title: 'Tasting Notes' }}
      />
      <Stack.Screen 
        name="WSETForm" 
        component={WSETTastingFormScreen}
        options={{
          title: 'WSET Tasting',
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="TastingHistory" 
        component={TastingHistoryScreen}
        options={{ title: 'Tasting History' }}
      />
      <Stack.Screen 
        name="BlindTasting" 
        component={BlindTastingScreen}
        options={{ title: 'Blind Tasting' }}
      />
    </Stack.Navigator>
  )
}