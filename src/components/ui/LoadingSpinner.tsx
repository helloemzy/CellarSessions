import React from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'large'
  color?: string
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'large',
  color = '#7C3AED' 
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
})