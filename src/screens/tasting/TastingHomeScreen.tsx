import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TastingStackParamList } from '@/navigation/types'
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants'

type NavigationProp = NativeStackNavigationProp<TastingStackParamList>

export function TastingHomeScreen() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tasting Sessions</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('WSETForm', {})}
        >
          <Text style={styles.buttonText}>Start WSET Tasting</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('BlindTasting')}
        >
          <Text style={styles.buttonText}>Blind Tasting Challenge</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('TastingHistory')}
        >
          <Text style={styles.buttonText}>View Tasting History</Text>
        </TouchableOpacity>
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
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE['2XL'],
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XL,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.BASE,
    borderRadius: BORDER_RADIUS.BASE,
    marginBottom: SPACING.BASE,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
})