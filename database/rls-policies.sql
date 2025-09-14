-- ============================================================================
-- CellarSessions Row Level Security (RLS) Implementation
-- ============================================================================
-- This file implements comprehensive Row Level Security policies for all tables
-- following the principle of least privilege and data isolation
-- 
-- Security Model Overview:
-- - Users can only access their own data (profiles, tasting notes)
-- - Squad members can see shared content within their squads
-- - Public content is accessible to all authenticated users
-- - Admin users have elevated permissions across all data
-- ============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_tasting_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Users can view their own profile and profiles of users in their squads
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        -- Own profile
        auth.uid()::text = id
        OR
        -- Profiles of users in the same squad
        EXISTS (
            SELECT 1 FROM squad_members sm1
            JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
            WHERE sm1.user_id = auth.uid()::text
            AND sm2.user_id = profiles.id
        )
        OR
        -- Admin users can see all profiles
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid()::text = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- Users can only delete their own profile (with admin override)
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    USING (
        auth.uid()::text = id
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- ============================================================================
-- WINES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "wines_select_policy" ON wines;
DROP POLICY IF EXISTS "wines_insert_policy" ON wines;
DROP POLICY IF EXISTS "wines_update_policy" ON wines;
DROP POLICY IF EXISTS "wines_delete_policy" ON wines;

-- All authenticated users can view wines (public data)
CREATE POLICY "wines_select_policy" ON wines
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admin users can insert wines
CREATE POLICY "wines_insert_policy" ON wines
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Only admin users can update wines
CREATE POLICY "wines_update_policy" ON wines
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Only admin users can delete wines
CREATE POLICY "wines_delete_policy" ON wines
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- ============================================================================
-- TASTING_NOTES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tasting_notes_select_policy" ON tasting_notes;
DROP POLICY IF EXISTS "tasting_notes_insert_policy" ON tasting_notes;
DROP POLICY IF EXISTS "tasting_notes_update_policy" ON tasting_notes;
DROP POLICY IF EXISTS "tasting_notes_delete_policy" ON tasting_notes;

-- Complex visibility policy based on visibility level and squad membership
CREATE POLICY "tasting_notes_select_policy" ON tasting_notes
    FOR SELECT
    USING (
        -- Own tasting notes
        auth.uid()::text = user_id
        OR
        -- Public tasting notes
        visibility = 'PUBLIC'
        OR
        -- Squad tasting notes (user must be in same squad as note author)
        (
            visibility = 'SQUAD'
            AND EXISTS (
                SELECT 1 FROM squad_members sm1
                JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
                WHERE sm1.user_id = auth.uid()::text
                AND sm2.user_id = tasting_notes.user_id
            )
        )
        OR
        -- Admin users can see all tasting notes
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Users can only insert their own tasting notes
CREATE POLICY "tasting_notes_insert_policy" ON tasting_notes
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own tasting notes
CREATE POLICY "tasting_notes_update_policy" ON tasting_notes
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own tasting notes (with admin override)
CREATE POLICY "tasting_notes_delete_policy" ON tasting_notes
    FOR DELETE
    USING (
        auth.uid()::text = user_id
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- ============================================================================
-- BLIND_TASTING_GUESSES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "blind_tasting_guesses_select_policy" ON blind_tasting_guesses;
DROP POLICY IF EXISTS "blind_tasting_guesses_insert_policy" ON blind_tasting_guesses;
DROP POLICY IF EXISTS "blind_tasting_guesses_update_policy" ON blind_tasting_guesses;
DROP POLICY IF EXISTS "blind_tasting_guesses_delete_policy" ON blind_tasting_guesses;

-- Access follows the same rules as tasting notes (based on note visibility)
CREATE POLICY "blind_tasting_guesses_select_policy" ON blind_tasting_guesses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasting_notes tn
            WHERE tn.id = blind_tasting_guesses.tasting_note_id
            AND (
                -- Own tasting note
                tn.user_id = auth.uid()::text
                OR
                -- Public tasting note
                tn.visibility = 'PUBLIC'
                OR
                -- Squad tasting note (user must be in same squad as note author)
                (
                    tn.visibility = 'SQUAD'
                    AND EXISTS (
                        SELECT 1 FROM squad_members sm1
                        JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
                        WHERE sm1.user_id = auth.uid()::text
                        AND sm2.user_id = tn.user_id
                    )
                )
                OR
                -- Admin access
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()::text
                    AND p.email LIKE '%@cellarai.com'
                )
            )
        )
    );

