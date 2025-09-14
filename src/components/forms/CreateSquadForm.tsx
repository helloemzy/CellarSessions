import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native'
import { SquadsService } from '@/services/api/squadsService'

interface CreateSquadRequest {
  name: string
  description?: string
  privacy_level: 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC'
}

interface CreateSquadFormProps {
  onSuccess?: (squadId: string) => void
  onCancel?: () => void
}

export function CreateSquadForm({ onSuccess, onCancel }: CreateSquadFormProps) {
  const [formData, setFormData] = useState<CreateSquadRequest>({
    name: '',
    description: '',
    privacy_level: 'PUBLIC',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateSquadRequest, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateSquadRequest, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Squad name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Squad name must be at least 3 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Squad name must be less than 50 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const { squad, error } = await SquadsService.createSquad({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        privacy_level: formData.privacy_level,
      })

      if (error) {
        Alert.alert('Error', `Failed to create squad: ${error}`)
        return
      }

      if (squad) {
        Alert.alert('Success', 'Squad created successfully!', [
          { text: 'OK', onPress: () => onSuccess?.(squad.id) }
        ])
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create squad. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateSquadRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.title}>Create New Squad</Text>
        <Text style={styles.subtitle}>
          Build your wine community by creating a squad for your classmates and fellow wine enthusiasts
        </Text>

        {/* Squad Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Squad Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Enter squad name (e.g., WSET Level 3 Class of 2024)"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          <Text style={styles.characterCount}>{formData.name.length}/50</Text>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            placeholder="Describe your squad's focus, wine interests, or group goals..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.characterCount}>{(formData.description || '').length}/500</Text>
        </View>

        {/* Privacy Setting */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.label}>Private Squad</Text>
              <Text style={styles.switchDescription}>
                {formData.privacy_level === 'PRIVATE' 
                  ? 'Only invited members can join' 
                  : 'Anyone can discover and join this squad'
                }
              </Text>
            </View>
            <Switch
              value={formData.privacy_level === 'PRIVATE'}
              onValueChange={(value) => handleInputChange('privacy_level', value ? 'PRIVATE' : 'PUBLIC')}
              trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
              thumbColor={formData.privacy_level === 'PRIVATE' ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Privacy Explanation */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🍷 <Text style={styles.infoBold}>Public squads</Text> help you connect with new wine lovers who share your interests.
          </Text>
          <Text style={styles.infoText}>
            🔒 <Text style={styles.infoBold}>Private squads</Text> are perfect for your wine school classmates or close wine friends.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {onCancel && (
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.createButton, loading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            <Text style={[styles.createButtonText, loading && styles.disabledButtonText]}>
              {loading ? 'Creating...' : 'Create Squad'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  form: {
    padding: 20,
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
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: '#7C3AED',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButtonText: {
    color: '#F3F4F6',
  },
})