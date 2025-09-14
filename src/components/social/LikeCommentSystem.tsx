import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SocialService, SocialInteraction, Comment } from '@/services/api/social'
import { useAuthStore } from '@/stores/auth/authStore'
import { formatDistanceToNow } from 'date-fns'

interface LikeCommentSystemProps {
  tastingNoteId: string
  initialData?: SocialInteraction
  onEngagementChange?: (likeCount: number, commentCount: number) => void
}

interface CommentItemProps {
  comment: Comment
  tastingNoteId: string
  onReply?: (parentId: string) => void
  onUpdate?: () => void
  isReply?: boolean
}

function CommentItem({ 
  comment, 
  tastingNoteId, 
  onReply, 
  onUpdate, 
  isReply = false 
}: CommentItemProps) {
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = async () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false)
      return
    }

    setIsSubmitting(true)
    const { error } = await SocialService.updateComment(comment.id, editText)
    
    if (error) {
      Alert.alert('Error', error)
      setEditText(comment.content)
    } else {
      onUpdate?.()
    }
    
    setIsEditing(false)
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await SocialService.deleteComment(comment.id)
            if (error) {
              Alert.alert('Error', error)
            } else {
              onUpdate?.()
            }
          }
        }
      ]
    )
  }

  const isOwner = user?.id === comment.user_id
  const userName = comment.user_profile?.display_name || 'Wine Enthusiast'
  const education = comment.user_profile?.wine_education_background
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })

  return (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      {/* User Avatar Placeholder */}
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>
          {userName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.commentContent}>
        {/* User Info */}
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{userName}</Text>
          {education && <Text style={styles.commentEducation}>{education}</Text>}
          <Text style={styles.commentTime}>{timeAgo}</Text>
          {comment.updated_at && (
            <Text style={styles.commentEdited}>(edited)</Text>
          )}
        </View>

        {/* Comment Text */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              placeholder="Edit your comment..."
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false)
                  setEditText(comment.content)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={handleEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.commentText}>{comment.content}</Text>
        )}

        {/* Comment Actions */}
        <View style={styles.commentActions}>
          {!isReply && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => onReply?.(comment.id)}
            >
              <Ionicons name="arrow-undo" size={14} color="#6B7280" />
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          )}
          
          {isOwner && !isEditing && (
            <>
              <TouchableOpacity
                style={styles.editCommentButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil" size={14} color="#6B7280" />
                <Text style={styles.editCommentButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={14} color="#DC2626" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.replies}>
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                tastingNoteId={tastingNoteId}
                onUpdate={onUpdate}
                isReply={true}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export function LikeCommentSystem({ 
  tastingNoteId, 
  initialData, 
  onEngagementChange 
}: LikeCommentSystemProps) {
  const { user } = useAuthStore()
  const [socialData, setSocialData] = useState<SocialInteraction | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isLiking, setIsLiking] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)

  const loadSocialData = useCallback(async () => {
    const { data, error } = await SocialService.getTastingNoteSocial(tastingNoteId, user?.id)
    if (data) {
      setSocialData(data)
      onEngagementChange?.(data.like_count, data.comment_count)
    }
    setIsLoading(false)
  }, [tastingNoteId, user?.id, onEngagementChange])

  useEffect(() => {
    if (!initialData) {
      loadSocialData()
    }
  }, [loadSocialData, initialData])

  const handleLike = async () => {
    if (!user) return
    
    setIsLiking(true)
    const { success, is_liked, like_count, error } = await SocialService.toggleLike(tastingNoteId)
    
    if (success && socialData) {
      const updatedData = {
        ...socialData,
        is_liked,
        like_count
      }
      setSocialData(updatedData)
      onEngagementChange?.(like_count, socialData.comment_count)
    } else if (error) {
      Alert.alert('Error', error)
    }
    
    setIsLiking(false)
  }

  const handleComment = async () => {
    if (!user || !commentText.trim()) return

    setIsCommenting(true)
    const { comment, error } = await SocialService.addComment(
      tastingNoteId, 
      commentText, 
      replyToCommentId
    )
    
    if (comment && socialData) {
      // Refresh social data to get updated comments
      await loadSocialData()
      setCommentText('')
      setReplyToCommentId(null)
      setShowComments(true)
    } else if (error) {
      Alert.alert('Error', error)
    }
    
    setIsCommenting(false)
  }

  const handleReply = (parentCommentId: string) => {
    setReplyToCommentId(parentCommentId)
    setShowComments(true)
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading interactions...</Text>
      </View>
    )
  }

  if (!socialData) {
    return null
  }

  const replyingToComment = replyToCommentId 
    ? socialData.comments.find(c => c.id === replyToCommentId)
    : null

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Engagement Bar */}
      <View style={styles.engagementBar}>
        <TouchableOpacity
          style={[styles.likeButton, socialData.is_liked && styles.likedButton]}
          onPress={handleLike}
          disabled={isLiking || !user}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color={socialData.is_liked ? "#FFFFFF" : "#7C3AED"} />
          ) : (
            <Ionicons 
              name={socialData.is_liked ? "heart" : "heart-outline"} 
              size={20} 
              color={socialData.is_liked ? "#FFFFFF" : "#7C3AED"} 
            />
          )}
          <Text style={[
            styles.likeButtonText, 
            socialData.is_liked && styles.likedButtonText
          ]}>
            {socialData.like_count} {socialData.like_count === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commentToggle}
          onPress={() => setShowComments(!showComments)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text style={styles.commentToggleText}>
            {socialData.comment_count} {socialData.comment_count === 1 ? 'Comment' : 'Comments'}
          </Text>
          <Ionicons 
            name={showComments ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {/* Comment Input */}
          {user && (
            <View style={styles.commentInput}>
              {replyingToComment && (
                <View style={styles.replyIndicator}>
                  <Text style={styles.replyIndicatorText}>
                    Replying to {replyingToComment.user_profile?.display_name || 'comment'}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyToCommentId(null)}>
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={replyingToComment ? "Write a reply..." : "Add a comment..."}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[
                    styles.postButton,
                    (!commentText.trim() || isCommenting) && styles.postButtonDisabled
                  ]}
                  onPress={handleComment}
                  disabled={!commentText.trim() || isCommenting}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.characterCount}>
                {commentText.length}/1000
              </Text>
            </View>
          )}

          {/* Comments List */}
          <ScrollView style={styles.commentsList}>
            {socialData.comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                tastingNoteId={tastingNoteId}
                onReply={handleReply}
                onUpdate={loadSocialData}
              />
            ))}
            {socialData.comments.length === 0 && (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={40} color="#D1D5DB" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>
                  Be the first to share your thoughts!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7C3AED',
    marginRight: 12,
  },
  likedButton: {
    backgroundColor: '#7C3AED',
  },
  likeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  likedButtonText: {
    color: '#FFFFFF',
  },
  commentToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentToggleText: {
    marginLeft: 6,
    marginRight: 4,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  commentInput: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  replyIndicatorText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  postButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  commentsList: {
    maxHeight: 400,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  replyItem: {
    marginLeft: 40,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  commentEducation: {
    fontSize: 12,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  commentEdited: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  editContainer: {
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 40,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  replyButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  editCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  editCommentButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 4,
  },
  replies: {
    marginTop: 8,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
})