-- Users can only insert guesses for tasting notes they can access
CREATE POLICY "blind_tasting_guesses_insert_policy" ON blind_tasting_guesses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasting_notes tn
            WHERE tn.id = blind_tasting_guesses.tasting_note_id
            AND (
                tn.user_id = auth.uid()::text
                OR tn.visibility = 'PUBLIC'
                OR (
                    tn.visibility = 'SQUAD'
                    AND EXISTS (
                        SELECT 1 FROM squad_members sm1
                        JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
                        WHERE sm1.user_id = auth.uid()::text
                        AND sm2.user_id = tn.user_id
                    )
                )
            )
        )
    );

-- Users can only update guesses for tasting notes they own
CREATE POLICY "blind_tasting_guesses_update_policy" ON blind_tasting_guesses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tasting_notes tn
            WHERE tn.id = blind_tasting_guesses.tasting_note_id
            AND tn.user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasting_notes tn
            WHERE tn.id = blind_tasting_guesses.tasting_note_id
            AND tn.user_id = auth.uid()::text
        )
    );

-- Users can only delete guesses for tasting notes they own (with admin override)
CREATE POLICY "blind_tasting_guesses_delete_policy" ON blind_tasting_guesses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasting_notes tn
            WHERE tn.id = blind_tasting_guesses.tasting_note_id
            AND (
                tn.user_id = auth.uid()::text
                OR
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()::text
                    AND p.email LIKE '%@cellarai.com'
                )
            )
        )
    );

-- ============================================================================
-- SQUADS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "squads_select_policy" ON squads;
DROP POLICY IF EXISTS "squads_insert_policy" ON squads;
DROP POLICY IF EXISTS "squads_update_policy" ON squads;
DROP POLICY IF EXISTS "squads_delete_policy" ON squads;

-- Users can view squads they belong to or public squads
CREATE POLICY "squads_select_policy" ON squads
    FOR SELECT
    USING (
        -- Public squads
        privacy_level = 'PUBLIC'
        OR
        -- Squads user is a member of
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squads.id
            AND sm.user_id = auth.uid()::text
        )
        OR
        -- Admin users can see all squads
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Any authenticated user can create a squad
CREATE POLICY "squads_insert_policy" ON squads
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid()::text = created_by
    );

