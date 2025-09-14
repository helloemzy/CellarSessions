import React from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { Controller, useFormContext } from 'react-hook-form'
import { IntensitySlider } from '@/components/ui/IntensitySlider'
import { SegmentedSelector } from '@/components/ui/SegmentedSelector'
import { MultiSelectChips } from '@/components/ui/MultiSelectChips'
import { WSETTastingFormData, DEVELOPMENT_OPTIONS } from '@/types/wsetForm'
import { WSET_FRAMEWORK, WINE_DESCRIPTORS, COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface WSETNoseSectionProps {
  wineType?: string
}

export function WSETNoseSection({ wineType = 'WHITE' }: WSETNoseSectionProps) {
  const { control, formState: { errors } } = useFormContext<WSETTastingFormData>()
  
  // Prepare aroma categories based on wine type
  const aromaOptions = React.useMemo(() => {
    const options = [
      ...WINE_DESCRIPTORS.CITRUS.map(desc => ({ value: desc, label: desc, category: 'Citrus' })),
      ...WINE_DESCRIPTORS.STONE_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Stone Fruit' })),
      ...WINE_DESCRIPTORS.TROPICAL.map(desc => ({ value: desc, label: desc, category: 'Tropical' })),
      ...WINE_DESCRIPTORS.TREE_FRUIT.map(desc => ({ value: desc, label: desc, category: 'Tree Fruit' })),
      ...WINE_DESCRIPTORS.FLORAL.map(desc => ({ value: desc, label: desc, category: 'Floral' })),
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nose</Text>
        <Text style={styles.subtitle}>
          Systematic aromatic assessment of the wine's bouquet
        </Text>
      </View>

      {/* Intensity Slider */}
      <Controller
        control={control}
        name="nose.intensity"
        render={({ field: { onChange, value } }) => (
          <IntensitySlider
            title="Aroma Intensity"
            value={value || 3}
            onValueChange={onChange}
            labels={WSET_FRAMEWORK.NOSE_INTENSITY}
            error={errors.nose?.intensity?.message}
          />
        )}
      />

      {/* Aroma Characteristics */}
      <Controller
        control={control}
        name="nose.aromaCharacteristics"
        render={({ field: { onChange, value } }) => (
          <MultiSelectChips
            title="Aroma Characteristics"
            options={aromaOptions}
            selectedValues={value || []}
            onSelectionChange={onChange}
            allowCustomInput
            showSearch
            searchPlaceholder="Search aromas or add custom..."
            error={errors.nose?.aromaCharacteristics?.message}
          />
        )}
      />

      {/* Development Selection */}
      <Controller
        control={control}
        name="nose.development"
        render={({ field: { onChange, value } }) => (
          <SegmentedSelector
            title="Development"
            options={DEVELOPMENT_OPTIONS}
            value={value || ''}
            onValueChange={onChange}
            error={errors.nose?.development?.message}
          />
        )}
      />

      {/* Additional Observations */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Additional Nose Observations</Text>
        <Controller
          control={control}
          name="nose.observations"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.textInput,
                errors.nose?.observations && styles.textInputError
              ]}
              value={value || ''}
              onChangeText={onChange}
              placeholder="Describe complexity, evolution, or other nose characteristics..."
              placeholderTextColor={COLORS.GRAY_400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        />
        {errors.nose?.observations && (
          <Text style={styles.errorText}>
            {errors.nose.observations.message}
          </Text>
        )}
      </View>

      {/* WSET Guidance */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>WSET Guidance</Text>
        <Text style={styles.guidanceText}>
          • Intensity: How strong are the aromas? Can you smell them easily?{'\n'}
          • Characteristics: What specific aromas can you identify?{'\n'}
          • Development: Does the wine show primary, secondary, or tertiary aromas?{'\n'}
          • Primary: Fresh fruit, floral{'\n'}
          • Secondary: From fermentation - yeast, malolactic{'\n'}
          • Tertiary: From aging - oak, bottle age
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