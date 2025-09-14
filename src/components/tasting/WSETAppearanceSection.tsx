import React from 'react'
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native'
import { Controller, useFormContext } from 'react-hook-form'
import { IntensitySlider } from '@/components/ui/IntensitySlider'
import { SegmentedSelector } from '@/components/ui/SegmentedSelector'
import { WSETTastingFormData, getWineColorsForType, CLARITY_OPTIONS } from '@/types/wsetForm'
import { WSET_FRAMEWORK, COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface WSETAppearanceSectionProps {
  wineType?: string
}

export function WSETAppearanceSection({ wineType = 'WHITE' }: WSETAppearanceSectionProps) {
  const { control, formState: { errors }, watch } = useFormContext<WSETTastingFormData>()
  
  const wineColors = getWineColorsForType(wineType)
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appearance</Text>
        <Text style={styles.subtitle}>
          Systematic visual assessment of the wine's appearance
        </Text>
      </View>

      {/* Intensity Slider */}
      <Controller
        control={control}
        name="appearance.intensity"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Intensity"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.APPEARANCE_INTENSITY}
            error={errors.appearance?.intensity?.message}
          />
        )}
      />

      {/* Color Selection */}
      <Controller
        control={control}
        name="appearance.color"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Color"
            options={wineColors}
            value={value || ''}
            onValueChange={onChange}
            error={errors.appearance?.color?.message}
            multiline={wineColors.length > 4}
          />
        )}
      />

      {/* Rim Variation Toggle */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Rim Variation</Text>
        <Controller
          control={control}
          name="appearance.rimVariation"
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
      
      <Text style={styles.switchDescription}>
        Indicates significant color variation from center to rim
      </Text>

      {/* Clarity Selection */}
      <Controller
        control={control}
        name="appearance.clarity"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Clarity"
            options={CLARITY_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.appearance?.clarity?.message}
          />
        )}
      />

      {/* Additional Observations */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Additional Observations</Text>
        <Controller
          control={control}
          name="appearance.observations"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.textInput,
                errors.appearance?.observations && styles.textInputError
              ]}
              value={value || ''}
              onChangeText={onChange}
              placeholder="Describe any additional appearance characteristics..."
              placeholderTextColor={COLORS.GRAY_400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        />
        {errors.appearance?.observations && (
          <Text style={styles.errorText}>
            {errors.appearance.observations.message}
          </Text>
        )}
      </View>

      {/* WSET Guidance */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>WSET Guidance</Text>
        <Text style={styles.guidanceText}>
          • Intensity: How much color saturation does the wine show?{'\n'}
          • Color: What is the primary color, considering the wine's age?{'\n'}
          • Rim Variation: Is there a noticeable difference in color from center to edge?{'\n'}
          • Clarity: How clear or hazy is the wine?
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
    marginVertical: SPACING.SM,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
  },
  switchDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_500,
    fontStyle: 'italic',
    marginBottom: SPACING.BASE,
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
    minHeight: 80,
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