-- Only squad admins and creators can update squads
CREATE POLICY "squads_update_policy" ON squads
    FOR UPDATE
    USING (
        -- Squad creator
        auth.uid()::text = created_by
        OR
        -- Squad admin
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squads.id
            AND sm.user_id = auth.uid()::text
            AND sm.role = 'ADMIN'
        )
        OR
        -- System admin
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    )
    WITH CHECK (
        -- Squad creator
        auth.uid()::text = created_by
        OR
        -- Squad admin
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squads.id
            AND sm.user_id = auth.uid()::text
            AND sm.role = 'ADMIN'
        )
        OR
        -- System admin
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Only squad creators and system admins can delete squads
CREATE POLICY "squads_delete_policy" ON squads
    FOR DELETE
    USING (
        auth.uid()::text = created_by
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- ============================================================================
-- SQUAD_MEMBERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "squad_members_select_policy" ON squad_members;
DROP POLICY IF EXISTS "squad_members_insert_policy" ON squad_members;
DROP POLICY IF EXISTS "squad_members_update_policy" ON squad_members;
DROP POLICY IF EXISTS "squad_members_delete_policy" ON squad_members;

-- Users can view members of squads they belong to
CREATE POLICY "squad_members_select_policy" ON squad_members
    FOR SELECT
    USING (
        -- Members of squads user belongs to
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squad_members.squad_id
            AND sm.user_id = auth.uid()::text
        )
        OR
        -- Admin users can see all squad memberships
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Squad admins/creators can add members, or users can join public squads
CREATE POLICY "squad_members_insert_policy" ON squad_members
    FOR INSERT
    WITH CHECK (
        -- User joining themselves to a public or invite-only squad
        (
            auth.uid()::text = user_id
            AND EXISTS (
                SELECT 1 FROM squads s
                WHERE s.id = squad_members.squad_id
                AND s.privacy_level IN ('PUBLIC', 'INVITE_ONLY')
            )
        )
        OR
        -- Squad admin/creator adding a member
        EXISTS (
            SELECT 1 FROM squads s
            WHERE s.id = squad_members.squad_id
            AND (
                s.created_by = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM squad_members sm
                    WHERE sm.squad_id = s.id
                    AND sm.user_id = auth.uid()::text
                    AND sm.role = 'ADMIN'
                )
            )
        )
        OR
        -- System admin
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Only squad admins can update member roles
CREATE POLICY "squad_members_update_policy" ON squad_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM squads s
            WHERE s.id = squad_members.squad_id
            AND (
                s.created_by = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM squad_members sm
                    WHERE sm.squad_id = s.id
                    AND sm.user_id = auth.uid()::text
                    AND sm.role = 'ADMIN'
                )
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM squads s
            WHERE s.id = squad_members.squad_id
            AND (
                s.created_by = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM squad_members sm
                    WHERE sm.squad_id = s.id
                    AND sm.user_id = auth.uid()::text
                    AND sm.role = 'ADMIN'
                )
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- Users can leave squads, admins can remove members
CREATE POLICY "squad_members_delete_policy" ON squad_members
    FOR DELETE
    USING (
        -- User leaving themselves
        auth.uid()::text = user_id
        OR
        -- Squad admin/creator removing a member
        EXISTS (
            SELECT 1 FROM squads s
            WHERE s.id = squad_members.squad_id
            AND (
                s.created_by = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM squad_members sm
                    WHERE sm.squad_id = s.id
                    AND sm.user_id = auth.uid()::text
                    AND sm.role = 'ADMIN'
                )
            )
        )
        OR
        -- System admin
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create indexes to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_squad_members_user_squad ON squad_members(user_id, squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_user ON squad_members(squad_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_user_visibility ON tasting_notes(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_visibility ON tasting_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_profiles_email_admin ON profiles(email) WHERE email LIKE '%@cellarai.com';
CREATE INDEX IF NOT EXISTS idx_squads_privacy_level ON squads(privacy_level);
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON squads(created_by);

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = user_id
        AND p.email LIKE '%@cellarai.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in same squad as another user
CREATE OR REPLACE FUNCTION users_share_squad(user1_id TEXT, user2_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM squad_members sm1
        JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
        WHERE sm1.user_id = user1_id
        AND sm2.user_id = user2_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access tasting note based on visibility
CREATE OR REPLACE FUNCTION can_access_tasting_note(note_id UUID, user_id TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN AS $$
DECLARE
    note_user_id TEXT;
    note_visibility TEXT;
BEGIN
    SELECT tn.user_id, tn.visibility
    INTO note_user_id, note_visibility
    FROM tasting_notes tn
    WHERE tn.id = note_id;
    
    -- Own note
    IF note_user_id = user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Admin user
    IF is_admin(user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Public note
    IF note_visibility = 'PUBLIC' THEN
        RETURN TRUE;
    END IF;
    
    -- Squad note - check if users share a squad
    IF note_visibility = 'SQUAD' AND users_share_squad(user_id, note_user_id) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT AND MONITORING
-- ============================================================================

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "security_audit_log_select_policy" ON security_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );

-- System can insert audit logs (no user restrictions)
CREATE POLICY "security_audit_log_insert_policy" ON security_audit_log
    FOR INSERT
    WITH CHECK (TRUE);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        user_id,
        action,
        table_name,
        record_id,
        details
    ) VALUES (
        auth.uid()::text,
        p_action,
        p_table_name,
        p_record_id,
        p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION users_share_squad(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_tasting_note(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE security_audit_log IS 'Audit log for tracking security-related events and policy violations';
COMMENT ON FUNCTION is_admin(TEXT) IS 'Check if a user has admin privileges based on email domain';
COMMENT ON FUNCTION users_share_squad(TEXT, TEXT) IS 'Check if two users share membership in at least one squad';
COMMENT ON FUNCTION can_access_tasting_note(UUID, TEXT) IS 'Determine if a user can access a specific tasting note based on visibility rules';