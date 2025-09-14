import React from 'react'
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native'
import { Controller, useFormContext } from 'react-hook-form'
import { IntensitySlider } from '@/components/ui/IntensitySlider'
import { SegmentedSelector } from '@/components/ui/SegmentedSelector'
import { MultiSelectChips } from '@/components/ui/MultiSelectChips'
import { WSETTastingFormData, READINESS_OPTIONS, AGEING_POTENTIAL_OPTIONS } from '@/types/wsetForm'
import { WSET_FRAMEWORK, COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

// Common food pairing suggestions
const FOOD_PAIRING_OPTIONS = [
  { value: 'Seafood', label: 'Seafood', category: 'Proteins' },
  { value: 'White Fish', label: 'White Fish', category: 'Proteins' },
  { value: 'Salmon', label: 'Salmon', category: 'Proteins' },
  { value: 'Poultry', label: 'Poultry', category: 'Proteins' },
  { value: 'Pork', label: 'Pork', category: 'Proteins' },
  { value: 'Beef', label: 'Beef', category: 'Proteins' },
  { value: 'Lamb', label: 'Lamb', category: 'Proteins' },
  { value: 'Game', label: 'Game', category: 'Proteins' },
  { value: 'Pasta', label: 'Pasta', category: 'Starches' },
  { value: 'Rice', label: 'Rice', category: 'Starches' },
  { value: 'Pizza', label: 'Pizza', category: 'Starches' },
  { value: 'Cheese', label: 'Cheese', category: 'Dairy' },
  { value: 'Soft Cheese', label: 'Soft Cheese', category: 'Dairy' },
  { value: 'Hard Cheese', label: 'Hard Cheese', category: 'Dairy' },
  { value: 'Blue Cheese', label: 'Blue Cheese', category: 'Dairy' },
  { value: 'Vegetables', label: 'Vegetables', category: 'Vegetables' },
  { value: 'Mushrooms', label: 'Mushrooms', category: 'Vegetables' },
  { value: 'Salads', label: 'Salads', category: 'Vegetables' },
  { value: 'Spicy Food', label: 'Spicy Food', category: 'Cuisines' },
  { value: 'Asian Cuisine', label: 'Asian Cuisine', category: 'Cuisines' },
  { value: 'Mediterranean', label: 'Mediterranean', category: 'Cuisines' },
  { value: 'Dessert', label: 'Dessert', category: 'Sweet' },
  { value: 'Chocolate', label: 'Chocolate', category: 'Sweet' },
  { value: 'Fruit Desserts', label: 'Fruit Desserts', category: 'Sweet' },
]

export function WSETConclusionSection() {
  const { control, formState: { errors } } = useFormContext<WSETTastingFormData>()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conclusion</Text>
        <Text style={styles.subtitle}>
          Overall assessment and quality evaluation
        </Text>
      </View>

      {/* Quality Level */}
      <Controller
        control={control}
        name="conclusion.qualityLevel"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Quality Level"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.QUALITY_LEVEL}
            error={errors.conclusion?.qualityLevel?.message}
          />
        )}
      />

      {/* Readiness */}
      <Controller
        control={control}
        name="conclusion.readiness"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Readiness for Drinking"
            options={READINESS_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.conclusion?.readiness?.message}
            multiline
          />
        )}
      />

      {/* Ageing Potential */}
      <Controller
        control={control}
        name="conclusion.ageingPotential"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Ageing Potential (Optional)"
            options={AGEING_POTENTIAL_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.conclusion?.ageingPotential?.message}
          />
        )}
      />

      {/* Personal Rating */}
      <Controller
        control={control}
        name="rating"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Personal Rating (1-5 stars)"
            value={value || 3}
            onValueChange={onChange}
            labels={[
              { value: 1, label: '★' },
              { value: 2, label: '★★' },
              { value: 3, label: '★★★' },
              { value: 4, label: '★★★★' },
              { value: 5, label: '★★★★★' },
            ]}
            error={errors.rating?.message}
          />
        )}
      />

      {/* Would Buy Again */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Would Buy Again?</Text>
        <Controller
          control={control}
          name="wouldBuyAgain"
          render={({ field: { onChange, value } }) => (
            <Switch
              value={value || false}
              onValueChange={onChange}
              trackColor={{ false: COLORS.GRAY_300, true: COLORS.PRIMARY_LIGHT }}
              thumbColor={value ? COLORS.PRIMARY : COLORS.WHITE}
            />
          )}
        />
      </View>

      {/* Food Pairing Suggestions */}
      <Controller
        control={control}
        name="foodPairingSuggestions"
        render={({ field: { onChange, value } }) => (
          <MultiSelectChips
            title="Food Pairing Suggestions"
            options={FOOD_PAIRING_OPTIONS}
            selectedValues={value || []}
            onSelectionChange={onChange}
            allowCustomInput
            showSearch={false}
            maxSelections={8}
            error={errors.foodPairingSuggestions?.message}
          />
        )}
      />

      {/* Overall Observations */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Overall Conclusion & Notes</Text>
        <Controller
          control={control}
          name="conclusion.observations"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.textInput,
                errors.conclusion?.observations && styles.textInputError
              ]}
              value={value || ''}
              onChangeText={onChange}
              placeholder="Summarize your overall impression, balance, complexity, and any final thoughts..."
              placeholderTextColor={COLORS.GRAY_400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        />
        {errors.conclusion?.observations && (
          <Text style={styles.errorText}>
            {errors.conclusion.observations.message}
          </Text>
        )}
      </View>

      {/* WSET Guidance */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>WSET Guidance</Text>
        <Text style={styles.guidanceText}>
          • Quality Level: Consider balance, length, intensity, and complexity{'\n'}
          • Poor: Major flaws, unbalanced{'\n'}
          • Acceptable: Sound, simple{'\n'}
          • Good: Correct, few distinguishing features{'\n'}
          • Very Good: Good balance, complexity{'\n'}
          • Outstanding: Exceptional balance, complexity, length{'\n\n'}
          • Readiness: When should this wine be consumed for optimal enjoyment?{'\n'}
          • Ageing Potential: How long might this wine continue to develop?
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.BASE,
  },
  header: {
    marginBottom: SPACING.LG,
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['2XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    marginVertical: SPACING.BASE,
    backgroundColor: COLORS.GRAY_50,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
  },
  inputContainer: {
    marginVertical: SPACING.BASE,
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
    minHeight: 100,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  textInputError: {
    borderColor: COLORS.ERROR,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
  guidanceContainer: {
    backgroundColor: COLORS.GRAY_50,
    padding: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    marginTop: SPACING.LG,
  },
  guidanceTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  guidanceText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_700,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
  },
})