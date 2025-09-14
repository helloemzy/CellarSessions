import { supabase } from '@/lib/supabase'
import { PushNotificationService } from './pushNotifications'

export interface Like {
  id: string
  tasting_note_id: string
  user_id: string
  created_at: string
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export interface Comment {
  id: string
  tasting_note_id: string
  user_id: string
  content: string
  parent_comment_id?: string | null
  created_at: string
  updated_at?: string
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
    wine_education_background: string | null
  }
  replies?: Comment[]
  like_count?: number
  is_liked?: boolean
}

export interface SocialInteraction {
  likes: Like[]
  comments: Comment[]
  like_count: number
  comment_count: number
  is_liked: boolean
}

export class SocialService {
  /**
   * Get all social interactions for a tasting note
   */
  static async getTastingNoteSocial(
    tastingNoteId: string, 
    userId?: string
  ): Promise<{ 
    data: SocialInteraction | null
    error: string | null 
  }> {
    try {
      // Get likes
      const { data: likes, error: likesError } = await supabase
        .from('tasting_note_likes')
        .select(`
          id,
          user_id,
          created_at,
          profiles!tasting_note_likes_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('tasting_note_id', tastingNoteId)
        .order('created_at', { ascending: false })

      if (likesError) {
        return { data: null, error: likesError.message }
      }

      // Get comments with replies
      const { data: comments, error: commentsError } = await supabase
        .from('tasting_note_comments')
        .select(`
          id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          updated_at,
          profiles!tasting_note_comments_user_id_fkey (
            display_name,
            avatar_url,
            wine_education_background
          )
        `)
        .eq('tasting_note_id', tastingNoteId)
        .order('created_at', { ascending: true })

      if (commentsError) {
        return { data: null, error: commentsError.message }
      }

      // Process likes
      const processedLikes: Like[] = (likes || []).map(like => ({
        id: like.id,
        tasting_note_id: tastingNoteId,
        user_id: like.user_id,
        created_at: like.created_at,
        user_profile: {
          display_name: like.profiles?.display_name || null,
          avatar_url: like.profiles?.avatar_url || null,
        }
      }))

      // Process comments and organize replies
      const processedComments: Comment[] = []
      const commentMap = new Map<string, Comment>()

      // First pass: create all comments
      (comments || []).forEach(comment => {
        const processedComment: Comment = {
          id: comment.id,
          tasting_note_id: tastingNoteId,
          user_id: comment.user_id,
          content: comment.content,
          parent_comment_id: comment.parent_comment_id,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user_profile: {
            display_name: comment.profiles?.display_name || null,
            avatar_url: comment.profiles?.avatar_url || null,
            wine_education_background: comment.profiles?.wine_education_background || null,
          },
          replies: []
        }
        commentMap.set(comment.id, processedComment)
      })

      // Second pass: organize replies
      commentMap.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id)
          if (parent) {
            parent.replies = parent.replies || []
            parent.replies.push(comment)
          }
        } else {
          processedComments.push(comment)
        }
      })

      const socialData: SocialInteraction = {
        likes: processedLikes,
        comments: processedComments,
        like_count: processedLikes.length,
        comment_count: comments?.length || 0,
        is_liked: userId ? processedLikes.some(like => like.user_id === userId) : false
      }

      return { data: socialData, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch social interactions'
      }
    }
  }

  /**
   * Toggle like on a tasting note
   */
  static async toggleLike(tastingNoteId: string): Promise<{
    success: boolean
    is_liked: boolean
    like_count: number
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, is_liked: false, like_count: 0, error: 'User not authenticated' }
      }

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('tasting_note_likes')
        .select('id')
        .eq('tasting_note_id', tastingNoteId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError) {
        return { success: false, is_liked: false, like_count: 0, error: checkError.message }
      }

      if (existingLike) {
        // Remove like
        const { error: deleteError } = await supabase
          .from('tasting_note_likes')
          .delete()
          .eq('id', existingLike.id)

        if (deleteError) {
          return { success: false, is_liked: true, like_count: 0, error: deleteError.message }
        }
      } else {
        // Add like
        const { error: insertError } = await supabase
          .from('tasting_note_likes')
          .insert({
            tasting_note_id: tastingNoteId,
            user_id: user.id
          })

        if (insertError) {
          return { success: false, is_liked: false, like_count: 0, error: insertError.message }
        }

        // Send push notification for new like (async, don't wait)
        PushNotificationService.sendLikeNotification(tastingNoteId, user.id)
          .catch(error => console.warn('Failed to send like notification:', error))
      }

      // Get updated like count
      const { count: likeCount, error: countError } = await supabase
        .from('tasting_note_likes')
        .select('*', { count: 'exact', head: true })
        .eq('tasting_note_id', tastingNoteId)

      if (countError) {
        return { 
          success: true, 
          is_liked: !existingLike, 
          like_count: 0, 
          error: `Like toggled but failed to get count: ${countError.message}` 
        }
      }

      return {
        success: true,
        is_liked: !existingLike,
        like_count: likeCount || 0,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        is_liked: false,
        like_count: 0,
        error: error instanceof Error ? error.message : 'Failed to toggle like'
      }
    }
  }

  /**
   * Add comment to a tasting note
   */
  static async addComment(
    tastingNoteId: string, 
    content: string, 
    parentCommentId?: string
  ): Promise<{
    comment: Comment | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { comment: null, error: 'User not authenticated' }
      }

      if (!content.trim()) {
        return { comment: null, error: 'Comment content cannot be empty' }
      }

      if (content.length > 1000) {
        return { comment: null, error: 'Comment is too long (max 1000 characters)' }
      }

      const { data: newComment, error } = await supabase
        .from('tasting_note_comments')
        .insert({
          tasting_note_id: tastingNoteId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId || null
        })
        .select(`
          id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          profiles!tasting_note_comments_user_id_fkey (
            display_name,
            avatar_url,
            wine_education_background
          )
        `)
        .single()

      if (error) {
        return { comment: null, error: error.message }
      }

      const comment: Comment = {
        id: newComment.id,
        tasting_note_id: tastingNoteId,
        user_id: newComment.user_id,
        content: newComment.content,
        parent_comment_id: newComment.parent_comment_id,
        created_at: newComment.created_at,
        user_profile: {
          display_name: newComment.profiles?.display_name || null,
          avatar_url: newComment.profiles?.avatar_url || null,
          wine_education_background: newComment.profiles?.wine_education_background || null,
        },
        replies: []
      }

      // Send push notification for new comment (async, don't wait)
      PushNotificationService.sendCommentNotification(tastingNoteId, user.id, content)
        .catch(error => console.warn('Failed to send comment notification:', error))

      return { comment, error: null }
    } catch (error) {
      return {
        comment: null,
        error: error instanceof Error ? error.message : 'Failed to add comment'
      }
    }
  }

  /**
   * Update comment
   */
  static async updateComment(
    commentId: string, 
    content: string
  ): Promise<{
    comment: Comment | null
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { comment: null, error: 'User not authenticated' }
      }

      if (!content.trim()) {
        return { comment: null, error: 'Comment content cannot be empty' }
      }

      if (content.length > 1000) {
        return { comment: null, error: 'Comment is too long (max 1000 characters)' }
      }

      const { data: updatedComment, error } = await supabase
        .from('tasting_note_comments')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user.id) // Ensure user can only update their own comments
        .select(`
          id,
          tasting_note_id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          updated_at,
          profiles!tasting_note_comments_user_id_fkey (
            display_name,
            avatar_url,
            wine_education_background
          )
        `)
        .single()

      if (error) {
        return { comment: null, error: error.message }
      }

      const comment: Comment = {
        id: updatedComment.id,
        tasting_note_id: updatedComment.tasting_note_id,
        user_id: updatedComment.user_id,
        content: updatedComment.content,
        parent_comment_id: updatedComment.parent_comment_id,
        created_at: updatedComment.created_at,
        updated_at: updatedComment.updated_at,
        user_profile: {
          display_name: updatedComment.profiles?.display_name || null,
          avatar_url: updatedComment.profiles?.avatar_url || null,
          wine_education_background: updatedComment.profiles?.wine_education_background || null,
        },
        replies: []
      }

      return { comment, error: null }
    } catch (error) {
      return {
        comment: null,
        error: error instanceof Error ? error.message : 'Failed to update comment'
      }
    }
  }

  /**
   * Delete comment
   */
  static async deleteComment(commentId: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('tasting_note_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id) // Ensure user can only delete their own comments

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete comment'
      }
    }
  }

  /**
   * Get user's social activity summary
   */
  static async getUserSocialStats(userId: string): Promise<{
    stats: {
      total_likes_given: number
      total_likes_received: number  
      total_comments_made: number
      total_comments_received: number
      engagement_score: number
    } | null
    error: string | null
  }> {
    try {
      // Get likes given by user
      const { count: likesGiven, error: likesGivenError } = await supabase
        .from('tasting_note_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (likesGivenError) {
        return { stats: null, error: likesGivenError.message }
      }

      // Get likes received by user (on their tasting notes)
      const { count: likesReceived, error: likesReceivedError } = await supabase
        .from('tasting_note_likes')
        .select(`
          *,
          tasting_notes!inner(user_id)
        `, { count: 'exact', head: true })
        .eq('tasting_notes.user_id', userId)

      if (likesReceivedError) {
        return { stats: null, error: likesReceivedError.message }
      }

      // Get comments made by user
      const { count: commentsMade, error: commentsMadeError } = await supabase
        .from('tasting_note_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (commentsMadeError) {
        return { stats: null, error: commentsMadeError.message }
      }

      // Get comments received by user (on their tasting notes)
      const { count: commentsReceived, error: commentsReceivedError } = await supabase
        .from('tasting_note_comments')
        .select(`
          *,
          tasting_notes!inner(user_id)
        `, { count: 'exact', head: true })
        .eq('tasting_notes.user_id', userId)

      if (commentsReceivedError) {
        return { stats: null, error: commentsReceivedError.message }
      }

      // Calculate engagement score (weighted combination of interactions)
      const totalLikes = (likesGiven || 0) + (likesReceived || 0)
      const totalComments = (commentsMade || 0) + (commentsReceived || 0)
      const engagementScore = Math.round((totalLikes * 1 + totalComments * 2) / 2)

      const stats = {
        total_likes_given: likesGiven || 0,
        total_likes_received: likesReceived || 0,
        total_comments_made: commentsMade || 0,
        total_comments_received: commentsReceived || 0,
        engagement_score: engagementScore
      }

      return { stats, error: null }
    } catch (error) {
      return {
        stats: null,
        error: error instanceof Error ? error.message : 'Failed to get social stats'
      }
    }
  }

  /**
   * Get trending tasting notes based on social engagement
   */
  static async getTrendingTastingNotes(limit: number = 10): Promise<{
    tastingNotes: Array<{
      id: string
      wine_name: string
      rating: number
      user_profile: {
        display_name: string | null
        avatar_url: string | null
      }
      like_count: number
      comment_count: number
      engagement_score: number
      created_at: string
    }>
    error: string | null
  }> {
    try {
      // This would typically be a materialized view or computed on the backend
      // For now, we'll get recent tasting notes with their engagement metrics
      const { data: trendingNotes, error } = await supabase
        .from('tasting_notes')
        .select(`
          id,
          wine:wines(name),
          rating,
          created_at,
          visibility,
          user_id,
          profiles!tasting_notes_user_id_fkey(
            display_name,
            avatar_url
          )
        `)
        .eq('visibility', 'PUBLIC')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(50) // Get more to calculate engagement

      if (error) {
        return { tastingNotes: [], error: error.message }
      }

      // Calculate engagement for each note (this could be optimized with DB functions)
      const notesWithEngagement = await Promise.all(
        (trendingNotes || []).map(async (note) => {
          const { data: socialData } = await this.getTastingNoteSocial(note.id)
          
          const likeCount = socialData?.like_count || 0
          const commentCount = socialData?.comment_count || 0
          const engagementScore = likeCount * 1 + commentCount * 3

          return {
            id: note.id,
            wine_name: note.wine?.name || 'Unknown Wine',
            rating: note.rating,
            user_profile: {
              display_name: note.profiles?.display_name || null,
              avatar_url: note.profiles?.avatar_url || null,
            },
            like_count: likeCount,
            comment_count: commentCount,
            engagement_score: engagementScore,
            created_at: note.created_at
          }
        })
      )

      // Sort by engagement score and return top results
      const trending = notesWithEngagement
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, limit)

      return { tastingNotes: trending, error: null }
    } catch (error) {
      return {
        tastingNotes: [],
        error: error instanceof Error ? error.message : 'Failed to get trending notes'
      }
    }
  }
}