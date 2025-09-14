import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native'
import { BlindTastingResult } from '@/services/api/blindTasting'

interface BlindTastingResultCardProps {
  result: BlindTastingResult
  onPress?: (result: BlindTastingResult) => void
  showComparison?: boolean
}

export function BlindTastingResultCard({ 
  result, 
  onPress,
  showComparison = true 
}: BlindTastingResultCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#059669' // Green
    if (score >= 60) return '#F59E0B' // Yellow
    if (score >= 40) return '#EF4444' // Red
    return '#6B7280' // Gray
  }

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 85) return 'A'
    if (score >= 80) return 'A-'
    if (score >= 75) return 'B+'
    if (score >= 70) return 'B'
    if (score >= 65) return 'B-'
    if (score >= 60) return 'C+'
    if (score >= 55) return 'C'
    if (score >= 50) return 'C-'
    return 'D'
  }

  const renderComparisonRow = (
    label: string,
    guess: string | string[] | undefined,
    actual: string | string[] | undefined,
    score: number
  ) => {
    const formatValue = (value: string | string[] | undefined) => {
      if (!value) return 'Not specified'
      if (Array.isArray(value)) return value.join(', ')
      return value
    }

    const isCorrect = score > 0
    const isPartiallyCorrect = score > 0 && score < 100

    return (
      <View style={styles.comparisonRow} key={label}>
        <Text style={styles.comparisonLabel}>{label}</Text>
        
        <View style={styles.comparisonValues}>
          <View style={styles.guessContainer}>
            <Text style={styles.guessLabel}>Your Guess</Text>
            <Text style={[
              styles.guessValue,
              isCorrect && styles.correctGuess,
              isPartiallyCorrect && styles.partialGuess
            ]}>
              {formatValue(guess)}
            </Text>
          </View>
          
          <View style={styles.actualContainer}>
            <Text style={styles.actualLabel}>Actual</Text>
            <Text style={styles.actualValue}>
              {formatValue(actual)}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.categoryScore,
            { color: getScoreColor(score) }
          ]}>
            {score > 0 ? `+${score}` : '0'} pts
          </Text>
          {isCorrect && (
            <Text style={styles.checkMark}>
              {score === 100 ? '✅' : '✓'}
            </Text>
          )}
        </View>
      </View>
    )
  }

  const wine = result.tasting_note?.wine

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(result)}
      activeOpacity={0.7}
    >
      {/* Header with Overall Score */}
      <View style={styles.header}>
        <View style={styles.wineInfo}>
          {wine?.image_url && (
            <Image source={{ uri: wine.image_url }} style={styles.wineImage} />
          )}
          <View style={styles.wineDetails}>
            <Text style={styles.wineName}>{wine?.name || 'Unknown Wine'}</Text>
            <Text style={styles.wineProducer}>
              {wine?.producer}
              {wine?.vintage && ` • ${wine.vintage}`}
            </Text>
            <Text style={styles.tastingDate}>
              Blind tasting on {formatDate(result.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreHeader}>
          <View style={[
            styles.overallScore,
            { backgroundColor: getScoreColor(result.accuracy_score) }
          ]}>
            <Text style={styles.scoreNumber}>{result.accuracy_score}</Text>
            <Text style={styles.scoreGrade}>{getScoreGrade(result.accuracy_score)}</Text>
          </View>
          <Text style={styles.scoreLabel}>Overall Score</Text>
        </View>
      </View>

      {/* Breakdown Scores */}
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Score Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {[
            { label: 'Wine Type', score: result.breakdown.wine_type, max: 25 },
            { label: 'Grape Variety', score: result.breakdown.grape_variety, max: 30 },
            { label: 'Region', score: result.breakdown.region, max: 25 },
            { label: 'Vintage', score: result.breakdown.vintage, max: 20 },
          ].map(({ label, score, max }) => (
            <View key={label} style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>{label}</Text>
              <Text style={[
                styles.breakdownScore,
                { color: getScoreColor((score / max) * 100) }
              ]}>
                {score}/{max}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Detailed Comparison */}
      {showComparison && (
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Guess vs Reality</Text>
          
          {renderComparisonRow(
            'Wine Type',
            result.guess.wine_type,
            wine?.wine_type,
            result.breakdown.wine_type
          )}
          
          {renderComparisonRow(
            'Grape Variety',
            result.guess.grape_variety,
            wine?.grape_variety,
            result.breakdown.grape_variety
          )}
          
          {renderComparisonRow(
            'Region',
            result.guess.region || result.guess.country,
            wine?.region || wine?.country,
            result.breakdown.region
          )}
          
          {result.guess.vintage_range && wine?.vintage && renderComparisonRow(
            'Vintage',
            `${result.guess.vintage_range.min}-${result.guess.vintage_range.max}`,
            wine.vintage.toString(),
            result.breakdown.vintage
          )}
        </View>
      )}

      {/* Reasoning */}
      {result.guess.reasoning && (
        <View style={styles.reasoningSection}>
          <Text style={styles.reasoningTitle}>Your Reasoning</Text>
          <Text style={styles.reasoningText} numberOfLines={3}>
            {result.guess.reasoning}
          </Text>
        </View>
      )}

      {/* Confidence */}
      <View style={styles.confidenceSection}>
        <Text style={styles.confidenceLabel}>
          Confidence Level: {result.guess.confidence}/5
        </Text>
        <View style={styles.confidenceBar}>
          <View 
            style={[
              styles.confidenceFill,
              { width: `${((result.guess.confidence || 0) / 5) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  wineInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  wineImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  wineDetails: {
    flex: 1,
  },
  wineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  wineProducer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  tastingDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  scoreHeader: {
    alignItems: 'center',
  },
  overallScore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreGrade: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  breakdownContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  breakdownScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  comparisonSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  comparisonRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  comparisonValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  guessContainer: {
    flex: 1,
    marginRight: 8,
  },
  guessLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  guessValue: {
    fontSize: 13,
    color: '#374151',
  },
  correctGuess: {
    color: '#059669',
    fontWeight: '600',
  },
  partialGuess: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  actualContainer: {
    flex: 1,
    marginLeft: 8,
  },
  actualLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  actualValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 16,
    color: '#059669',
  },
  reasoningSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  confidenceSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
})