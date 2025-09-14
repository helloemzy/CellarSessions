import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants'

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.text}>Loading Cellar Sessions...</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    marginTop: SPACING.BASE,
  },
})