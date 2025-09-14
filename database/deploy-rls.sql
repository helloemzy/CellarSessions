-- ============================================================================
-- CellarSessions RLS Deployment Script
-- ============================================================================
-- Master deployment script for Row Level Security implementation
-- This script coordinates the deployment of all RLS components
-- 
-- Usage:
-- psql -d cellar_sessions -f deploy-rls.sql
-- 
-- Prerequisites:
-- - Database exists and is accessible
-- - User has sufficient privileges to create policies and functions
-- - Supabase auth schema is available (if using Supabase)
-- ============================================================================

-- Set up deployment environment
\set ON_ERROR_STOP on
SET client_min_messages = warning;

-- Create deployment log
DO $$
BEGIN
    RAISE NOTICE 'Starting CellarSessions RLS deployment at %', NOW();
END $$;

-- ============================================================================
-- PHASE 1: CREATE SUPPORTING INFRASTRUCTURE
-- ============================================================================

-- Create database directory if needed (for file organization)
-- Note: This would be handled by the application deployment process

-- Verify required tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        missing_tables := array_append(missing_tables, 'profiles');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wines') THEN
        missing_tables := array_append(missing_tables, 'wines');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasting_notes') THEN
        missing_tables := array_append(missing_tables, 'tasting_notes');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'squads') THEN
        missing_tables := array_append(missing_tables, 'squads');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'squad_members') THEN
        missing_tables := array_append(missing_tables, 'squad_members');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required tables found';
END $$;

-- ============================================================================
-- PHASE 2: DEPLOY CORE RLS POLICIES
-- ============================================================================

RAISE NOTICE 'Deploying core RLS policies...';

-- Enable RLS on all sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- Check if blind_tasting_guesses table exists before enabling RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blind_tasting_guesses') THEN
        ALTER TABLE blind_tasting_guesses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on blind_tasting_guesses table';
    ELSE
        RAISE NOTICE 'blind_tasting_guesses table not found, skipping RLS enable';
    END IF;
END $$;

RAISE NOTICE 'RLS enabled on all tables';

-- Create security functions first (required by policies)
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

-- Deploy RLS policies (using \i would include the external file in a real deployment)
-- For this script, we'll include the essential policies inline

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        auth.uid()::text = id
        OR EXISTS (
            SELECT 1 FROM squad_members sm1
            JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
            WHERE sm1.user_id = auth.uid()::text
            AND sm2.user_id = profiles.id
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- Tasting notes policies
DROP POLICY IF EXISTS "tasting_notes_select_policy" ON tasting_notes;
CREATE POLICY "tasting_notes_select_policy" ON tasting_notes
    FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR visibility = 'PUBLIC'
        OR (
            visibility = 'SQUAD'
            AND users_share_squad(auth.uid()::text, user_id)
        )
        OR is_admin()
    );

DROP POLICY IF EXISTS "tasting_notes_insert_policy" ON tasting_notes;
CREATE POLICY "tasting_notes_insert_policy" ON tasting_notes
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "tasting_notes_update_policy" ON tasting_notes;
CREATE POLICY "tasting_notes_update_policy" ON tasting_notes
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Squads policies
DROP POLICY IF EXISTS "squads_select_policy" ON squads;
CREATE POLICY "squads_select_policy" ON squads
    FOR SELECT
    USING (
        privacy_level = 'PUBLIC'
        OR EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squads.id
            AND sm.user_id = auth.uid()::text
        )
        OR is_admin()
    );

-- Squad members policies
DROP POLICY IF EXISTS "squad_members_select_policy" ON squad_members;
CREATE POLICY "squad_members_select_policy" ON squad_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squad_members.squad_id
            AND sm.user_id = auth.uid()::text
        )
        OR is_admin()
    );

RAISE NOTICE 'Core RLS policies deployed successfully';

-- ============================================================================
-- PHASE 3: DEPLOY PERFORMANCE OPTIMIZATIONS
-- ============================================================================

RAISE NOTICE 'Deploying performance optimizations...';

