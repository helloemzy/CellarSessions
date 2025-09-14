import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PushNotificationService } from '@/services/api/pushNotifications'
import { useAuthStore } from '@/stores/auth/authStore'

interface NotificationPreferences {
  squad_activities: boolean
  likes: boolean
  comments: boolean
  challenges: boolean
  member_updates: boolean
}

interface NotificationSettingsState {
  enabled: boolean
  preferences: NotificationPreferences
  pushTokenRegistered: boolean
}

interface SettingItemProps {
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  icon?: string
}

function SettingItem({ title, description, value, onValueChange, disabled = false, icon }: SettingItemProps) {
  return (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingContent}>
        <View style={styles.settingHeader}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={20} 
              color={disabled ? "#9CA3AF" : "#7C3AED"} 
              style={styles.settingIcon}
            />
          )}
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
        </View>
        <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#F3F4F6', true: '#C4B5FD' }}
        thumbColor={value ? '#7C3AED' : '#FFFFFF'}
        ios_backgroundColor="#F3F4F6"
      />
    </View>
  )
}

export function NotificationSettingsScreen() {
  const { user } = useAuthStore()
  const [settings, setSettings] = useState<NotificationSettingsState>({
    enabled: false,
    preferences: {
      squad_activities: true,
      likes: true,
      comments: true,
      challenges: true,
      member_updates: true,
    },
    pushTokenRegistered: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load current notification settings
  useEffect(() => {
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      setLoading(true)
      const { settings: userSettings, error } = await PushNotificationService.getNotificationSettings()
      
      if (error) {
        Alert.alert('Error', `Failed to load notification settings: ${error}`)
        return
      }

      if (userSettings) {
        setSettings({
          enabled: userSettings.enabled,
          preferences: userSettings.preferences as NotificationPreferences,
          pushTokenRegistered: userSettings.enabled,
        })
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const requestNotificationPermissions = async () => {
    try {
      setSaving(true)

      const { granted, token, error } = await PushNotificationService.requestPermissions()

      if (!granted) {
        Alert.alert(
          'Permission Required',
          error || 'Push notifications require permission to work. Please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real app, you'd open device settings
              Alert.alert('Settings', 'Please enable notifications in your device settings')
            }}
          ]
        )
        return
      }

      if (token) {
        const { success, error: saveError } = await PushNotificationService.savePushToken(token)
        
        if (!success) {
          Alert.alert('Error', `Failed to register for notifications: ${saveError}`)
          return
        }

        setSettings(prev => ({
          ...prev,
          enabled: true,
          pushTokenRegistered: true,
        }))

        Alert.alert('Success', 'Push notifications have been enabled!')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to setup push notifications')
    } finally {
      setSaving(false)
    }
  }

  const updateNotificationPreferences = async (newPreferences: NotificationPreferences) => {
    try {
      setSaving(true)

      const { success, error } = await PushNotificationService.updateNotificationPreferences(newPreferences)

      if (!success) {
        Alert.alert('Error', `Failed to update preferences: ${error}`)
        return
      }

      setSettings(prev => ({
        ...prev,
        preferences: newPreferences,
      }))
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleMainToggle = async (enabled: boolean) => {
    if (enabled && !settings.pushTokenRegistered) {
      await requestNotificationPermissions()
    } else {
      // For disabling, we just update the local state and preferences
      setSettings(prev => ({ ...prev, enabled }))
      
      if (!enabled) {
        await updateNotificationPreferences({
          squad_activities: false,
          likes: false,
          comments: false,
          challenges: false,
          member_updates: false,
        })
      } else {
        // Re-enable with previous preferences
        await updateNotificationPreferences(settings.preferences)
      }
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = {
      ...settings.preferences,
      [key]: value,
    }
    
    setSettings(prev => ({
      ...prev,
      preferences: newPreferences,
    }))
    
    updateNotificationPreferences(newPreferences)
  }

  const testNotification = () => {
    Alert.alert(
      'Test Notification',
      'In a production app, this would send a test push notification to verify everything is working correctly.'
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    )
  }

  const isMainEnabled = settings.enabled && settings.pushTokenRegistered

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Control when and how you receive notifications from Cellar Sessions
        </Text>
      </View>

      {/* Main Toggle */}
      <View style={styles.section}>
        <SettingItem
          title="Push Notifications"
          description="Receive notifications on this device"
          value={isMainEnabled}
          onValueChange={handleMainToggle}
          icon="notifications"
        />
      </View>

      {/* Notification Type Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        
        <SettingItem
          title="Squad Activities"
          description="New tasting notes, challenges, and updates from your squads"
          value={settings.preferences.squad_activities}
          onValueChange={(value) => handlePreferenceChange('squad_activities', value)}
          disabled={!isMainEnabled}
          icon="people"
        />

        <SettingItem
          title="Likes"
          description="When someone likes your tasting notes"
          value={settings.preferences.likes}
          onValueChange={(value) => handlePreferenceChange('likes', value)}
          disabled={!isMainEnabled}
          icon="heart"
        />

        <SettingItem
          title="Comments"
          description="When someone comments on your tasting notes"
          value={settings.preferences.comments}
          onValueChange={(value) => handlePreferenceChange('comments', value)}
          disabled={!isMainEnabled}
          icon="chatbubble"
        />

        <SettingItem
          title="Challenges"
          description="New wine challenges and blind tasting competitions"
          value={settings.preferences.challenges}
          onValueChange={(value) => handlePreferenceChange('challenges', value)}
          disabled={!isMainEnabled}
          icon="trophy"
        />

        <SettingItem
          title="Member Updates"
          description="When new members join your squads"
          value={settings.preferences.member_updates}
          onValueChange={(value) => handlePreferenceChange('member_updates', value)}
          disabled={!isMainEnabled}
          icon="person-add"
        />
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Options</Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, (!isMainEnabled || saving) && styles.actionButtonDisabled]} 
          onPress={testNotification}
          disabled={!isMainEnabled || saving}
        >
          <Ionicons name="send" size={20} color={!isMainEnabled || saving ? "#9CA3AF" : "#7C3AED"} />
          <Text style={[styles.actionButtonText, (!isMainEnabled || saving) && styles.actionButtonTextDisabled]}>
            Send Test Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={loadNotificationSettings}>
          <Ionicons name="refresh" size={20} color="#7C3AED" />
          <Text style={styles.actionButtonText}>Refresh Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Status Information */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>Status Information</Text>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Push Token Registered:</Text>
          <Text style={[styles.statusValue, settings.pushTokenRegistered ? styles.statusSuccess : styles.statusError]}>
            {settings.pushTokenRegistered ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Notifications Enabled:</Text>
          <Text style={[styles.statusValue, settings.enabled ? styles.statusSuccess : styles.statusError]}>
            {settings.enabled ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.savingText}>Updating settings...</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingIcon: {
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingTitleDisabled: {
    color: '#9CA3AF',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingDescriptionDisabled: {
    color: '#D1D5DB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7C3AED',
    marginLeft: 8,
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF',
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusSuccess: {
    color: '#059669',
  },
  statusError: {
    color: '#DC2626',
  },
  savingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
})