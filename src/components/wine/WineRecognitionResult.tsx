import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WineRecognitionResult } from '@/services/wineRecognition'
import { saveWineToDatabase } from '@/services/wineRecognition'
import { useAuth } from '@/hooks/useAuth'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

interface WineRecognitionResultProps {
  result: WineRecognitionResult
  onSave?: () => void
  onRetry?: () => void
  onDismiss?: () => void
}

export function WineRecognitionResultComponent({ 
  result, 
  onSave, 
  onRetry, 
  onDismiss 
}: WineRecognitionResultProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveWine = async () => {
    if (!result.success || !result.wineData || !user) {
      return
    }

    setIsSaving(true)

    try {
      const saveResult = await saveWineToDatabase({
        name: result.wineData.name,
        producer: result.wineData.producer,
        vintage: result.wineData.vintage,
        region: result.wineData.region,
        varietal: result.wineData.varietal,
        userId: user.id
      })

      if (saveResult.success) {
        Alert.alert('Success', 'Wine saved to your cellar!')
        onSave?.()
      } else {
        Alert.alert('Error', 'Failed to save wine to cellar')
      }
    } catch (error) {
      console.error('Error saving wine:', error)
      Alert.alert('Error', 'Failed to save wine to cellar')
    } finally {
      setIsSaving(false)
    }
  }

  if (!result.success) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Recognition Failed</Text>
          <Text style={styles.errorMessage}>
            {result.error || 'Could not recognize the wine label'}
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Ionicons name="camera" size={20} color={COLORS.WHITE} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={[styles.buttonText, { color: COLORS.GRAY_600 }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const { wineData } = result

  return (
    <View style={styles.container}>
      <View style={styles.successContainer}>
        <Ionicons name="wine" size={48} color={COLORS.PRIMARY} />
        <Text style={styles.successTitle}>Wine Recognized!</Text>
        
        <View style={styles.wineInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{wineData?.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Producer:</Text>
            <Text style={styles.infoValue}>{wineData?.producer}</Text>
          </View>
          
          {wineData?.vintage && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vintage:</Text>
              <Text style={styles.infoValue}>{wineData.vintage}</Text>
            </View>
          )}
          
          {wineData?.region && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region:</Text>
              <Text style={styles.infoValue}>{wineData.region}</Text>
            </View>
          )}
          
          {wineData?.varietal && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Varietal:</Text>
              <Text style={styles.infoValue}>{wineData.varietal}</Text>
            </View>
          )}
        </View>

        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>
            Confidence: {Math.round((wineData?.confidence || 0) * 100)}%
          </Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${(wineData?.confidence || 0) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.disabledButton]} 
            onPress={handleSaveWine}
            disabled={isSaving}
          >
            <Ionicons 
              name={isSaving ? "hourglass" : "add-circle"} 
              size={20} 
              color={COLORS.WHITE} 
            />
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Add to Cellar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="camera" size={20} color={COLORS.WHITE} />
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    margin: SPACING.BASE,
    padding: SPACING.BASE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.BASE,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.BASE,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.ERROR,
    marginTop: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    marginTop: SPACING.SM,
    marginBottom: SPACING.BASE,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
    marginBottom: SPACING.BASE,
  },
  wineInfo: {
    width: '100%',
    marginBottom: SPACING.BASE,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_100,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.GRAY_700,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_900,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.SM,
  },
  confidenceContainer: {
    width: '100%',
    marginBottom: SPACING.BASE,
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.GRAY_600,
    marginBottom: SPACING.XS,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginTop: SPACING.BASE,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    gap: SPACING.XS,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    gap: SPACING.XS,
  },
  dismissButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    borderWidth: 1,
    borderColor: COLORS.GRAY_300,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.WHITE,
  },
})