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

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const { resetPassword } = useAuthStore()

  const validateEmail = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return false
    }

    return true
  }

  const handleResetPassword = async () => {
    if (!validateEmail()) return

    setIsSubmitting(true)

    try {
      const success = await resetPassword(email.trim().toLowerCase())
      
      if (success) {
        setIsEmailSent(true)
      } else {
        Alert.alert(
          'Reset Failed', 
          'Unable to send reset email. Please check if the email address is correct.'
        )
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToLogin = () => {
    navigation.goBack()
  }

  const handleResendEmail = () => {
    setIsEmailSent(false)
    handleResetPassword()
  }

  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to {email}
          </Text>
          <Text style={styles.successSubMessage}>
            Please check your email and follow the instructions to reset your password.
          </Text>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendEmail}
            disabled={isSubmitting}
          >
            <Text style={styles.resendButtonText}>
              {isSubmitting ? 'Sending...' : 'Resend Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
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
          <TouchableOpacity
            style={styles.backNavButton}
            onPress={handleBackToLogin}
          >
            <Text style={styles.backNavText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email address and we'll send you a reset link.
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
                editable={!isSubmitting}
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, isSubmitting && styles.disabledButton]}
              onPress={handleResetPassword}
              disabled={isSubmitting}
            >
              <Text style={styles.resetButtonText}>
                {isSubmitting ? 'Sending Reset Email...' : 'Send Reset Email'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity
              onPress={handleBackToLogin}
              disabled={isSubmitting}
            >
              <Text style={styles.loginLink}>Sign In</Text>
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
    paddingTop: 20,
    paddingBottom: 32,
  },
  backNavButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backNavText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
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
    marginBottom: 32,
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
  resetButton: {
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
  resetButtonText: {
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
  loginLink: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  // Success state styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  successSubMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 48,
  },
  resendButton: {
    height: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
})