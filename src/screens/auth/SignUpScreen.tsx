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

type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signUp, error, clearError, isLoading } = useAuthStore()

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address')
      return false
    }

    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name')
      return false
    }

    if (displayName.trim().length < 2) {
      Alert.alert('Validation Error', 'Display name must be at least 2 characters long')
      return false
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter a password')
      return false
    }

    if (password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long')
      return false
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      Alert.alert(
        'Weak Password', 
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
      return false
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match')
      return false
    }

    return true
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    clearError()

    try {
      const success = await signUp(
        email.trim().toLowerCase(),
        password,
        displayName.trim(),
        firstName.trim() || undefined,
        lastName.trim() || undefined
      )
      
      if (success) {
        // Redirect to profile setup if signup successful
        navigation.navigate('ProfileSetup')
      } else {
        Alert.alert('Sign Up Failed', error || 'Please check your information and try again')
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = () => {
    navigation.navigate('Login')
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
            <Text style={styles.title}>Join CellarSessions</Text>
            <Text style={styles.subtitle}>
              Create your account to start your wine education journey
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
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
              <Text style={styles.label}>Display Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="How should others see you?"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                autoCorrect={false}
                editable={!isSubmitting && !isLoading}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCorrect={false}
                  editable={!isSubmitting && !isLoading}
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCorrect={false}
                  editable={!isSubmitting && !isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Create a strong password"
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
              <Text style={styles.passwordHelp}>
                Must be 8+ characters with uppercase, lowercase, and numbers
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting && !isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting || isLoading}
                >
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.signUpButton,
                (isSubmitting || isLoading) && styles.disabledButton
              ]}
              onPress={handleSignUp}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {isSubmitting || isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.signInLink}>Sign In</Text>
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
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
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordHelp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  signUpButton: {
    height: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
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
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
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
  signInLink: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
})