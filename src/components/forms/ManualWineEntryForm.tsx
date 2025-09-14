import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WineType, WineRegion, WineStyle } from '@/types'

interface ManualWineEntryFormProps {
  onWineAdded: (wineData: WineFormData) => void
  onCancel: () => void
  initialData?: Partial<WineFormData>
}

export interface WineFormData {
  name: string
  producer: string
  vintage?: number
  wine_type: WineType
  region?: string
  country?: string
  alcohol_content?: number
  price?: number
  notes?: string
}

const WINE_TYPES: { value: WineType; label: string }[] = [
  { value: 'RED', label: 'Red Wine' },
  { value: 'WHITE', label: 'White Wine' },
  { value: 'ROSE', label: 'Rosé Wine' },
  { value: 'SPARKLING', label: 'Sparkling Wine' },
  { value: 'DESSERT', label: 'Dessert Wine' },
  { value: 'FORTIFIED', label: 'Fortified Wine' },
]

const CURRENT_YEAR = new Date().getFullYear()
const VINTAGE_YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i)

export function ManualWineEntryForm({
  onWineAdded,
  onCancel,
  initialData = {},
}: ManualWineEntryFormProps) {
  const [formData, setFormData] = useState<WineFormData>({
    name: initialData.name || '',
    producer: initialData.producer || '',
    vintage: initialData.vintage || undefined,
    wine_type: initialData.wine_type || 'RED',
    region: initialData.region || '',
    country: initialData.country || '',
    alcohol_content: initialData.alcohol_content || undefined,
    price: initialData.price || undefined,
    notes: initialData.notes || '',
  })

  const [showVintageDropdown, setShowVintageDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Wine name is required')
      return false
    }
    if (!formData.producer.trim()) {
      Alert.alert('Validation Error', 'Producer is required')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onWineAdded(formData)
    } catch (error) {
      Alert.alert('Error', 'Failed to add wine. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof WineFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Wine Manually</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Wine Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Wine Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter wine name"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Producer */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Producer *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter producer/winery name"
              placeholderTextColor="#9CA3AF"
              value={formData.producer}
              onChangeText={(value) => updateFormData('producer', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Wine Type */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Wine Type *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              disabled={isSubmitting}
            >
              <Text style={styles.dropdownText}>
                {WINE_TYPES.find(type => type.value === formData.wine_type)?.label}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {showTypeDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {WINE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        updateFormData('wine_type', type.value)
                        setShowTypeDropdown(false)
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Vintage */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vintage Year</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowVintageDropdown(!showVintageDropdown)}
              disabled={isSubmitting}
            >
              <Text style={[
                styles.dropdownText,
                !formData.vintage && styles.placeholderText
              ]}>
                {formData.vintage || 'Select vintage year (optional)'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {showVintageDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      updateFormData('vintage', undefined)
                      setShowVintageDropdown(false)
                    }}
                  >
                    <Text style={[styles.dropdownItemText, styles.clearText]}>
                      Clear vintage
                    </Text>
                  </TouchableOpacity>
                  {VINTAGE_YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={styles.dropdownItem}
                      onPress={() => {
                        updateFormData('vintage', year)
                        setShowVintageDropdown(false)
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Region */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Region</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Napa Valley, Burgundy, Rioja"
              placeholderTextColor="#9CA3AF"
              value={formData.region}
              onChangeText={(value) => updateFormData('region', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Country */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., France, Italy, USA, Australia"
              placeholderTextColor="#9CA3AF"
              value={formData.country}
              onChangeText={(value) => updateFormData('country', value)}
              editable={!isSubmitting}
            />
          </View>

          {/* Alcohol Content */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Alcohol Content (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 13.5"
              placeholderTextColor="#9CA3AF"
              value={formData.alcohol_content?.toString() || ''}
              onChangeText={(value) => {
                const numValue = parseFloat(value)
                updateFormData('alcohol_content', isNaN(numValue) ? undefined : numValue)
              }}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />
          </View>

          {/* Price */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Price ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25.99"
              placeholderTextColor="#9CA3AF"
              value={formData.price?.toString() || ''}
              onChangeText={(value) => {
                const numValue = parseFloat(value)
                updateFormData('price', isNaN(numValue) ? undefined : numValue)
              }}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />
          </View>

          {/* Notes */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes about this wine..."
              placeholderTextColor="#9CA3AF"
              value={formData.notes}
              onChangeText={(value) => updateFormData('notes', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.addButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.addButtonText}>
              {isSubmitting ? 'Adding Wine...' : 'Add Wine'}
            </Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
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
  clearText: {
    color: '#EF4444',
  },
  actions: {
    padding: 24,
    paddingTop: 16,
  },
  addButton: {
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
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})