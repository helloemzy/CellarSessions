import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native'
import { BlindTastingGuess } from '@/services/api/blindTasting'

interface BlindTastingGuessFormProps {
  onSubmit: (guess: BlindTastingGuess) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

const WINE_TYPES = [
  'Red Wine',
  'White Wine',
  'Rosé Wine',
  'Sparkling Wine',
  'Dessert Wine',
  'Fortified Wine'
]

const GRAPE_VARIETIES = {
  red: [
    'Pinot Noir', 'Cabernet Sauvignon', 'Merlot', 'Syrah/Shiraz', 
    'Sangiovese', 'Tempranillo', 'Grenache', 'Cabernet Franc',
    'Malbec', 'Zinfandel', 'Nebbiolo', 'Barbera'
  ],
  white: [
    'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio/Pinot Gris',
    'Gewürztraminer', 'Chenin Blanc', 'Viognier', 'Albariño',
    'Grüner Veltliner', 'Sémillon', 'Muscat', 'Vermentino'
  ],
  sparkling: [
    'Chardonnay', 'Pinot Noir', 'Pinot Meunier', 'Glera (Prosecco)',
    'Chenin Blanc', 'Macabeo', 'Parellada', 'Xarel·lo'
  ]
}

const REGIONS = [
  // France
  'Bordeaux', 'Burgundy', 'Rhône Valley', 'Loire Valley', 'Champagne', 'Alsace',
  // Italy  
  'Tuscany', 'Piedmont', 'Veneto', 'Sicily', 'Marche', 'Umbria',
  // Spain
  'Rioja', 'Ribera del Duero', 'Rías Baixas', 'Priorat', 'Jerez',
  // Germany
  'Mosel', 'Rheingau', 'Pfalz', 'Baden', 'Württemberg',
  // New World
  'Napa Valley', 'Sonoma', 'Central Coast', 'Paso Robles', 'Willamette Valley',
  'Hunter Valley', 'Barossa Valley', 'Margaret River', 'Stellenbosch',
  'Mendoza', 'Central Valley (Chile)', 'Marlborough', 'Central Otago'
]

const COUNTRIES = [
  'France', 'Italy', 'Spain', 'Germany', 'Portugal', 'Greece',
  'United States', 'Australia', 'New Zealand', 'South Africa',
  'Chile', 'Argentina', 'Austria', 'Hungary', 'Romania'
]

export function BlindTastingGuessForm({ 
  onSubmit, 
  onCancel, 
  loading = false 
}: BlindTastingGuessFormProps) {
  const [guess, setGuess] = useState<BlindTastingGuess>({
    wine_type: '',
    grape_variety: [],
    region: '',
    country: '',
    vintage_range: { min: 2015, max: 2020 },
    alcohol_range: { min: 12, max: 14 },
    style: '',
    confidence: 3,
    reasoning: ''
  })

  const [step, setStep] = useState(1)
  const totalSteps = 6

  const handleGrapeVarietyToggle = (variety: string) => {
    const currentVarieties = guess.grape_variety || []
    if (currentVarieties.includes(variety)) {
      setGuess(prev => ({
        ...prev,
        grape_variety: currentVarieties.filter(v => v !== variety)
      }))
    } else {
      setGuess(prev => ({
        ...prev,
        grape_variety: [...currentVarieties, variety].slice(0, 3) // Max 3 varieties
      }))
    }
  }

  const getAvailableGrapes = () => {
    const wineType = guess.wine_type?.toLowerCase()
    if (wineType?.includes('red')) return GRAPE_VARIETIES.red
    if (wineType?.includes('white')) return GRAPE_VARIETIES.white
    if (wineType?.includes('sparkling')) return GRAPE_VARIETIES.sparkling
    return [...GRAPE_VARIETIES.red, ...GRAPE_VARIETIES.white]
  }

  const handleSubmit = async () => {
    if (!guess.wine_type) {
      Alert.alert('Incomplete', 'Please select a wine type before submitting.')
      return
    }

    if (!guess.grape_variety || guess.grape_variety.length === 0) {
      Alert.alert('Incomplete', 'Please select at least one grape variety.')
      return
    }

    try {
      await onSubmit(guess)
    } catch (error) {
      Alert.alert('Error', 'Failed to submit blind tasting guess.')
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Wine Type</Text>
      <Text style={styles.stepDescription}>
        Based on visual examination, what type of wine is this?
      </Text>
      
      <View style={styles.optionsGrid}>
        {WINE_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              guess.wine_type === type && styles.selectedOption
            ]}
            onPress={() => setGuess(prev => ({ ...prev, wine_type: type }))}
          >
            <Text style={[
              styles.optionText,
              guess.wine_type === type && styles.selectedOptionText
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.methodologyNote}>
        💡 WSET Method: Look at color intensity, hue, and clarity first
      </Text>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Grape Variety</Text>
      <Text style={styles.stepDescription}>
        Select up to 3 grape varieties you think are in this wine
      </Text>
      
      <View style={styles.selectedVarieties}>
        {(guess.grape_variety || []).map(variety => (
          <View key={variety} style={styles.selectedVarietyChip}>
            <Text style={styles.selectedVarietyText}>{variety}</Text>
            <TouchableOpacity onPress={() => handleGrapeVarietyToggle(variety)}>
              <Text style={styles.removeVariety}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <ScrollView style={styles.varietyScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsGrid}>
          {getAvailableGrapes().map(variety => (
            <TouchableOpacity
              key={variety}
              style={[
                styles.optionButton,
                (guess.grape_variety || []).includes(variety) && styles.selectedOption
              ]}
              onPress={() => handleGrapeVarietyToggle(variety)}
              disabled={(guess.grape_variety || []).length >= 3 && !(guess.grape_variety || []).includes(variety)}
            >
              <Text style={[
                styles.optionText,
                (guess.grape_variety || []).includes(variety) && styles.selectedOptionText
              ]}>
                {variety}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.methodologyNote}>
        💡 CMS Method: Consider aroma intensity, fruit character, and structural elements
      </Text>
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Region & Country</Text>
      <Text style={styles.stepDescription}>
        Where do you think this wine is from?
      </Text>
      
      <Text style={styles.fieldLabel}>Country</Text>
      <ScrollView horizontal style={styles.horizontalScroll} showsHorizontalScrollIndicator={false}>
        {COUNTRIES.map(country => (
          <TouchableOpacity
            key={country}
            style={[
              styles.horizontalOption,
              guess.country === country && styles.selectedOption
            ]}
            onPress={() => setGuess(prev => ({ ...prev, country }))}
          >
            <Text style={[
              styles.optionText,
              guess.country === country && styles.selectedOptionText
            ]}>
              {country}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.fieldLabel}>Region (Optional)</Text>
      <ScrollView style={styles.regionScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsGrid}>
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region}
              style={[
                styles.optionButton,
                guess.region === region && styles.selectedOption
              ]}
              onPress={() => setGuess(prev => ({ ...prev, region }))}
            >
              <Text style={[
                styles.optionText,
                guess.region === region && styles.selectedOptionText
              ]}>
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.methodologyNote}>
        💡 Regional Clues: Climate indicators, traditional grape varieties, winemaking styles
      </Text>
    </View>
  )

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 4: Vintage Range</Text>
      <Text style={styles.stepDescription}>
        What age range do you estimate for this wine?
      </Text>
      
      <View style={styles.rangeContainer}>
        <View style={styles.rangeInput}>
          <Text style={styles.rangeLabel}>From Year</Text>
          <TextInput
            style={styles.yearInput}
            value={guess.vintage_range?.min.toString()}
            onChangeText={(text) => {
              const year = parseInt(text)
              if (!isNaN(year)) {
                setGuess(prev => ({
                  ...prev,
                  vintage_range: { ...prev.vintage_range!, min: year }
                }))
              }
            }}
            keyboardType="numeric"
            placeholder="2015"
          />
        </View>
        
        <Text style={styles.rangeSeparator}>to</Text>
        
        <View style={styles.rangeInput}>
          <Text style={styles.rangeLabel}>To Year</Text>
          <TextInput
            style={styles.yearInput}
            value={guess.vintage_range?.max.toString()}
            onChangeText={(text) => {
              const year = parseInt(text)
              if (!isNaN(year)) {
                setGuess(prev => ({
                  ...prev,
                  vintage_range: { ...prev.vintage_range!, max: year }
                }))
              }
            }}
            keyboardType="numeric"
            placeholder="2020"
          />
        </View>
      </View>

      <Text style={styles.methodologyNote}>
        💡 Age Assessment: Color evolution, aroma development, tannin integration
      </Text>
    </View>
  )

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 5: Confidence & Style</Text>
      <Text style={styles.stepDescription}>
        How confident are you in your assessment?
      </Text>
      
      <View style={styles.confidenceContainer}>
        {[1, 2, 3, 4, 5].map(level => (
          <TouchableOpacity
            key={level}
            style={[
              styles.confidenceButton,
              guess.confidence === level && styles.selectedConfidence
            ]}
            onPress={() => setGuess(prev => ({ ...prev, confidence: level }))}
          >
            <Text style={[
              styles.confidenceText,
              guess.confidence === level && styles.selectedConfidenceText
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.confidenceLabels}>
        1 = Guessing    3 = Reasonably Sure    5 = Very Confident
      </Text>

      <Text style={styles.fieldLabel}>Wine Style (Optional)</Text>
      <TextInput
        style={styles.textInput}
        value={guess.style}
        onChangeText={(text) => setGuess(prev => ({ ...prev, style: text }))}
        placeholder="e.g., Full-bodied, Oaked, Elegant, Powerful..."
        multiline
      />

      <Text style={styles.methodologyNote}>
        💡 Professional Tip: Honest confidence assessment improves learning
      </Text>
    </View>
  )

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 6: Your Reasoning</Text>
      <Text style={styles.stepDescription}>
        Explain your thought process (this helps you learn!)
      </Text>
      
      <TextInput
        style={styles.reasoningInput}
        value={guess.reasoning}
        onChangeText={(text) => setGuess(prev => ({ ...prev, reasoning: text }))}
        placeholder="What visual, aroma, and taste clues led to your conclusion? Consider structure, intensity, complexity, and any distinctive characteristics..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.methodologyNote}>
        💡 WSET Approach: Systematic tasting notes improve accuracy over time
      </Text>
    </View>
  )

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return renderStep1()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blind Tasting Assessment</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(step / totalSteps) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Step {step} of {totalSteps}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <View style={styles.navigationButtons}>
          {step > 1 && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {step < totalSteps ? (
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={() => setStep(step + 1)}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Assessment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  selectedVarieties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedVarietyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedVarietyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  removeVariety: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  varietyScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  horizontalScroll: {
    marginBottom: 20,
  },
  horizontalOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginRight: 8,
  },
  regionScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rangeInput: {
    flex: 1,
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  yearInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    width: 80,
  },
  rangeSeparator: {
    fontSize: 16,
    color: '#6B7280',
    marginHorizontal: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidenceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedConfidence: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  selectedConfidenceText: {
    color: '#FFFFFF',
  },
  confidenceLabels: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  reasoningInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  methodologyNote: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  buttonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
})