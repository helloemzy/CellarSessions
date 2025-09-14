import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth/authStore'
import { useNavigation } from '@react-navigation/native'
import type { AuthStackParamList } from '@/navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signIn, error, clearError, isLoading } = useAuthStore()

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address')
      return false
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return false
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password')
      return false
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long')
      return false
    }

    return true
  }

  const handleSignIn = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    clearError()

    try {
      const success = await signIn(email.trim().toLowerCase(), password)
      
      if (success) {
        // Navigation will be handled by auth state change
        // Navigation will be handled by RootNavigator based on auth state
      } else {
        Alert.alert('Sign In Failed', error || 'Please check your credentials and try again')
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword')
  }

  const handleSignUp = () => {
    navigation.navigate('Signup')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your wine tasting journey
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && !isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting && !isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || isLoading}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signInButton,
                (isSubmitting || isLoading) && styles.disabledButton
              ]}
              onPress={handleSignIn}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.signInButtonText}>
                {isSubmitting || isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  eyeText: {
    fontSize: 18,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  signInButton: {
    height: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  signUpLink: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
})