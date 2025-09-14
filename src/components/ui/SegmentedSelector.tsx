import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, ScrollView } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface SegmentedSelectorProps<T extends string | number> {
  options: readonly T[] | { value: T; label: string }[]
  value: T
  onValueChange: (value: T) => void
  title?: string
  disabled?: boolean
  error?: string
  style?: ViewStyle
  multiline?: boolean
}

export function SegmentedSelector<T extends string | number>({
  options,
  value,
  onValueChange,
  title,
  disabled = false,
  error,
  style,
  multiline = false
}: SegmentedSelectorProps<T>) {
  const normalizedOptions = React.useMemo(() => {
    return options.map(option => 
      typeof option === 'object' 
        ? option 
        : { value: option, label: String(option) }
    )
  }, [options])

  const renderOption = (option: { value: T; label: string }, index: number) => {
    const isSelected = option.value === value
    const isFirst = index === 0
    const isLast = index === normalizedOptions.length - 1
    
    return (
      <TouchableOpacity
        key={String(option.value)}
        style={[
          styles.option,
          isFirst && styles.optionFirst,
          isLast && styles.optionLast,
          isSelected && styles.optionSelected,
          disabled && styles.optionDisabled,
          multiline && styles.optionMultiline
        ]}
        onPress={() => !disabled && onValueChange(option.value)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
          disabled && styles.optionTextDisabled,
          multiline && styles.optionTextMultiline
        ]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      
      <View style={[styles.segmentedControl, multiline && styles.segmentedControlMultiline]}>
        {multiline ? (
          <View style={styles.multilineContainer}>
            {normalizedOptions.map((option, index) => renderOption(option, index))}
          </View>
        ) : normalizedOptions.length > 4 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {normalizedOptions.map((option, index) => renderOption(option, index))}
          </ScrollView>
        ) : (
          normalizedOptions.map((option, index) => renderOption(option, index))
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.SM,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_900,
    marginBottom: SPACING.SM,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.GRAY_100,
    borderRadius: BORDER_RADIUS.MD,
    padding: 2,
  },
  segmentedControlMultiline: {
    flexDirection: 'column',
    backgroundColor: 'transparent',
    padding: 0,
  },
  multilineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
  },
  scrollContainer: {
    paddingHorizontal: SPACING.XS,
  },
  option: {
    flex: 1,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.SM,
    minHeight: 44,
  },
  optionFirst: {
    borderTopLeftRadius: BORDER_RADIUS.MD,
    borderBottomLeftRadius: BORDER_RADIUS.MD,
  },
  optionLast: {
    borderTopRightRadius: BORDER_RADIUS.MD,
    borderBottomRightRadius: BORDER_RADIUS.MD,
  },
  optionSelected: {
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionMultiline: {
    flex: 0,
    minWidth: 80,
    marginRight: SPACING.XS,
    marginBottom: SPACING.XS,
    borderRadius: BORDER_RADIUS.BASE,
    backgroundColor: COLORS.GRAY_100,
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
  },
  optionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_700,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
  },
  optionTextDisabled: {
    opacity: 0.5,
  },
  optionTextMultiline: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
})