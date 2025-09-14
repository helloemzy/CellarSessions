import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AuthStackParamList } from './types'
import LoginScreen from '@/screens/auth/LoginScreen'
import SignUpScreen from '@/screens/auth/SignUpScreen'
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen'
import { ProfileSetupScreen } from '@/screens/auth/ProfileSetupScreen'
import { COLORS } from '@/constants'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.WHITE
        }
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignUpScreen}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
      />
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen}
      />
    </Stack.Navigator>
  )
}