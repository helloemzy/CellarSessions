-- ============================================================================
-- CellarSessions RLS Performance Optimization
-- ============================================================================
-- Comprehensive performance optimization for Row Level Security policies
-- Includes indexes, query optimizations, and monitoring solutions
-- 
-- Performance Goals:
-- - Query response times under 100ms for p95
-- - Minimal overhead from RLS policy evaluation
-- - Efficient index utilization for common access patterns
-- - Scalable solutions for growing data volumes
-- ============================================================================

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Primary RLS performance indexes (created in main RLS script, repeated here for reference)
CREATE INDEX IF NOT EXISTS idx_squad_members_user_squad ON squad_members(user_id, squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_user ON squad_members(squad_id, user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_role ON squad_members(role);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_user_visibility ON tasting_notes(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_visibility ON tasting_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_user_created ON tasting_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email_admin ON profiles(email) WHERE email LIKE '%@cellarai.com';
CREATE INDEX IF NOT EXISTS idx_squads_privacy_level ON squads(privacy_level);
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON squads(created_by);

-- Additional performance indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_tasting_notes_wine_visibility ON tasting_notes(wine_id, visibility);
CREATE INDEX IF NOT EXISTS idx_tasting_notes_session_date ON tasting_notes(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_blind_tasting_guesses_note_id ON blind_tasting_guesses(tasting_note_id);
CREATE INDEX IF NOT EXISTS idx_squads_member_count ON squads(member_count);
CREATE INDEX IF NOT EXISTS idx_squad_members_joined_at ON squad_members(joined_at DESC);

-- Partial indexes for frequently accessed data patterns
CREATE INDEX IF NOT EXISTS idx_tasting_notes_public ON tasting_notes(created_at DESC) WHERE visibility = 'PUBLIC';
CREATE INDEX IF NOT EXISTS idx_tasting_notes_squad ON tasting_notes(user_id, created_at DESC) WHERE visibility = 'SQUAD';
CREATE INDEX IF NOT EXISTS idx_squads_public ON squads(name, created_at DESC) WHERE privacy_level = 'PUBLIC';
CREATE INDEX IF NOT EXISTS idx_squad_members_active ON squad_members(squad_id, user_id) WHERE role IN ('ADMIN', 'MODERATOR');

-- Composite indexes for common join patterns
CREATE INDEX IF NOT EXISTS idx_tasting_notes_user_wine_visibility ON tasting_notes(user_id, wine_id, visibility);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_role_user ON squad_members(squad_id, role, user_id);

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Materialized view for user squad memberships (frequently accessed in RLS policies)
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

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_squads_user_squad ON mv_user_squads(user_id, squad_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_squads_squad_user ON mv_user_squads(squad_id, user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_squads_user_role ON mv_user_squads(user_id, role);

-- Materialized view for squad member relationships (optimizes "users share squad" queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_squad_relationships AS
SELECT DISTINCT
    sm1.user_id as user1_id,
    sm2.user_id as user2_id,
    sm1.squad_id
FROM squad_members sm1
JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
WHERE sm1.user_id != sm2.user_id;

-- Create indexes on relationships view
CREATE INDEX IF NOT EXISTS idx_mv_squad_relationships_user1 ON mv_squad_relationships(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_mv_squad_relationships_user2 ON mv_squad_relationships(user2_id, user1_id);

-- ============================================================================
-- OPTIMIZED RLS POLICY VERSIONS
-- ============================================================================

-- Optimized version of users_share_squad function using materialized view
CREATE OR REPLACE FUNCTION users_share_squad_optimized(user1_id TEXT, user2_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM mv_squad_relationships
        WHERE (user1_id = $1 AND user2_id = $2)
           OR (user1_id = $2 AND user2_id = $1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Optimized tasting notes policy (example of how to refactor for better performance)
DROP POLICY IF EXISTS "tasting_notes_select_policy_optimized" ON tasting_notes;
CREATE POLICY "tasting_notes_select_policy_optimized" ON tasting_notes
    FOR SELECT
    USING (
        -- Use current_user for better performance than auth.uid()::text
        user_id = current_user
        OR visibility = 'PUBLIC'
        OR (
            visibility = 'SQUAD'
            AND users_share_squad_optimized(current_user, user_id)
        )
        OR is_admin(current_user)
    );

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to analyze RLS policy performance
CREATE OR REPLACE FUNCTION analyze_rls_performance()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    avg_execution_time_ms NUMERIC,
    total_executions INTEGER,
    slow_queries INTEGER,
    recommendations TEXT
) AS $$
BEGIN
    -- This would integrate with pg_stat_statements if available
    -- For now, we'll provide a framework for performance analysis
    
    RETURN QUERY
    SELECT 
        'tasting_notes'::TEXT,
        'tasting_notes_select_policy'::TEXT,
        0.0::NUMERIC, -- Would come from actual stats
        0::INTEGER,   -- Would come from actual stats
        0::INTEGER,   -- Would come from actual stats
        'Monitor execution times and consider materialized views for complex squad relationships'::TEXT;
    
    RETURN QUERY
    SELECT 
        'squad_members'::TEXT,
        'squad_members_select_policy'::TEXT,
        0.0::NUMERIC,
        0::INTEGER,
        0::INTEGER,
        'Index on (user_id, squad_id) should provide optimal performance'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_rls_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_squads;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_squad_relationships;
    
    -- Log refresh activity
    PERFORM log_security_event(
        'MATERIALIZED_VIEW_REFRESH',
        'mv_user_squads,mv_squad_relationships',
        NULL,
        jsonb_build_object('refreshed_at', NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- QUERY OPTIMIZATION HELPERS
-- ============================================================================

-- Function to get user's squad IDs efficiently
CREATE OR REPLACE FUNCTION get_user_squad_ids(user_id TEXT DEFAULT current_user)
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT squad_id 
        FROM mv_user_squads 
        WHERE mv_user_squads.user_id = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has admin role in any squad
CREATE OR REPLACE FUNCTION user_has_admin_role(user_id TEXT DEFAULT current_user)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM mv_user_squads
        WHERE mv_user_squads.user_id = $1
        AND role IN ('ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PERFORMANCE TESTING AND BENCHMARKING
-- ============================================================================

-- Comprehensive performance test function
CREATE OR REPLACE FUNCTION benchmark_rls_performance()
RETURNS TABLE(
    test_name TEXT,
    operation TEXT,
    rows_tested INTEGER,
    avg_time_ms NUMERIC,
    min_time_ms NUMERIC,
    max_time_ms NUMERIC,
    performance_grade TEXT,
    optimization_needed BOOLEAN
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    times NUMERIC[];
    i INTEGER;
    current_time NUMERIC;
BEGIN
    -- Setup test data with larger dataset
    PERFORM setup_rls_test_data();
    
    -- Insert additional test data for performance testing
    FOR i IN 1..1000 LOOP
        INSERT INTO tasting_notes (
            id, user_id, wine_id, session_date, is_blind_tasting,
            appearance_intensity, appearance_color, nose_intensity, 
            nose_aroma_characteristics, nose_development,
            palate_sweetness, palate_acidity, palate_alcohol, palate_body, 
            palate_flavor_intensity, palate_flavor_characteristics, palate_finish,
            quality_level, readiness_for_drinking, rating, visibility, 
            created_at, updated_at
        ) VALUES (
            'perf-test-' || i, 
            CASE WHEN i % 3 = 0 THEN 'test-user-1' 
                 WHEN i % 3 = 1 THEN 'test-user-2' 
                 ELSE 'test-user-3' END,
            CASE WHEN i % 2 = 0 THEN 'test-wine-1' ELSE 'test-wine-2' END,
            NOW() - (i || ' days')::INTERVAL,
            i % 2 = 0,
            3, 'Ruby', 4, ARRAY['Test'], 'Primary',
            1, 3, 4, 3, 4, ARRAY['Test'], 'Medium',
            4, 'Ready', 4,
            CASE WHEN i % 3 = 0 THEN 'PRIVATE'
                 WHEN i % 3 = 1 THEN 'SQUAD'
                 ELSE 'PUBLIC' END,
            NOW(), NOW()
        );
    END LOOP;
    
    -- Test 1: Tasting notes SELECT with RLS
    times := ARRAY[]::NUMERIC[];
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM tasting_notes WHERE visibility IN ('PUBLIC', 'SQUAD');
        end_time := clock_timestamp();
        current_time := EXTRACT(MILLISECONDS FROM end_time - start_time);
        times := array_append(times, current_time);
    END LOOP;
    
    RETURN QUERY SELECT 
        'RLS Performance Test 1'::TEXT,
        'SELECT tasting_notes with visibility filter'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes WHERE id LIKE 'perf-test-%'),
        (SELECT AVG(t) FROM unnest(times) AS t),
        (SELECT MIN(t) FROM unnest(times) AS t),
        (SELECT MAX(t) FROM unnest(times) AS t),
        CASE WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 50 THEN 'A'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 100 THEN 'B'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 200 THEN 'C'
             ELSE 'D' END,
        (SELECT AVG(t) FROM unnest(times) AS t) > 100;
    
    -- Test 2: Complex JOIN with squad relationships
    times := ARRAY[]::NUMERIC[];
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM tasting_notes tn
        JOIN squad_members sm1 ON tn.user_id = sm1.user_id
        JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
        WHERE sm2.user_id = 'test-user-1';
        end_time := clock_timestamp();
        current_time := EXTRACT(MILLISECONDS FROM end_time - start_time);
        times := array_append(times, current_time);
    END LOOP;
    
    RETURN QUERY SELECT 
        'RLS Performance Test 2'::TEXT,
        'Complex JOIN for squad visibility'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes tn
         JOIN squad_members sm1 ON tn.user_id = sm1.user_id
         JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
         WHERE sm2.user_id = 'test-user-1'),
        (SELECT AVG(t) FROM unnest(times) AS t),
        (SELECT MIN(t) FROM unnest(times) AS t),
        (SELECT MAX(t) FROM unnest(times) AS t),
        CASE WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 50 THEN 'A'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 100 THEN 'B'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 200 THEN 'C'
             ELSE 'D' END,
        (SELECT AVG(t) FROM unnest(times) AS t) > 100;
    
    -- Test 3: Materialized view performance
    times := ARRAY[]::NUMERIC[];
    FOR i IN 1..10 LOOP
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM mv_user_squads WHERE user_id = 'test-user-1';
        end_time := clock_timestamp();
        current_time := EXTRACT(MILLISECONDS FROM end_time - start_time);
        times := array_append(times, current_time);
    END LOOP;
    
    RETURN QUERY SELECT 
        'RLS Performance Test 3'::TEXT,
        'Materialized view access'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM mv_user_squads WHERE user_id = 'test-user-1'),
        (SELECT AVG(t) FROM unnest(times) AS t),
        (SELECT MIN(t) FROM unnest(times) AS t),
        (SELECT MAX(t) FROM unnest(times) AS t),
        CASE WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 10 THEN 'A'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 25 THEN 'B'
             WHEN (SELECT AVG(t) FROM unnest(times) AS t) < 50 THEN 'C'
             ELSE 'D' END,
        (SELECT AVG(t) FROM unnest(times) AS t) > 25;
    
    -- Cleanup performance test data
    DELETE FROM tasting_notes WHERE id LIKE 'perf-test-%';
    PERFORM cleanup_rls_test_data();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEX USAGE ANALYSIS
-- ============================================================================

-- Function to analyze index usage for RLS queries
CREATE OR REPLACE FUNCTION analyze_rls_indexes()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    scans INTEGER,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_efficiency NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    -- This would integrate with pg_stat_user_indexes in a real implementation
    RETURN QUERY
    SELECT 
        'tasting_notes'::TEXT,
        'idx_tasting_notes_user_visibility'::TEXT,
        pg_size_pretty(pg_relation_size('idx_tasting_notes_user_visibility')),
        0::INTEGER,    -- Would come from pg_stat_user_indexes
        0::BIGINT,     -- Would come from pg_stat_user_indexes  
        0::BIGINT,     -- Would come from pg_stat_user_indexes
        0.0::NUMERIC,  -- Calculated efficiency metric
        'Critical index for RLS policy performance - monitor usage'::TEXT;
    
    RETURN QUERY
    SELECT 
        'squad_members'::TEXT,
        'idx_squad_members_user_squad'::TEXT,
        pg_size_pretty(pg_relation_size('idx_squad_members_user_squad')),
        0::INTEGER,
        0::BIGINT,
        0::BIGINT,
        0.0::NUMERIC,
        'Essential for squad-based access control - should have high usage'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAINTENANCE AND MONITORING PROCEDURES
-- ============================================================================

-- Procedure to maintain RLS performance
CREATE OR REPLACE FUNCTION maintain_rls_performance()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_rls_materialized_views();
    
    -- Update table statistics
    ANALYZE profiles;
    ANALYZE tasting_notes;
    ANALYZE squads;
    ANALYZE squad_members;
    ANALYZE blind_tasting_guesses;
    
    -- Log maintenance activity
    PERFORM log_security_event(
        'RLS_MAINTENANCE',
        'all_tables',
        NULL,
        jsonb_build_object(
            'action', 'performance_maintenance',
            'materialized_views_refreshed', true,
            'statistics_updated', true,
            'timestamp', NOW()
        )
    );
    
    RAISE NOTICE 'RLS performance maintenance completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATIC MAINTENANCE SCHEDULING
-- ============================================================================

-- Note: In a production environment, you would set up cron jobs or pg_cron
-- to run maintenance procedures automatically. Example:

/*
-- Refresh materialized views every hour
SELECT cron.schedule('refresh-mv-user-squads', '0 * * * *', 'SELECT refresh_rls_materialized_views();');

-- Run full maintenance daily at 2 AM
SELECT cron.schedule('rls-maintenance', '0 2 * * *', 'SELECT maintain_rls_performance();');

-- Performance analysis weekly
SELECT cron.schedule('rls-performance-check', '0 3 * * 1', 'SELECT * FROM benchmark_rls_performance();');
*/

-- ============================================================================
-- PERFORMANCE RECOMMENDATIONS
-- ============================================================================

-- Function to provide performance recommendations
CREATE OR REPLACE FUNCTION get_rls_performance_recommendations()
RETURNS TABLE(
    category TEXT,
    recommendation TEXT,
    impact TEXT,
    implementation_effort TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY VALUES
    ('Indexing', 'Ensure all RLS policy predicates have supporting indexes', 'High', 'Low', 1),
    ('Materialized Views', 'Use materialized views for frequently accessed squad relationships', 'High', 'Medium', 2),
    ('Query Patterns', 'Optimize RLS policies to use efficient WHERE clauses', 'Medium', 'High', 3),
    ('Connection Pooling', 'Implement connection pooling to reduce auth overhead', 'Medium', 'Low', 4),
    ('Monitoring', 'Set up continuous monitoring of RLS query performance', 'Low', 'Medium', 5),
    ('Caching', 'Consider application-level caching for frequently accessed data', 'Medium', 'High', 6);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on performance functions
GRANT EXECUTE ON FUNCTION analyze_rls_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION benchmark_rls_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_rls_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_rls_performance_recommendations() TO authenticated;
GRANT EXECUTE ON FUNCTION users_share_squad_optimized(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_squad_ids(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_admin_role(TEXT) TO authenticated;

-- Grant access to materialized views
GRANT SELECT ON mv_user_squads TO authenticated;
GRANT SELECT ON mv_squad_relationships TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
Performance Testing Commands:

-- Run comprehensive performance benchmark
SELECT * FROM benchmark_rls_performance() ORDER BY performance_grade, avg_time_ms;

-- Check index usage
SELECT * FROM analyze_rls_indexes();

-- Get performance recommendations
SELECT * FROM get_rls_performance_recommendations() ORDER BY priority;

-- Manual maintenance
SELECT maintain_rls_performance();

-- Check if users share squads efficiently
SELECT users_share_squad_optimized('test-user-1', 'test-user-2');

-- Get user's squad IDs
SELECT get_user_squad_ids('test-user-1');

Performance Targets:
- Simple SELECT queries: < 50ms average
- Complex JOIN queries: < 100ms average  
- Materialized view queries: < 10ms average
- Index usage efficiency: > 80%
*/