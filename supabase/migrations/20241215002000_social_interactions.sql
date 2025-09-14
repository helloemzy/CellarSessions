-- Social Interactions Migration
-- Adds like and comment functionality for tasting notes

-- Create tasting note likes table
CREATE TABLE IF NOT EXISTS tasting_note_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tasting_note_id UUID NOT NULL REFERENCES tasting_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Ensure one like per user per tasting note
    UNIQUE(tasting_note_id, user_id)
);

-- Create tasting note comments table
CREATE TABLE IF NOT EXISTS tasting_note_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tasting_note_id UUID NOT NULL REFERENCES tasting_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES tasting_note_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000 AND char_length(trim(content)) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasting_note_likes_tasting_note_id ON tasting_note_likes(tasting_note_id);
CREATE INDEX IF NOT EXISTS idx_tasting_note_likes_user_id ON tasting_note_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_note_likes_created_at ON tasting_note_likes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasting_note_comments_tasting_note_id ON tasting_note_comments(tasting_note_id);
CREATE INDEX IF NOT EXISTS idx_tasting_note_comments_user_id ON tasting_note_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_note_comments_parent_id ON tasting_note_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_tasting_note_comments_created_at ON tasting_note_comments(created_at ASC);

-- Enable RLS
ALTER TABLE tasting_note_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_note_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasting_note_likes
-- Users can view likes on notes they can see
CREATE POLICY "Users can view likes on accessible tasting notes" ON tasting_note_likes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasting_notes tn 
            WHERE tn.id = tasting_note_likes.tasting_note_id
            AND (
                tn.visibility = 'PUBLIC'
                OR tn.user_id = auth.uid()
                OR (tn.visibility = 'SQUAD' AND EXISTS (
                    SELECT 1 FROM shared_tasting_notes stn 
                    JOIN squad_members sm ON sm.squad_id = stn.squad_id 
                    WHERE stn.tasting_note_id = tn.id AND sm.user_id = auth.uid()
                ))
            )
        )
    );

-- Users can only create/delete their own likes
CREATE POLICY "Users can manage their own likes" ON tasting_note_likes
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for tasting_note_comments
-- Users can view comments on notes they can see
CREATE POLICY "Users can view comments on accessible tasting notes" ON tasting_note_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasting_notes tn 
            WHERE tn.id = tasting_note_comments.tasting_note_id
            AND (
                tn.visibility = 'PUBLIC'
                OR tn.user_id = auth.uid()
                OR (tn.visibility = 'SQUAD' AND EXISTS (
                    SELECT 1 FROM shared_tasting_notes stn 
                    JOIN squad_members sm ON sm.squad_id = stn.squad_id 
                    WHERE stn.tasting_note_id = tn.id AND sm.user_id = auth.uid()
                ))
            )
        )
    );

-- Users can create comments on notes they can see
CREATE POLICY "Users can create comments on accessible tasting notes" ON tasting_note_comments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM tasting_notes tn 
            WHERE tn.id = tasting_note_comments.tasting_note_id
            AND (
                tn.visibility = 'PUBLIC'
                OR tn.user_id = auth.uid()
                OR (tn.visibility = 'SQUAD' AND EXISTS (
                    SELECT 1 FROM shared_tasting_notes stn 
                    JOIN squad_members sm ON sm.squad_id = stn.squad_id 
                    WHERE stn.tasting_note_id = tn.id AND sm.user_id = auth.uid()
                ))
            )
        )
    );

-- Users can update/delete their own comments
CREATE POLICY "Users can manage their own comments" ON tasting_note_comments
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON tasting_note_comments
    FOR DELETE
    USING (user_id = auth.uid());

-- Create function to update comment timestamps
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for comment updates
CREATE TRIGGER update_tasting_note_comments_updated_at
    BEFORE UPDATE ON tasting_note_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_updated_at();

