import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants'

export function TastingHistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tasting History</Text>
        <Text style={styles.placeholder}>
          Your tasting history will appear here
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