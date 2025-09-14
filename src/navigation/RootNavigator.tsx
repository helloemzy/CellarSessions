import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from './types'
import { AuthNavigator } from './AuthNavigator'
import { MainTabNavigator } from './MainTabNavigator'
import { OnboardingScreen } from '@/screens/OnboardingScreen'
import { WSETTastingFormScreen } from '@/screens/WSETTastingFormScreen'
import { WineDetailScreen } from '@/screens/WineDetailScreen'
import { CameraCaptureScreen } from '@/screens/CameraCaptureScreen'
import { ManualWineEntryScreen } from '@/screens/wines/ManualWineEntryScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { useAuth } from '@/stores/auth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { COLORS } from '@/constants'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { user, loading, hasCompletedOnboarding } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: COLORS.WHITE
          }
        }}
      >
        {!hasCompletedOnboarding ? (
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen} 
          />
        ) : !user ? (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthNavigator} 
          />
        ) : (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator} 
            />
            <Stack.Screen 
              name="WSETForm" 
              component={WSETTastingFormScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'WSET Tasting Form',
                headerStyle: {
                  backgroundColor: COLORS.PRIMARY,
                },
                headerTintColor: COLORS.WHITE,
              }}
            />
            <Stack.Screen 
              name="WineDetail" 
              component={WineDetailScreen}
              options={{
                headerShown: true,
                title: 'Wine Details',
                headerStyle: {
                  backgroundColor: COLORS.PRIMARY,
                },
                headerTintColor: COLORS.WHITE,
              }}
            />
            <Stack.Screen 
              name="CameraCapture" 
              component={CameraCaptureScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Capture Image',
                headerStyle: {
                  backgroundColor: COLORS.PRIMARY,
                },
                headerTintColor: COLORS.WHITE,
              }}
            />
            <Stack.Screen 
              name="ManualWineEntry" 
              component={ManualWineEntryScreen}
              options={{
                headerShown: true,
                title: 'Add Wine Manually',
                headerStyle: {
                  backgroundColor: COLORS.PRIMARY,
                },
                headerTintColor: COLORS.WHITE,
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                headerStyle: {
                  backgroundColor: COLORS.PRIMARY,
                },
                headerTintColor: COLORS.WHITE,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}