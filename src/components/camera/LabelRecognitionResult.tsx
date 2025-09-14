import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import { WineLabelInfo } from '@/services/api/googleVision'

interface LabelRecognitionResultProps {
  imageUri: string
  labelInfo: WineLabelInfo
  onConfirm: (labelInfo: WineLabelInfo) => void
  onRetry: () => void
  onManualEntry: () => void
  loading?: boolean
}

export function LabelRecognitionResult({
  imageUri,
  labelInfo,
  onConfirm,
  onRetry,
  onManualEntry,
  loading = false,
}: LabelRecognitionResultProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return '#059669' // Green
    if (confidence >= 40) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 70) return 'High Confidence'
    if (confidence >= 40) return 'Medium Confidence'
    return 'Low Confidence'
  }

  const renderField = (label: string, value: string | string[] | number | undefined, confidence?: number) => {
    if (!value) return null

    const displayValue = Array.isArray(value) ? value.join(', ') : value.toString()

    return (
      <View style={styles.fieldContainer} key={label}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {confidence !== undefined && (
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(confidence) }]}>
              <Text style={styles.confidenceText}>
                {confidence}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.fieldValue}>{displayValue}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Label Recognition Results</Text>
        <View style={[styles.overallConfidence, { backgroundColor: getConfidenceColor(labelInfo.confidence) }]}>
          <Text style={styles.overallConfidenceText}>
            {getConfidenceText(labelInfo.confidence)}
          </Text>
          <Text style={styles.overallConfidenceScore}>{labelInfo.confidence}%</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.capturedImage} />
          <Text style={styles.imageCaption}>Captured label</Text>
        </View>

        {/* Recognized Information */}
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Recognized Information</Text>
          
          {renderField('Wine Name', labelInfo.wineName)}
          {renderField('Producer', labelInfo.producer)}
          {renderField('Vintage', labelInfo.vintage)}
          {renderField('Wine Type', labelInfo.wineType)}
          {renderField('Grape Variety', labelInfo.grapeVariety)}
          {renderField('Region/Appellation', labelInfo.appellation)}
          {renderField('Alcohol Content', labelInfo.alcoholContent)}

          {labelInfo.confidence < 50 && (
            <View style={styles.lowConfidenceWarning}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Low Recognition Confidence</Text>
                <Text style={styles.warningMessage}>
                  The label recognition had difficulty reading this wine label. 
                  Please review the information below and make corrections as needed.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Raw Text Section (for debugging/verification) */}
        {labelInfo.rawText && (
          <View style={styles.rawTextSection}>
            <Text style={styles.sectionTitle}>Raw Extracted Text</Text>
            <View style={styles.rawTextContainer}>
              <Text style={styles.rawText} numberOfLines={10}>
                {labelInfo.rawText}
              </Text>
            </View>
          </View>
        )}

        {/* Tips for better recognition */}
        {labelInfo.confidence < 70 && (
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Tips for Better Recognition</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>• </Text>
              <Text style={styles.tipText}>Ensure good lighting on the wine label</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>• </Text>
              <Text style={styles.tipText}>Hold the camera steady and avoid blur</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>• </Text>
              <Text style={styles.tipText}>Position the label flat and centered</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipBullet}>• </Text>
              <Text style={styles.tipText}>Remove any glare or reflections</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onRetry}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>📷 Retake Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onManualEntry}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>✏️ Manual Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => onConfirm(labelInfo)}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Processing...' : '✓ Use This Information'}
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  overallConfidence: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  overallConfidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overallConfidenceScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  capturedImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageCaption: {
    fontSize: 12,
    color: '#6B7280',
  },
  resultsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fieldValue: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 20,
  },
  lowConfidenceWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  rawTextSection: {
    marginBottom: 24,
  },
  rawTextContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rawText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  tipsSection: {
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '700',
    marginRight: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})