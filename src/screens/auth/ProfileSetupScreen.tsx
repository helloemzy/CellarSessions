import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth/authStore'
import { useNavigation } from '@react-navigation/native'
import type { AuthStackParamList } from '@/navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type ProfileSetupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProfileSetup'>
import { WineEducationBackground } from '@/types'

interface WineEducationOption {
  value: WineEducationBackground
  label: string
  description: string
}

const WINE_EDUCATION_OPTIONS: WineEducationOption[] = [
  {
    value: 'WSET',
    label: 'WSET (Wine & Spirit Education Trust)',
    description: 'Level 1-4 certifications in wine and spirits'
  },
  {
    value: 'CMS',
    label: 'CMS (Court of Master Sommeliers)',
    description: 'Introductory to Master Sommelier levels'
  },
  {
    value: 'ISG',
    label: 'ISG (International Sommelier Guild)',
    description: 'Professional sommelier certification'
  },
  {
    value: 'OTHER',
    label: 'Other Wine Education',
    description: 'Other formal wine education or certifications'
  },
  {
    value: 'NONE',
    label: 'Wine Enthusiast',
    description: 'Self-taught or casual wine lover'
  }
]

const GRADUATION_YEARS = Array.from({ length: 30 }, (_, i) => {
  const year = new Date().getFullYear() - i
  return year
})

export default function ProfileSetupScreen() {
  const navigation = useNavigation<ProfileSetupScreenNavigationProp>()
  const [selectedEducation, setSelectedEducation] = useState<WineEducationBackground | null>(null)
  const [graduationClass, setGraduationClass] = useState('')
  const [graduationYear, setGraduationYear] = useState<number | null>(null)
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGraduationYears, setShowGraduationYears] = useState(false)

  const { updateProfile, isLoading } = useAuthStore()

  const handleSkip = () => {
    // Navigation will be handled by RootNavigator based on auth state
  }

  const handleComplete = async () => {
    if (!selectedEducation) {
      Alert.alert('Profile Setup', 'Please select your wine education background')
      return
    }

    setIsSubmitting(true)

    try {
      const profileData = {
        wine_education_background: selectedEducation,
        graduation_class: graduationClass.trim() || null,
        graduation_year: graduationYear,
        location: location.trim() || null,
        bio: bio.trim() || null,
      }

      const success = await updateProfile(profileData)
      
      if (success) {
        Alert.alert(
          'Welcome to CellarSessions!',
          'Your profile has been set up successfully. Let\'s start exploring wines together!',
          [
            {
              text: 'Get Started',
              onPress: () => {/* Navigation will be handled by RootNavigator */},
            }
          ]
        )
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.')
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderEducationOption = (option: WineEducationOption) => {
    const isSelected = selectedEducation === option.value
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[styles.optionCard, isSelected && styles.selectedOption]}
        onPress={() => setSelectedEducation(option.value)}
        disabled={isSubmitting || isLoading}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <Text style={[styles.optionLabel, isSelected && styles.selectedOptionLabel]}>
              {option.label}
            </Text>
            <View style={[styles.radioButton, isSelected && styles.selectedRadio]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
          <Text style={[styles.optionDescription, isSelected && styles.selectedDescription]}>
            {option.description}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const showsAdditionalFields = selectedEducation && selectedEducation !== 'NONE'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Help us personalize your wine tasting experience
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wine Education Background</Text>
          <Text style={styles.sectionDescription}>
            Select your wine education background to connect with fellow wine enthusiasts
          </Text>
          
          <View style={styles.optionsContainer}>
            {WINE_EDUCATION_OPTIONS.map(renderEducationOption)}
          </View>
        </View>

        {showsAdditionalFields && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            
            {selectedEducation !== 'OTHER' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Graduation Class (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`e.g., Level 2, Certified Sommelier`}
                  placeholderTextColor="#9CA3AF"
                  value={graduationClass}
                  onChangeText={setGraduationClass}
                  editable={!isSubmitting && !isLoading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Graduation Year (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowGraduationYears(!showGraduationYears)}
                disabled={isSubmitting || isLoading}
              >
                <Text style={[
                  styles.dropdownText,
                  !graduationYear && styles.placeholderText
                ]}>
                  {graduationYear || 'Select year'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {showGraduationYears && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {GRADUATION_YEARS.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setGraduationYear(year)
                          setShowGraduationYears(false)
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{year}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="City, Country"
              placeholderTextColor="#9CA3AF"
              value={location}
              onChangeText={setLocation}
              editable={!isSubmitting && !isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your wine journey..."
              placeholderTextColor="#9CA3AF"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting && !isLoading}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSubmitting || isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              (isSubmitting || isLoading || !selectedEducation) && styles.disabledButton
            ]}
            onPress={handleComplete}
            disabled={isSubmitting || isLoading || !selectedEducation}
          >
            <Text style={styles.completeButtonText}>
              {isSubmitting || isLoading ? 'Setting up...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3F4F6',
  },
  optionContent: {
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  selectedOptionLabel: {
    color: '#7C3AED',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  selectedDescription: {
    color: '#374151',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: '#7C3AED',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
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
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  dropdownButton: {
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdown: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  skipButton: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  completeButton: {
    flex: 1,
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
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})