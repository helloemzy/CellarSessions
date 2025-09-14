import { useState, useEffect, useCallback } from 'react'
import { SocialService, SocialInteraction } from '@/services/api/social'
import { useAuthStore } from '@/stores/auth/authStore'

interface UseSocialInteractionsReturn {
  socialData: SocialInteraction | null
  isLoading: boolean
  isLiking: boolean
  isCommenting: boolean
  error: string | null
  toggleLike: () => Promise<void>
  addComment: (content: string, parentId?: string) => Promise<void>
  refreshSocialData: () => Promise<void>
}

export function useSocialInteractions(
  tastingNoteId: string,
  initialData?: SocialInteraction
): UseSocialInteractionsReturn {
  const { user } = useAuthStore()
  const [socialData, setSocialData] = useState<SocialInteraction | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSocialData = useCallback(async () => {
    try {
      setError(null)
      const { data, error: loadError } = await SocialService.getTastingNoteSocial(
        tastingNoteId, 
        user?.id
      )
      
      if (loadError) {
        setError(loadError)
      } else if (data) {
        setSocialData(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social data')
    } finally {
      setIsLoading(false)
    }
  }, [tastingNoteId, user?.id])

  useEffect(() => {
    if (!initialData) {
      loadSocialData()
    }
  }, [loadSocialData, initialData])

  const toggleLike = useCallback(async () => {
    if (!user || isLiking) return

    try {
      setIsLiking(true)
      setError(null)

      const { success, is_liked, like_count, error: likeError } = 
        await SocialService.toggleLike(tastingNoteId)

      if (success && socialData) {
        setSocialData({
          ...socialData,
          is_liked,
          like_count
        })
      } else if (likeError) {
        setError(likeError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle like')
    } finally {
      setIsLiking(false)
    }
  }, [user, tastingNoteId, socialData, isLiking])

  const addComment = useCallback(async (content: string, parentId?: string) => {
    if (!user || !content.trim() || isCommenting) return

    try {
      setIsCommenting(true)
      setError(null)

      const { comment, error: commentError } = await SocialService.addComment(
        tastingNoteId,
        content,
        parentId
      )

      if (comment) {
        // Refresh social data to get updated comments
        await loadSocialData()
      } else if (commentError) {
        setError(commentError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setIsCommenting(false)
    }
  }, [user, tastingNoteId, isCommenting, loadSocialData])

  const refreshSocialData = useCallback(async () => {
    setIsLoading(true)
    await loadSocialData()
  }, [loadSocialData])

  return {
    socialData,
    isLoading,
    isLiking,
    isCommenting,
    error,
    toggleLike,
    addComment,
    refreshSocialData,
  }
}

// Hook for managing user social stats
export function useUserSocialStats(userId?: string) {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const loadStats = async () => {
      try {
        setError(null)
        const { stats: userStats, error: statsError } = await SocialService.getUserSocialStats(userId)
        
        if (statsError) {
          setError(statsError)
        } else {
          setStats(userStats)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [userId])

  return { stats, isLoading, error }
}

// Hook for trending tasting notes
export function useTrendingTastingNotes(limit: number = 10) {
  const [trendingNotes, setTrendingNotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrendingNotes = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      const { tastingNotes, error: trendingError } = await SocialService.getTrendingTastingNotes(limit)
      
      if (trendingError) {
        setError(trendingError)
      } else {
        setTrendingNotes(tastingNotes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending notes')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    loadTrendingNotes()
  }, [loadTrendingNotes])

  const refreshTrending = useCallback(() => {
    loadTrendingNotes()
  }, [loadTrendingNotes])

  return {
    trendingNotes,
    isLoading,
    error,
    refreshTrending,
  }
}