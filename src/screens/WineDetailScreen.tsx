import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { RootStackParamList } from '@/navigation/types'
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants'

type WineDetailRouteProp = RouteProp<RootStackParamList, 'WineDetail'>

export function WineDetailScreen() {
  const route = useRoute<WineDetailRouteProp>()
  const { wineId } = route.params

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wine Details</Text>
        <Text style={styles.placeholder}>
          Wine details for ID: {wineId} will be displayed here
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    flex: 1,
    padding: SPACING.BASE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['2XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.BASE,
  },
  placeholder: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
  },
})