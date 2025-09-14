import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import { SharingService, ShareTastingNoteRequest } from '@/services/api/sharing'
import { SquadsService, Squad } from '@/services/api/squads'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ShareTastingNoteModalProps {
  visible: boolean
  tastingNoteId: string
  wineName?: string
  onClose: () => void
  onShare?: () => void
}

export function ShareTastingNoteModal({
  visible,
  tastingNoteId,
  wineName = 'this tasting note',
  onClose,
  onShare,
}: ShareTastingNoteModalProps) {
  const [shareType, setShareType] = useState<'SQUAD' | 'PUBLIC' | null>(null)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [message, setMessage] = useState('')
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSquads, setLoadingSquads] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (visible) {
      loadUserSquads()
    } else {
      // Reset state when modal closes
      setShareType(null)
      setSelectedSquad(null)
      setMessage('')
    }
  }, [visible])

  const loadUserSquads = async () => {
    setLoadingSquads(true)
    try {
      const { squads, error } = await SquadsService.getUserSquads({}, 0, 50)
      if (error) {
        Alert.alert('Error', `Failed to load squads: ${error}`)
      } else {
        setSquads(squads)
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load your squads')
    } finally {
      setLoadingSquads(false)
    }
  }

  const handleShare = async () => {
    if (!shareType) {
      Alert.alert('Error', 'Please select where to share')
      return
    }

    if (shareType === 'SQUAD' && !selectedSquad) {
      Alert.alert('Error', 'Please select a squad to share to')
      return
    }

    setSharing(true)
    try {
      const shareData: ShareTastingNoteRequest = {
        tastingNoteId,
        shareType,
        squadId: shareType === 'SQUAD' ? selectedSquad?.id : undefined,
        message: message.trim() || undefined,
      }

      const { error } = await SharingService.shareTastingNote(shareData)
      
      if (error) {
        Alert.alert('Error', `Failed to share: ${error}`)
        return
      }

      Alert.alert(
        'Success!',
        `Successfully shared ${wineName} ${shareType === 'SQUAD' ? `to ${selectedSquad?.name}` : 'publicly'}`,
        [{ text: 'OK', onPress: handleClose }]
      )
      
      onShare?.()
    } catch (err) {
      Alert.alert('Error', 'Failed to share tasting note')
    } finally {
      setSharing(false)
    }
  }

  const handleClose = () => {
    if (sharing) return
    onClose()
  }

  const getShareTypeDescription = () => {
    if (shareType === 'SQUAD') {
      return selectedSquad 
        ? `Share with ${selectedSquad.name} members`
        : 'Share with squad members'
    }
    if (shareType === 'PUBLIC') {
      return 'Share publicly with all Cellar Sessions users'
    }
    return 'Select where to share this tasting note'
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={sharing}>
            <Text style={[styles.cancelText, sharing && styles.disabledText]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share Tasting Note</Text>
          <TouchableOpacity 
            onPress={handleShare} 
            disabled={!shareType || sharing || (shareType === 'SQUAD' && !selectedSquad)}
          >
            <Text style={[
              styles.shareText, 
              (!shareType || (shareType === 'SQUAD' && !selectedSquad) || sharing) && styles.disabledText
            ]}>
              {sharing ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share {wineName}</Text>
            <Text style={styles.sectionDescription}>
              {getShareTypeDescription()}
            </Text>
          </View>

          {/* Share Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Share with:</Text>
            
            <TouchableOpacity
              style={[
                styles.shareOption,
                shareType === 'PUBLIC' && styles.selectedOption
              ]}
              onPress={() => {
                setShareType('PUBLIC')
                setSelectedSquad(null)
              }}
              disabled={sharing}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>🌍</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Everyone</Text>
                  <Text style={styles.optionDescription}>
                    Share publicly with all Cellar Sessions users
                  </Text>
                </View>
              </View>
              {shareType === 'PUBLIC' && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shareOption,
                shareType === 'SQUAD' && styles.selectedOption
              ]}
              onPress={() => setShareType('SQUAD')}
              disabled={sharing || loadingSquads || squads.length === 0}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>👥</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Squad</Text>
                  <Text style={styles.optionDescription}>
                    Share with members of your wine squads
                  </Text>
                </View>
              </View>
              {shareType === 'SQUAD' && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>

            {squads.length === 0 && !loadingSquads && (
              <Text style={styles.noSquadsText}>
                You're not a member of any squads yet. Join or create a squad to share with your wine community!
              </Text>
            )}
          </View>

          {/* Squad Selection */}
          {shareType === 'SQUAD' && squads.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Select Squad:</Text>
              {loadingSquads ? (
                <LoadingSpinner size="small" />
              ) : (
                <View style={styles.squadList}>
                  {squads.map((squad) => (
                    <TouchableOpacity
                      key={squad.id}
                      style={[
                        styles.squadOption,
                        selectedSquad?.id === squad.id && styles.selectedSquad
                      ]}
                      onPress={() => setSelectedSquad(squad)}
                      disabled={sharing}
                    >
                      <View style={styles.squadInfo}>
                        <Text style={styles.squadName}>{squad.name}</Text>
                        <Text style={styles.squadMeta}>
                          {squad.member_count || 0} members
                          {squad.is_private && ' • 🔒 Private'}
                        </Text>
                      </View>
                      {selectedSquad?.id === squad.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.label}>Message (optional):</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a note about why you're sharing this tasting..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={280}
              textAlignVertical="top"
              editable={!sharing}
            />
            <Text style={styles.characterCount}>{message.length}/280</Text>
          </View>

          {/* Share Preview */}
          {shareType && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview:</Text>
              <View style={styles.preview}>
                <Text style={styles.previewText}>
                  🍷 <Text style={styles.previewWine}>{wineName}</Text>
                </Text>
                {message && (
                  <Text style={styles.previewMessage}>"{message}"</Text>
                )}
                <Text style={styles.previewMeta}>
                  Shared {shareType === 'SQUAD' ? `to ${selectedSquad?.name}` : 'publicly'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  shareOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3F4F6',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  checkmark: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '700',
  },
  noSquadsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  squadList: {
    gap: 8,
  },
  squadOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSquad: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3F4F6',
  },
  squadInfo: {
    flex: 1,
  },
  squadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  squadMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 32,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  preview: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  previewText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  previewWine: {
    fontWeight: '600',
  },
  previewMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 20,
  },
  previewMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
})