-- Create critical indexes
CREATE INDEX IF NOT EXISTS idx_squad_members_user_squad ON squad_members(user_id, squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_user ON squad_members(squad_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_user_visibility ON tasting_notes(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_visibility ON tasting_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_profiles_email_admin ON profiles(email) WHERE email LIKE '%@cellarai.com';
CREATE INDEX IF NOT EXISTS idx_squads_privacy_level ON squads(privacy_level);

-- Create materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_squads AS
SELECT 
    sm.user_id,
    sm.squad_id,
    s.name as squad_name,
    s.privacy_level,
    sm.role,
    sm.joined_at,
    s.created_by = sm.user_id as is_creator
FROM squad_members sm
JOIN squads s ON sm.squad_id = s.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_squads_user_squad ON mv_user_squads(user_id, squad_id);

RAISE NOTICE 'Performance optimizations deployed successfully';

-- ============================================================================
-- PHASE 4: DEPLOY AUDIT AND MONITORING
-- ============================================================================

RAISE NOTICE 'Deploying audit and monitoring infrastructure...';

-- Create audit log table
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

-- Create audit log policies
DROP POLICY IF EXISTS "security_audit_log_select_policy" ON security_audit_log;
CREATE POLICY "security_audit_log_select_policy" ON security_audit_log
    FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "security_audit_log_insert_policy" ON security_audit_log;
CREATE POLICY "security_audit_log_insert_policy" ON security_audit_log
    FOR INSERT
    WITH CHECK (TRUE);

-- Create audit function
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

RAISE NOTICE 'Audit and monitoring infrastructure deployed successfully';

-- ============================================================================
-- PHASE 5: GRANT PERMISSIONS
-- ============================================================================

RAISE NOTICE 'Granting necessary permissions...';

-- Grant execute permissions on security functions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION users_share_squad(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Grant access to materialized views
GRANT SELECT ON mv_user_squads TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

RAISE NOTICE 'Permissions granted successfully';

-- ============================================================================
-- PHASE 6: DEPLOYMENT VALIDATION
-- ============================================================================

RAISE NOTICE 'Running deployment validation...';

-- Validate RLS is enabled on all tables
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('profiles', 'tasting_notes', 'squads', 'squad_members', 'security_audit_log')
        AND table_schema = 'public'
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class 
        WHERE relname = table_record.table_name;
        
        IF NOT rls_enabled THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', table_record.table_name;
        END IF;
        
        RAISE NOTICE 'RLS validated on table: %', table_record.table_name;
    END LOOP;
END $$;

-- Validate critical indexes exist
DO $$
DECLARE
    required_indexes TEXT[] := ARRAY[
        'idx_squad_members_user_squad',
        'idx_tasting_notes_user_visibility',
        'idx_profiles_email_admin'
    ];
    index_name TEXT;
BEGIN
    FOREACH index_name IN ARRAY required_indexes
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = index_name
        ) THEN
            RAISE EXCEPTION 'Required index missing: %', index_name;
        END IF;
        
        RAISE NOTICE 'Index validated: %', index_name;
    END LOOP;
END $$;

-- Validate security functions exist
DO $$
DECLARE
    required_functions TEXT[] := ARRAY[
        'is_admin',
        'users_share_squad',
        'log_security_event'
    ];
    function_name TEXT;
BEGIN
    FOREACH function_name IN ARRAY required_functions
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = function_name
            AND n.nspname = 'public'
        ) THEN
            RAISE EXCEPTION 'Required function missing: %', function_name;
        END IF;
        
        RAISE NOTICE 'Function validated: %', function_name;
    END LOOP;
END $$;

RAISE NOTICE 'Deployment validation completed successfully';

-- ============================================================================
-- PHASE 7: LOG DEPLOYMENT SUCCESS
-- ============================================================================

-- Log successful deployment
SELECT log_security_event(
    'RLS_DEPLOYMENT',
    'system',
    NULL,
    jsonb_build_object(
        'deployment_time', NOW(),
        'version', '1.0.0',
        'components', jsonb_build_array(
            'core_policies',
            'performance_optimization',
            'audit_system',
            'security_functions'
        ),
        'status', 'SUCCESS'
    )
);

-- Create deployment summary
CREATE TEMP TABLE deployment_summary AS
SELECT 
    'RLS Policies' as component,
    COUNT(*) as count,
    'Deployed' as status
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Security Functions',
    COUNT(*),
    'Created'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin', 'users_share_squad', 'log_security_event')

UNION ALL

SELECT 
    'Performance Indexes',
    COUNT(*),
    'Created'
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
AND schemaname = 'public'

UNION ALL

SELECT 
    'Materialized Views',
    COUNT(*),
    'Created'
FROM pg_matviews
WHERE schemaname = 'public';

-- Display deployment summary
DO $$
DECLARE
    summary_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CellarSessions RLS Deployment Summary';
    RAISE NOTICE '============================================================================';
    
    FOR summary_record IN SELECT * FROM deployment_summary ORDER BY component
    LOOP
        RAISE NOTICE '% %: % %', 
            RPAD(summary_record.component, 20), 
            summary_record.status,
            summary_record.count,
            CASE WHEN summary_record.count = 1 THEN 'item' ELSE 'items' END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Deployment completed successfully at %', NOW();
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run security tests: SELECT * FROM run_complete_rls_test_suite();';
    RAISE NOTICE '2. Monitor performance: SELECT * FROM benchmark_rls_performance();';
    RAISE NOTICE '3. Set up automated maintenance schedule';
    RAISE NOTICE '============================================================================';
END $$;

-- Clean up
DROP TABLE IF EXISTS deployment_summary;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

-- Set deployment completion marker
CREATE OR REPLACE FUNCTION rls_deployment_info()
RETURNS TABLE(
    component TEXT,
    version TEXT,
    deployed_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
    ('CellarSessions RLS', '1.0.0', NOW(), 'DEPLOYED'),
    ('Security Policies', '1.0.0', NOW(), 'ACTIVE'),
    ('Performance Optimization', '1.0.0', NOW(), 'ACTIVE'),
    ('Audit System', '1.0.0', NOW(), 'ACTIVE');
END;
$$ LANGUAGE plpgsql;

-- Final success message
RAISE NOTICE 'CellarSessions RLS deployment completed successfully!';
RAISE NOTICE 'Run "SELECT * FROM rls_deployment_info();" to view deployment details.';