import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants'

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Cellar Sessions</Text>
          <Text style={styles.subtitle}>
            Your wine education journey continues here
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.placeholder}>
            • Start a new tasting session{'\n'}
            • Review your tasting history{'\n'}
            • Check your accuracy scores{'\n'}
            • Connect with your squad
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.placeholder}>
            Your recent tastings and interactions will appear here
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: SPACING.BASE,
  },
  header: {
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.XL,
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['3XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.GRAY_900,
    marginBottom: SPACING.BASE,
  },
  placeholder: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.GRAY_600,
    lineHeight: TYPOGRAPHY.LINE_HEIGHT.RELAXED,
  },
})