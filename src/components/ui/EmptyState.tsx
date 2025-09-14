import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'

interface EmptyStateProps {
  title: string
  message: string
  iconName?: string
  actionText?: string
  onActionPress?: () => void
}

export function EmptyState({ 
  title, 
  message, 
  iconName, 
  actionText, 
  onActionPress 
}: EmptyStateProps) {
  const getIconForName = (name: string) => {
    switch (name) {
      case 'wine-glass':
        return '🍷'
      case 'notes':
        return '📝'
      case 'group':
        return '👥'
      case 'activity':
        return '📊'
      default:
        return '🔍'
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{iconName ? getIconForName(iconName) : '📝'}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionText && onActionPress && (
        <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})