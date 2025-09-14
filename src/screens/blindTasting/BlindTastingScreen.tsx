import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainTabParamList } from '@/navigation/types'
import { BlindTastingGuessForm } from '@/components/blindTasting/BlindTastingGuessForm'
import { BlindTastingResultCard } from '@/components/blindTasting/BlindTastingResultCard'
import { BlindTastingService, BlindTastingGuess } from '@/services/api/blindTasting'

type BlindTastingScreenNavigationProp = NativeStackNavigationProp<
  MainTabParamList,
  'BlindTasting'
>

type BlindTastingScreenProps = NativeStackScreenProps<
  MainTabParamList,
  'BlindTasting'
>

export default function BlindTastingScreen() {
  const navigation = useNavigation<BlindTastingScreenNavigationProp>()
  const route = useRoute<BlindTastingScreenProps['route']>()
  const { tastingNoteId } = route.params
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)

  const handleSubmitGuess = async (guess: BlindTastingGuess) => {
    setLoading(true)
    try {
      const { result, error } = await BlindTastingService.submitBlindTastingGuess(
        tastingNoteId,
        guess
      )

      if (error) {
        Alert.alert('Error', `Failed to submit guess: ${error}`)
        return
      }

      if (result) {
        setResult(result)
        setShowResult(true)
        
        // Show success message
        const scoreMessage = getScoreMessage(result.accuracy_score)
        Alert.alert(
          'Assessment Complete!',
          `Your accuracy score: ${result.accuracy_score}/100\n${scoreMessage}`,
          [{ text: 'View Results', onPress: () => {} }]
        )
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit blind tasting guess')
    } finally {
      setLoading(false)
    }
  }

  const getScoreMessage = (score: number): string => {
    if (score >= 90) return '🏆 Outstanding! Master sommelier level performance.'
    if (score >= 80) return '🌟 Excellent work! You have a well-trained palate.'
    if (score >= 70) return '👏 Very good! Your wine knowledge is strong.'
    if (score >= 60) return '👍 Good effort! Keep practicing to improve.'
    if (score >= 50) return '📚 Not bad! Focus on the areas that need work.'
    return '🎯 Keep learning! Every tasting builds your skills.'
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const handleViewAllResults = () => {
    navigation.navigate('BlindTastingHistory')
  }

  return (
    <SafeAreaView style={styles.container}>
      {showResult && result ? (
        <View style={styles.resultContainer}>
          <BlindTastingResultCard 
            result={result} 
            showComparison={true}
          />
          {/* Navigation buttons could go here */}
        </View>
      ) : (
        <BlindTastingGuessForm
          onSubmit={handleSubmitGuess}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  resultContainer: {
    flex: 1,
    padding: 16,
  },
})