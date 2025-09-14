import React from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Switch
} from 'react-native'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { WineSelector } from './WineSelector'
import { WSETAppearanceSection } from './WSETAppearanceSection'
import { WSETNoseSection } from './WSETNoseSection'
import { WSETPalateSection } from './WSETPalateSection'
import { WSETConclusionSection } from './WSETConclusionSection'
import { SegmentedSelector } from '@/components/ui/SegmentedSelector'
import { TastingNotesService } from '@/services/api/tastingNotesService'
import { WineWithStats } from '@/services/api/winesService'
import { WSETTastingFormData, WSETTastingFormSchema, FORM_SECTIONS, validateFormSection } from '@/types/wsetForm'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants'

interface WSETTastingFormProps {
  onSubmit?: (data: WSETTastingFormData) => void
  onSave?: (data: WSETTastingFormData) => void
  initialData?: Partial<WSETTastingFormData>
  onClose?: () => void
}

export function WSETTastingForm({ 
  onSubmit, 
  onSave, 
  initialData,
  onClose 
}: WSETTastingFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0)
  const [selectedWine, setSelectedWine] = React.useState<WineWithStats | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const methods = useForm<WSETTastingFormData>({
    resolver: zodResolver(WSETTastingFormSchema),
    defaultValues: {
      tastingDate: new Date().toISOString().split('T')[0],
      visibility: 'PRIVATE',
      isBlindTasting: false,
      appearance: {
        intensity: 3,
        color: '',
        rimVariation: false,
        clarity: 'Clear',
      },
      nose: {
        intensity: 3,
        aromaCharacteristics: [],
        development: 'Developing',
      },
      palate: {
        sweetness: 2,
        acidity: 3,
        tannin: 3,
        alcohol: 3,
        body: 'Medium',
        flavorIntensity: 3,
        flavorCharacteristics: [],
        finish: 'Medium',
      },
      conclusion: {
        qualityLevel: 3,
        readiness: 'Drink now',
      },
      rating: 3,
      wouldBuyAgain: false,
      foodPairingSuggestions: [],
      ...initialData,
    },
    mode: 'onChange',
  })

  const { handleSubmit, formState: { errors, isValid }, watch, reset } = methods

  const currentSection = FORM_SECTIONS[currentSectionIndex]
  const watchedWineId = watch('wineId')

  const canProceedToNext = () => {
    const currentData = methods.getValues()
    const validation = validateFormSection(currentSection.id, currentData)
    return validation.isValid
  }

  const handleNext = () => {
    if (currentSectionIndex < FORM_SECTIONS.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1)
    }
  }

  const handleFormSubmit = async (data: WSETTastingFormData) => {
    setIsSubmitting(true)
    try {
      // Transform data to match database schema
      const tastingNoteData = {
        wine_id: data.wineId,
        visibility: data.visibility,
        is_blind_tasting: data.isBlindTasting,
        tasting_date: data.tastingDate,
        location: data.location,
        occasion: data.occasion,
        
        // Appearance
        appearance_intensity: data.appearance.intensity,
        appearance_color: data.appearance.color,
        appearance_rim_variation: data.appearance.rimVariation,
        appearance_clarity: data.appearance.clarity,
        appearance_observations: data.appearance.observations,
        
        // Nose
        nose_intensity: data.nose.intensity,
        nose_aroma_characteristics: data.nose.aromaCharacteristics,
        nose_development: data.nose.development,
        nose_observations: data.nose.observations,
        
        // Palate
        palate_sweetness: data.palate.sweetness,
        palate_acidity: data.palate.acidity,
        palate_tannin: data.palate.tannin,
        palate_alcohol: data.palate.alcohol,
        palate_body: data.palate.body,
        palate_flavor_intensity: data.palate.flavorIntensity,
        palate_flavor_characteristics: data.palate.flavorCharacteristics,
        palate_finish: data.palate.finish,
        palate_observations: data.palate.observations,
        
        // Conclusion
        quality_level: data.conclusion.qualityLevel,
        readiness: data.conclusion.readiness,
        ageing_potential: data.conclusion.ageingPotential,
        overall_observations: data.conclusion.observations,
        
        // Additional
        rating: data.rating,
        would_buy_again: data.wouldBuyAgain,
        food_pairing_suggestions: data.foodPairingSuggestions || [],
        photo_urls: data.photoUrls || [],
        voice_note_url: data.voiceNoteUrl,
        voice_note_duration: data.voiceNoteDuration,
      }

      const { tastingNote, error } = await TastingNotesService.createTastingNote(tastingNoteData)
      
      if (error) {
        Alert.alert('Error', `Failed to save tasting note: ${error}`)
        return
      }

      Alert.alert(
        'Success!', 
        'Your WSET tasting note has been saved successfully.',
        [{ text: 'OK', onPress: () => onSubmit?.(data) }]
      )
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while saving your tasting note.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const data = methods.getValues()
      // Here you would save as draft - could be local storage or server
      Alert.alert('Draft Saved', 'Your progress has been saved as a draft.')
      onSave?.(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderCurrentSection = () => {
    switch (currentSection.id) {
      case 'wine-selection':
        return (
          <View style={styles.sectionContent}>
            <WineSelector onWineSelect={setSelectedWine} />
            
            <View style={styles.basicInfoContainer}>
              <Controller
                control={methods.control}
                name="tastingDate"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Tasting Date</Text>
                    <TextInput
                      style={[styles.textInput, errors.tastingDate && styles.textInputError]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.GRAY_400}
                    />
                  </View>
                )}
              />
              
              <Controller
                control={methods.control}
                name="location"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Location (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={value || ''}
                      onChangeText={onChange}
                      placeholder="Where are you tasting this wine?"
                      placeholderTextColor={COLORS.GRAY_400}
                    />
                  </View>
                )}
              />

              <Controller
                control={methods.control}
                name="occasion"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Occasion (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={value || ''}
                      onChangeText={onChange}
                      placeholder="What's the occasion?"
                      placeholderTextColor={COLORS.GRAY_400}
                    />
                  </View>
                )}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Blind Tasting</Text>
                <Controller
                  control={methods.control}
                  name="isBlindTasting"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{ false: COLORS.GRAY_300, true: COLORS.PRIMARY_LIGHT }}
                      thumbColor={value ? COLORS.PRIMARY : COLORS.WHITE}
                    />
                  )}
                />
              </View>

              <Controller
                control={methods.control}
                name="visibility"
                render={({ field: { onChange, value } }) => (
                  <SegmentedSelector
                    title="Visibility"
                    options={[
                      { value: 'PRIVATE', label: 'Private' },
                      { value: 'SQUAD', label: 'Squad Only' },
                      { value: 'PUBLIC', label: 'Public' }
                    ]}
                    value={value}
                    onValueChange={onChange}
                  />
                )}
              />
            </View>
          </View>
        )
      case 'appearance':
        return <WSETAppearanceSection wineType={selectedWine?.wine_type} />
      case 'nose':
        return <WSETNoseSection wineType={selectedWine?.wine_type} />
      case 'palate':
        return <WSETPalateSection wineType={selectedWine?.wine_type} />
      case 'conclusion':
        return <WSETConclusionSection />
      default:
        return null
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FormProvider {...methods}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>WSET Tasting Form</Text>
          <TouchableOpacity 
            style={styles.draftButton} 
            onPress={handleSaveDraft}
            disabled={isSaving}
          >
            <Text style={styles.draftButtonText}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {FORM_SECTIONS.map((section, index) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.progressDot,
                index === currentSectionIndex && styles.progressDotActive,
                index < currentSectionIndex && styles.progressDotCompleted,
              ]}
              onPress={() => setCurrentSectionIndex(index)}
            >
              <Text style={[
                styles.progressDotText,
                index === currentSectionIndex && styles.progressDotTextActive,
                index < currentSectionIndex && styles.progressDotTextCompleted,
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{currentSection.title}</Text>
        <Text style={styles.sectionDescription}>{currentSection.description}</Text>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCurrentSection()}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navigationButton,
              styles.previousButton,
              currentSectionIndex === 0 && styles.navigationButtonDisabled
            ]}
            onPress={handlePrevious}
            disabled={currentSectionIndex === 0}
          >
            <Text style={[
              styles.navigationButtonText,
              currentSectionIndex === 0 && styles.navigationButtonTextDisabled
            ]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentSectionIndex === FORM_SECTIONS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.navigationButton,
                styles.submitButton,
                (!isValid || isSubmitting) && styles.navigationButtonDisabled
              ]}
              onPress={handleSubmit(handleFormSubmit)}
              disabled={!isValid || isSubmitting}
            >
              <Text style={[
                styles.navigationButtonText,
                styles.submitButtonText
              ]}>
                {isSubmitting ? 'Submitting...' : 'Submit Tasting Note'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navigationButton,
                styles.nextButton,
                !canProceedToNext() && styles.navigationButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!canProceedToNext()}
            >
              <Text style={[
                styles.navigationButtonText,
                styles.nextButtonText
              ]}>
                Next
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </FormProvider>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    color: COLORS.GRAY_600,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
    color: COLORS.PRIMARY,
  },
  draftButton: {
    padding: SPACING.SM,
  },
  draftButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.SECONDARY_DARK,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.BASE,
    backgroundColor: COLORS.GRAY_50,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.GRAY_200,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
  progressDotActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.SUCCESS,
  },
  progressDotText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_600,
  },
  progressDotTextActive: {
    color: COLORS.WHITE,
  },
  progressDotTextCompleted: {
    color: COLORS.WHITE,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  sectionDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
    textAlign: 'center',
    marginTop: SPACING.XS,
    marginBottom: SPACING.BASE,
    paddingHorizontal: SPACING.BASE,
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    padding: SPACING.BASE,
  },
  basicInfoContainer: {
    marginTop: SPACING.BASE,
  },
  inputContainer: {
    marginVertical: SPACING.SM,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
    marginBottom: SPACING.SM,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
    borderRadius: BORDER_RADIUS.BASE,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    backgroundColor: COLORS.WHITE,
  },
  textInputError: {
    borderColor: COLORS.ERROR,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    marginVertical: SPACING.SM,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.BASE,
    borderTopWidth: 1,
    borderTopColor: COLORS.GRAY_200,
    backgroundColor: COLORS.WHITE,
    ...SHADOWS.SM,
  },
  navigationButton: {
    flex: 1,
    paddingVertical: SPACING.BASE,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.BASE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousButton: {
    backgroundColor: COLORS.GRAY_100,
    marginRight: SPACING.SM,
  },
  nextButton: {
    backgroundColor: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
  },
  submitButton: {
    backgroundColor: COLORS.SUCCESS,
    marginLeft: SPACING.SM,
  },
  navigationButtonDisabled: {
    opacity: 0.5,
  },
  navigationButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_700,
  },
  nextButtonText: {
    color: COLORS.WHITE,
  },
  submitButtonText: {
    color: COLORS.WHITE,
  },
  navigationButtonTextDisabled: {
    color: COLORS.GRAY_400,
  },
})