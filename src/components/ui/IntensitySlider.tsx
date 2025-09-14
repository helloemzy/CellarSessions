import React from 'react'
import { View, Text, StyleSheet, PanResponder, Animated, ViewStyle, TextStyle } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface IntensitySliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  labels: { value: number; label: string }[]
  title: string
  disabled?: boolean
  error?: string
  style?: ViewStyle
}

export function IntensitySlider({
  value,
  onValueChange,
  min = 1,
  max = 5,
  step = 1,
  labels,
  title,
  disabled = false,
  error,
  style
}: IntensitySliderProps) {
  const pan = React.useRef(new Animated.Value(0)).current
  const [sliderWidth, setSliderWidth] = React.useState(0)

  const valueToPosition = (val: number) => {
    return ((val - min) / (max - min)) * sliderWidth
  }

  const positionToValue = (position: number) => {
    const ratio = position / sliderWidth
    const rawValue = min + ratio * (max - min)
    return Math.round(rawValue / step) * step
  }

  React.useEffect(() => {
    if (sliderWidth > 0) {
      const position = valueToPosition(value)
      pan.setValue(position)
    }
  }, [value, sliderWidth])

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderMove: (_, gestureState) => {
      if (disabled) return
      
      const newPosition = Math.max(0, Math.min(sliderWidth, gestureState.moveX - 40)) // 40 = padding
      pan.setValue(newPosition)
      
      const newValue = positionToValue(newPosition)
      if (newValue !== value && newValue >= min && newValue <= max) {
        onValueChange(newValue)
      }
    },
    onPanResponderRelease: () => {
      // Snap to exact position after release
      const position = valueToPosition(value)
      Animated.spring(pan, {
        toValue: position,
        useNativeDriver: false,
      }).start()
    },
  })

  const thumbPosition = Animated.add(pan, new Animated.Value(0))

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      <View 
        style={styles.sliderContainer}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout
          setSliderWidth(width - 40) // Subtract padding
        }}
      >
        {/* Track */}
        <View style={[styles.track, disabled && styles.trackDisabled]} />
        
        {/* Active track */}
        <Animated.View 
          style={[
            styles.activeTrack,
            {
              width: thumbPosition,
            },
            disabled && styles.activeTrackDisabled
          ]} 
        />
        
        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbPosition }],
            },
            disabled && styles.thumbDisabled
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.thumbInner} />
        </Animated.View>
        
        {/* Step markers */}
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const stepValue = min + index
          const position = valueToPosition(stepValue)
          
          return (
            <View
              key={stepValue}
              style={[
                styles.stepMarker,
                {
                  left: position + 20, // Offset for padding
                },
                stepValue === value && styles.stepMarkerActive
              ]}
            />
          )
        })}
      </View>
      
      {/* Labels */}
      <View style={styles.labelsContainer}>
        {labels.map((label) => (
          <View key={label.value} style={styles.labelItem}>
            <Text style={[
              styles.labelValue,
              label.value === value && styles.labelValueActive,
              disabled && styles.labelDisabled
            ]}>
              {label.value}
            </Text>
            <Text style={[
              styles.labelText,
              label.value === value && styles.labelTextActive,
              disabled && styles.labelDisabled
            ]}>
              {label.label}
            </Text>
          </View>
        ))}
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
  sliderContainer: {
    height: 40,
    paddingHorizontal: 20,
    marginBottom: SPACING.BASE,
    position: 'relative',
  },
  track: {
    position: 'absolute',
    top: 18,
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 2,
  },
  trackDisabled: {
    backgroundColor: COLORS.GRAY_100,
  },
  activeTrack: {
    position: 'absolute',
    top: 18,
    left: 20,
    height: 4,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  activeTrackDisabled: {
    backgroundColor: COLORS.GRAY_300,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 24,
    marginLeft: -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    borderWidth: 3,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbDisabled: {
    opacity: 0.5,
  },
  stepMarker: {
    position: 'absolute',
    top: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.GRAY_300,
    marginLeft: -4,
  },
  stepMarkerActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.SM,
  },
  labelItem: {
    alignItems: 'center',
    flex: 1,
  },
  labelValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_600,
    marginBottom: 2,
  },
  labelValueActive: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMI_BOLD,
  },
  labelText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.GRAY_500,
    textAlign: 'center',
  },
  labelTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  labelDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.XS,
  },
})