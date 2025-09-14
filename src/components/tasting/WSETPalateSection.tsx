import React from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { Controller, useFormContext } from 'react-hook-form'
import { IntensitySlider } from '@/components/ui/IntensitySlider'
import { SegmentedSelector } from '@/components/ui/SegmentedSelector'
import { MultiSelectChips } from '@/components/ui/MultiSelectChips'
import { WSETTastingFormData, BODY_OPTIONS, FINISH_OPTIONS } from '@/types/wsetForm'
import { WSET_FRAMEWORK, WINE_DESCRIPTORS, COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface WSETPalateSectionProps {
  wineType?: string
}

export function WSETPalateSection({ wineType = 'WHITE' }: WSETPalateSectionProps) {
  const { control, formState: { errors } } = useFormContext<WSETTastingFormData>()
  
  // Prepare flavor categories based on wine type
  const flavorOptions = React.useMemo(() => {
    const options = [
      ...WINE_DESCRIPTORS.CITRUS.map(desc => ({ value: desc, label: desc, category: 'Citrus' })),
      ...WINE_DESCRIPTORS.STONE_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Stone Fruit' })),
      ...WINE_DESCRIPTORS.TROPICAL.map(desc => ({ value: desc, label: desc, category: 'Tropical' })),
      ...WINE_DESCRIPTORS.TREE_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Tree Fruit' })),
      ...WINE_DESCRIPTORS.HERBAL.map(desc => ({ value: desc, label: desc, category: 'Herbal' })),
      ...WINE_DESCRIPTORS.SPICE.map(desc => ({ value: desc, label: desc, category: 'Spice' })),
      ...WINE_DESCRIPTORS.EARTH.map(desc => ({ value: desc, label: desc, category: 'Earth' })),
      ...WINE_DESCRIPTORS.MINERAL.map(desc => ({ value: desc, label: desc, category: 'Mineral' })),
      ...WINE_DESCRIPTORS.OAK.map(desc => ({ value: desc, label: desc, category: 'Oak' })),
    ]

    // Add red fruit and black fruit for red wines
    if (wineType === 'RED') {
      options.unshift(
        ...WINE_DESCRIPTORS.RED_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Red Fruit' })),
        ...WINE_DESCRIPTORS.BLACK_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Black Fruit' }))
      )
    }

    return options
  }, [wineType])

  // Show tannin slider only for red wines
  const showTannin = wineType === 'RED'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Palate</Text>
        <Text style={styles.subtitle}>
          Systematic taste assessment of the wine's structural components
        </Text>
      </View>

      {/* Sweetness */}
      <Controller
        control={control}
        name="palate.sweetness"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Sweetness"
            value={value || 2}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.PALATE_SWEETNESS}
            error={errors.palate?.sweetness?.message}
          />
        )}
      />

      {/* Acidity */}
      <Controller
        control={control}
        name="palate.acidity"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Acidity"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.PALATE_ACIDITY}
            error={errors.palate?.acidity?.message}
          />
        )}
      />

      {/* Tannin (Red wines only) */}
      {showTannin && (
        <Controller
          control={control}
          name="palate.tannin"
          render={({ field: { onChange, value } }) => (
            <IntensitySlider
              title="Tannin"
              value={value || 3}
              onValueChange={onChange}
              labels={WSET_FRAMEWORK.PALATE_TANNIN}
              error={errors.palate?.tannin?.message}
            />
          )}
        />
      )}

      {/* Alcohol */}
      <Controller
        control={control}
        name="palate.alcohol"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Alcohol"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.PALATE_ACIDITY} // Same scale as acidity
            error={errors.palate?.alcohol?.message}
          />
        )}
      />

      {/* Body */}
      <Controller
        control={control}
        name="palate.body"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Body"
            options={BODY_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.palate?.body?.message}
          />
        )}
      />

      {/* Flavor Intensity */}
      <Controller
        control={control}
        name="palate.flavorIntensity"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Flavor Intensity"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.NOSE_INTENSITY} // Same scale as nose intensity
            error={errors.palate?.flavorIntensity?.message}
          />
        )}
      />

      {/* Flavor Characteristics */}
      <Controller
        control={control}
        name="palate.flavorCharacteristics"
        render={({ field: { onChange, value } }) => (
          <MultiSelectChips
            title="Flavor Characteristics"
            options={flavorOptions}
            selectedValues={value || []}
            onSelectionChange={onChange}
            allowCustomInput
            showSearch
            searchPlaceholder="Search flavors or add custom..."
            error={errors.palate?.flavorCharacteristics?.message}
          />
        )}
      />

      {/* Finish */}
      <Controller
        control={control}
        name="palate.finish"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Finish"
            options={FINISH_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.palate?.finish?.message}
          />
        )}
      />

      {/* Additional Observations */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Additional Palate Observations</Text>
        <Controller
          control={control}
          name="palate.observations"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.textInput,
                errors.palate?.observations && styles.textInputError
              ]}
              value={value || ''}
              onChangeText={onChange}
              placeholder="Describe balance, texture, complexity, or other palate characteristics..."
              placeholderTextColor={COLORS.GRAY_400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        />
        {errors.palate?.observations && (
          <Text style={styles.errorText}>
            {errors.palate.observations.message}
          </Text>
        )}
      </View>

      {/* WSET Guidance */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>WSET Guidance</Text>
        <Text style={styles.guidanceText}>
          • Sweetness: How sweet is the wine? (Bone dry to sweet){'\n'}
          • Acidity: How much acidity do you perceive?{'\n'}
          {showTannin ? '• Tannin: How much tannin structure is present?\n' : ''}
          • Alcohol: How much alcohol warmth do you feel?{'\n'}
          • Body: What is the weight/mouthfeel of the wine?{'\n'}
          • Flavor Intensity: How pronounced are the flavors?{'\n'}
          • Finish: How long do flavors persist after swallowing?
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