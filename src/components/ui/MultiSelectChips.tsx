import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, ScrollView, TextInput } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface MultiSelectChipsProps {
  options: string[] | { value: string; label: string; category?: string }[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  title: string
  placeholder?: string
  allowCustomInput?: boolean
  maxSelections?: number
  disabled?: boolean
  error?: string
  style?: ViewStyle
  showSearch?: boolean
  searchPlaceholder?: string
}

export function MultiSelectChips({
  options,
  selectedValues,
  onSelectionChange,
  title,
  placeholder = 'Select options...',
  allowCustomInput = false,
  maxSelections,
  disabled = false,
  error,
  style,
  showSearch = true,
  searchPlaceholder = 'Search or add custom...'
}: MultiSelectChipsProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [customInput, setCustomInput] = React.useState('')
  const [showCustomInput, setShowCustomInput] = React.useState(false)

  const normalizedOptions = React.useMemo(() => {
    return options.map(option => 
      typeof option === 'string' 
        ? { value: option, label: option, category: undefined }
        : option
    )
  }, [options])

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions
    
    const query = searchQuery.toLowerCase()
    return normalizedOptions.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query) ||
      option.category?.toLowerCase().includes(query)
    )
  }, [normalizedOptions, searchQuery])

  const groupedOptions = React.useMemo(() => {
    const groups: { [key: string]: typeof filteredOptions } = {}
    
    filteredOptions.forEach(option => {
      const category = option.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(option)
    })
    
    return groups
  }, [filteredOptions])

  const handleToggleOption = (value: string) => {
    if (disabled) return
    
    const isSelected = selectedValues.includes(value)
    let newValues: string[]
    
    if (isSelected) {
      newValues = selectedValues.filter(v => v !== value)
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return // Max selections reached
      }
      newValues = [...selectedValues, value]
    }
    
    onSelectionChange(newValues)
  }

  const handleAddCustom = () => {
    if (!customInput.trim() || selectedValues.includes(customInput.trim())) {
      setCustomInput('')
      setShowCustomInput(false)
      return
    }
    
    const newValues = [...selectedValues, customInput.trim()]
    onSelectionChange(newValues)
    setCustomInput('')
    setShowCustomInput(false)
  }

  const handleRemoveChip = (value: string) => {
    if (disabled) return
    const newValues = selectedValues.filter(v => v !== value)
    onSelectionChange(newValues)
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Selected chips */}
      {selectedValues.length > 0 && (
        <View style={styles.selectedContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {selectedValues.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, styles.selectedChip]}
                onPress={() => handleRemoveChip(value)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, styles.selectedChipText]}>
                  {value}
                </Text>
                <Text style={styles.removeIcon}>×</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Search input */}
      {showSearch && (
        <TextInput
          style={[styles.searchInput, disabled && styles.searchInputDisabled]}
          placeholder={searchPlaceholder}
          placeholderTextColor={COLORS.GRAY_400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!disabled}
        />
      )}
      
      {/* Custom input */}
      {allowCustomInput && (showCustomInput || customInput) && (
        <View style={styles.customInputContainer}>
          <TextInput
            style={[styles.customInput, disabled && styles.customInputDisabled]}
            placeholder="Add custom option..."
            placeholderTextColor={COLORS.GRAY_400}
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={handleAddCustom}
            editable={!disabled}
            autoFocus
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddCustom}
            disabled={disabled || !customInput.trim()}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Options */}
      <ScrollView style={styles.optionsContainer} nestedScrollEnabled>
        {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
          <View key={category} style={styles.categoryContainer}>
            {Object.keys(groupedOptions).length > 1 && category !== 'Other' && (
              <Text style={styles.categoryTitle}>{category}</Text>
            )}
            
            <View style={styles.optionsGrid}>
              {categoryOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                const isDisabled = disabled || (
                  !isSelected && 
                  maxSelections && 
                  selectedValues.length >= maxSelections
                )
                
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      isSelected ? styles.selectedChip : styles.unselectedChip,
                      isDisabled && styles.chipDisabled
                    ]}
                    onPress={() => handleToggleOption(option.value)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      isSelected ? styles.selectedChipText : styles.unselectedChipText,
                      isDisabled && styles.chipTextDisabled
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
        
        {/* Add custom option button */}
        {allowCustomInput && !showCustomInput && !customInput && (
          <TouchableOpacity
            style={[styles.addCustomButton, disabled && styles.addCustomButtonDisabled]}
            onPress={() => setShowCustomInput(true)}
            disabled={disabled}
          >
            <Text style={[styles.addCustomButtonText, disabled && styles.addCustomButtonTextDisabled]}>
              + Add custom option
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Validation info */}
      {maxSelections && (
        <Text style={styles.infoText}>
          {selectedValues.length}/{maxSelections} selected
        </Text>
      )}
      
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
  selectedContainer: {
    marginBottom: SPACING.SM,
  },
  chipsContainer: {
    paddingHorizontal: SPACING.XS,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
    borderRadius: BORDER_RADIUS.BASE,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    backgroundColor: COLORS.WHITE,
    marginBottom: SPACING.SM,
  },
  searchInputDisabled: {
    backgroundColor: COLORS.GRAY_50,
    color: COLORS.GRAY_400,
  },
  customInputContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: BORDER_RADIUS.BASE,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    backgroundColor: COLORS.WHITE,
  },
  customInputDisabled: {
    backgroundColor: COLORS.GRAY_50,
    borderColor: COLORS.GRAY_200,
    color: COLORS.GRAY_400,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.BASE,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.BASE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  optionsContainer: {
    maxHeight: 300,
  },
  categoryContainer: {
    marginBottom: SPACING.BASE,
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
    color: COLORS.GRAY_700,
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
  },
  chip: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.BASE,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  unselectedChip: {
    backgroundColor: COLORS.WHITE,
    borderColor: COLORS.GRAY_200,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  selectedChipText: {
    color: COLORS.WHITE,
  },
  unselectedChipText: {
    color: COLORS.GRAY_700,
  },
  chipTextDisabled: {
    opacity: 0.5,
  },
  removeIcon: {
    marginLeft: SPACING.XS,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
  },
  addCustomButton: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_300,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.BASE,
    paddingVertical: SPACING.BASE,
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  addCustomButtonDisabled: {
    opacity: 0.5,
  },
  addCustomButtonText: {
    color: COLORS.GRAY_600,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  addCustomButtonTextDisabled: {
    opacity: 0.5,
  },
  infoText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_500,
    marginTop: SPACING.XS,
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
})