-- Add function to get social engagement stats for a tasting note
CREATE OR REPLACE FUNCTION get_tasting_note_social_stats(note_id UUID, user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    like_count INTEGER;
    comment_count INTEGER;
    is_liked BOOLEAN DEFAULT FALSE;
BEGIN
    -- Get like count
    SELECT COUNT(*) INTO like_count
    FROM tasting_note_likes
    WHERE tasting_note_id = note_id;
    
    -- Get comment count (excluding deleted/hidden)
    SELECT COUNT(*) INTO comment_count
    FROM tasting_note_comments
    WHERE tasting_note_id = note_id;
    
    -- Check if user has liked (if user provided)
    IF user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM tasting_note_likes
            WHERE tasting_note_id = note_id AND tasting_note_likes.user_id = get_tasting_note_social_stats.user_id
        ) INTO is_liked;
    END IF;
    
    RETURN json_build_object(
        'like_count', like_count,
        'comment_count', comment_count,
        'is_liked', is_liked
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get trending tasting notes based on engagement
CREATE OR REPLACE FUNCTION get_trending_tasting_notes(days_back INTEGER DEFAULT 7, note_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    tasting_note_id UUID,
    wine_name TEXT,
    rating INTEGER,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    engagement_score BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH note_engagement AS (
        SELECT 
            tn.id,
            tn.rating,
            tn.user_id,
            tn.created_at,
            COALESCE(w.name, 'Unknown Wine') as wine_name,
            p.display_name,
            p.avatar_url,
            COALESCE(l.like_count, 0) as like_count,
            COALESCE(c.comment_count, 0) as comment_count,
            -- Engagement score: likes * 1 + comments * 3 (comments weighted higher)
            (COALESCE(l.like_count, 0) * 1 + COALESCE(c.comment_count, 0) * 3) as engagement_score
        FROM tasting_notes tn
        JOIN profiles p ON p.id = tn.user_id
        LEFT JOIN wines w ON w.id = tn.wine_id
        LEFT JOIN (
            SELECT tasting_note_id, COUNT(*) as like_count
            FROM tasting_note_likes
            GROUP BY tasting_note_id
        ) l ON l.tasting_note_id = tn.id
        LEFT JOIN (
            SELECT tasting_note_id, COUNT(*) as comment_count
            FROM tasting_note_comments
            GROUP BY tasting_note_id
        ) c ON c.tasting_note_id = tn.id
        WHERE 
            tn.visibility = 'PUBLIC'
            AND tn.created_at >= (now() - interval '1 day' * days_back)
    )
    SELECT 
        ne.id,
        ne.wine_name,
        ne.rating,
        ne.user_id,
        ne.display_name,
        ne.avatar_url,
        ne.like_count,
        ne.comment_count,
        ne.engagement_score,
        ne.created_at
    FROM note_engagement ne
    ORDER BY ne.engagement_score DESC, ne.created_at DESC
    LIMIT note_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get user social stats
CREATE OR REPLACE FUNCTION get_user_social_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    likes_given INTEGER;
    likes_received INTEGER;
    comments_made INTEGER;
    comments_received INTEGER;
    engagement_score INTEGER;
BEGIN
    -- Likes given by user
    SELECT COUNT(*) INTO likes_given
    FROM tasting_note_likes
    WHERE user_id = target_user_id;
    
    -- Likes received by user (on their tasting notes)
    SELECT COUNT(*) INTO likes_received
    FROM tasting_note_likes tnl
    JOIN tasting_notes tn ON tn.id = tnl.tasting_note_id
    WHERE tn.user_id = target_user_id;
    
    -- Comments made by user
    SELECT COUNT(*) INTO comments_made
    FROM tasting_note_comments
    WHERE user_id = target_user_id;
    
    -- Comments received by user (on their tasting notes)
    SELECT COUNT(*) INTO comments_received
    FROM tasting_note_comments tnc
    JOIN tasting_notes tn ON tn.id = tnc.tasting_note_id
    WHERE tn.user_id = target_user_id;
    
    -- Calculate engagement score
    engagement_score := (likes_given + likes_received + comments_made * 2 + comments_received * 2) / 2;
    
    RETURN json_build_object(
        'total_likes_given', likes_given,
        'total_likes_received', likes_received,
        'total_comments_made', comments_made,
        'total_comments_received', comments_received,
        'engagement_score', engagement_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasting_note_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasting_note_comments TO authenticated;
GRANT EXECUTE ON FUNCTION get_tasting_note_social_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_tasting_notes TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_social_stats TO authenticated;