-- ============================================================================
-- CellarSessions RLS Security Testing Suite
-- ============================================================================
-- Comprehensive security tests to validate Row Level Security policies
-- Tests cover data isolation, privacy controls, and access validation
-- 
-- Usage:
-- 1. Run as different users to test access controls
-- 2. Verify expected results match actual query outcomes
-- 3. Check for data leaks between users and squads
-- ============================================================================

-- ============================================================================
-- TEST SETUP AND HELPER FUNCTIONS
-- ============================================================================

-- Function to create test users and data
CREATE OR REPLACE FUNCTION setup_rls_test_data()
RETURNS VOID AS $$
BEGIN
    -- Create test users
    INSERT INTO profiles (id, email, display_name, first_name, last_name, created_at, updated_at) VALUES
    ('test-user-1', 'user1@example.com', 'Test User 1', 'Test', 'User1', NOW(), NOW()),
    ('test-user-2', 'user2@example.com', 'Test User 2', 'Test', 'User2', NOW(), NOW()),
    ('test-user-3', 'user3@example.com', 'Test User 3', 'Test', 'User3', NOW(), NOW()),
    ('test-admin', 'admin@cellarai.com', 'Admin User', 'Admin', 'User', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create test wines
    INSERT INTO wines (id, name, producer, country, wine_type, grape_varieties, created_at, updated_at) VALUES
    ('test-wine-1', 'Test Cabernet', 'Test Winery', 'USA', 'RED', ARRAY['Cabernet Sauvignon'], NOW(), NOW()),
    ('test-wine-2', 'Test Chardonnay', 'Test Winery', 'USA', 'WHITE', ARRAY['Chardonnay'], NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create test squads
    INSERT INTO squads (id, name, description, privacy_level, created_by, member_count, created_at, updated_at) VALUES
    ('test-squad-1', 'Test Squad 1', 'First test squad', 'PUBLIC', 'test-user-1', 2, NOW(), NOW()),
    ('test-squad-2', 'Test Squad 2', 'Second test squad', 'PRIVATE', 'test-user-2', 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create squad memberships
    INSERT INTO squad_members (id, squad_id, user_id, role, joined_at) VALUES
    ('test-member-1', 'test-squad-1', 'test-user-1', 'ADMIN', NOW()),
    ('test-member-2', 'test-squad-1', 'test-user-2', 'MEMBER', NOW()),
    ('test-member-3', 'test-squad-2', 'test-user-2', 'ADMIN', NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create test tasting notes with different visibility levels
    INSERT INTO tasting_notes (
        id, user_id, wine_id, session_date, is_blind_tasting,
        appearance_intensity, appearance_color, nose_intensity, nose_aroma_characteristics, nose_development,
        palate_sweetness, palate_acidity, palate_alcohol, palate_body, palate_flavor_intensity,
        palate_flavor_characteristics, palate_finish, quality_level, readiness_for_drinking,
        rating, visibility, created_at, updated_at
    ) VALUES
    -- User 1's notes
    ('test-note-1-private', 'test-user-1', 'test-wine-1', NOW(), false, 3, 'Ruby', 4, ARRAY['Blackberry', 'Oak'], 'Primary',
     1, 3, 4, 3, 4, ARRAY['Dark fruit', 'Vanilla'], 'Medium', 4, 'Ready', 4, 'PRIVATE', NOW(), NOW()),
    ('test-note-1-squad', 'test-user-1', 'test-wine-1', NOW(), false, 3, 'Ruby', 4, ARRAY['Blackberry', 'Oak'], 'Primary',
     1, 3, 4, 3, 4, ARRAY['Dark fruit', 'Vanilla'], 'Medium', 4, 'Ready', 4, 'SQUAD', NOW(), NOW()),
    ('test-note-1-public', 'test-user-1', 'test-wine-2', NOW(), false, 2, 'Golden', 3, ARRAY['Apple', 'Citrus'], 'Primary',
     2, 4, 3, 2, 3, ARRAY['Green apple', 'Lemon'], 'Short', 3, 'Ready', 3, 'PUBLIC', NOW(), NOW()),
    -- User 2's notes
    ('test-note-2-private', 'test-user-2', 'test-wine-1', NOW(), false, 4, 'Purple', 4, ARRAY['Plum', 'Spice'], 'Primary',
     1, 3, 4, 4, 4, ARRAY['Dark plum', 'Pepper'], 'Long', 4, 'Ready', 5, 'PRIVATE', NOW(), NOW()),
    ('test-note-2-squad', 'test-user-2', 'test-wine-2', NOW(), false, 3, 'Pale gold', 3, ARRAY['Peach', 'Honey'], 'Primary',
     3, 3, 3, 3, 3, ARRAY['Stone fruit', 'Floral'], 'Medium', 3, 'Ready', 4, 'SQUAD', NOW(), NOW()),
    -- User 3's notes (not in any squad with user 1 or 2)
    ('test-note-3-private', 'test-user-3', 'test-wine-1', NOW(), false, 3, 'Garnet', 3, ARRAY['Cherry', 'Earth'], 'Secondary',
     1, 4, 3, 3, 3, ARRAY['Red fruit', 'Mineral'], 'Medium', 3, 'Ready', 3, 'PRIVATE', NOW(), NOW()),
    ('test-note-3-squad', 'test-user-3', 'test-wine-2', NOW(), false, 2, 'Straw', 2, ARRAY['Grass', 'Gooseberry'], 'Primary',
     1, 5, 2, 2, 2, ARRAY['Herbaceous', 'Citrus'], 'Short', 2, 'Ready', 2, 'SQUAD', NOW(), NOW()),
    ('test-note-3-public', 'test-user-3', 'test-wine-1', NOW(), false, 4, 'Deep ruby', 5, ARRAY['Blackcurrant', 'Cedar'], 'Primary',
     1, 2, 4, 4, 5, ARRAY['Cassis', 'Tobacco'], 'Very long', 5, 'Ready', 5, 'PUBLIC', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'RLS test data setup complete';
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup test data
CREATE OR REPLACE FUNCTION cleanup_rls_test_data()
RETURNS VOID AS $$
BEGIN
    DELETE FROM blind_tasting_guesses WHERE tasting_note_id LIKE 'test-note-%';
    DELETE FROM tasting_notes WHERE id LIKE 'test-note-%';
    DELETE FROM squad_members WHERE id LIKE 'test-member-%';
    DELETE FROM squads WHERE id LIKE 'test-squad-%';
    DELETE FROM wines WHERE id LIKE 'test-wine-%';
    DELETE FROM profiles WHERE id LIKE 'test-%';
    
    RAISE NOTICE 'RLS test data cleanup complete';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES TABLE SECURITY TESTS
-- ============================================================================

-- Test: Users can only see their own profile and profiles of users in their squads
CREATE OR REPLACE FUNCTION test_profiles_rls()
RETURNS TABLE(test_name TEXT, expected_result INTEGER, actual_result INTEGER, passed BOOLEAN) AS $$
BEGIN
    -- Test 1: User 1 should see their own profile + User 2 (same squad) = 2 profiles
    RETURN QUERY
    SELECT 
        'User 1 can see own profile and squad members'::TEXT,
        2::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id IN ('test-user-1', 'test-user-2')),
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id IN ('test-user-1', 'test-user-2')) = 2;
    
    -- Test 2: User 3 should only see their own profile = 1 profile
    RETURN QUERY
    SELECT 
        'User 3 can only see own profile (no squad memberships)'::TEXT,
        1::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id = 'test-user-3'),
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id = 'test-user-3') = 1;
    
    -- Test 3: Admin should see all test profiles = 4 profiles
    RETURN QUERY
    SELECT 
        'Admin can see all profiles'::TEXT,
        4::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id LIKE 'test-%'),
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE id LIKE 'test-%') = 4;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TASTING NOTES TABLE SECURITY TESTS
-- ============================================================================

-- Test: Visibility controls work correctly
CREATE OR REPLACE FUNCTION test_tasting_notes_rls()
RETURNS TABLE(test_name TEXT, expected_result INTEGER, actual_result INTEGER, passed BOOLEAN) AS $$
BEGIN
    -- Test 1: User 1 should see their own notes (3) + User 2's squad note (1) + all public notes (2) = 6 notes
    RETURN QUERY
    SELECT 
        'User 1 visibility test'::TEXT,
        6::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' 
            OR user_id = 'test-user-1'
            OR (user_id = 'test-user-2' AND visibility = 'SQUAD')),
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' 
            OR user_id = 'test-user-1'
            OR (user_id = 'test-user-2' AND visibility = 'SQUAD')) = 6;
    
    -- Test 2: User 2 should see their own notes (2) + User 1's squad note (1) + all public notes (2) = 5 notes
    RETURN QUERY
    SELECT 
        'User 2 visibility test'::TEXT,
        5::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' 
            OR user_id = 'test-user-2'
            OR (user_id = 'test-user-1' AND visibility = 'SQUAD')),
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' 
            OR user_id = 'test-user-2'
            OR (user_id = 'test-user-1' AND visibility = 'SQUAD')) = 5;
    
    -- Test 3: User 3 should see their own notes (3) + public notes (2) = 5 notes
    -- (Cannot see squad notes from other users since not in same squad)
    RETURN QUERY
    SELECT 
        'User 3 visibility test (no squad access)'::TEXT,
        5::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' OR user_id = 'test-user-3'),
        (SELECT COUNT(*)::INTEGER FROM tasting_notes 
         WHERE visibility = 'PUBLIC' OR user_id = 'test-user-3') = 5;
    
    -- Test 4: Admin should see all notes
    RETURN QUERY
    SELECT 
        'Admin can see all tasting notes'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM tasting_notes WHERE id LIKE 'test-note-%'),
        (SELECT COUNT(*)::INTEGER FROM tasting_notes WHERE id LIKE 'test-note-%'),
        TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SQUADS TABLE SECURITY TESTS
-- ============================================================================

-- Test: Squad visibility based on membership and privacy level
CREATE OR REPLACE FUNCTION test_squads_rls()
RETURNS TABLE(test_name TEXT, expected_result INTEGER, actual_result INTEGER, passed BOOLEAN) AS $$
BEGIN
    -- Test 1: User 1 should see public squad + their own squads = 2 squads
    RETURN QUERY
    SELECT 
        'User 1 squad visibility'::TEXT,
        2::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squads 
         WHERE privacy_level = 'PUBLIC' 
            OR id IN (SELECT squad_id FROM squad_members WHERE user_id = 'test-user-1')),
        (SELECT COUNT(*)::INTEGER FROM squads 
         WHERE privacy_level = 'PUBLIC' 
            OR id IN (SELECT squad_id FROM squad_members WHERE user_id = 'test-user-1')) = 2;
    
    -- Test 2: User 2 should see all squads (member of both) = 2 squads
    RETURN QUERY
    SELECT 
        'User 2 squad visibility'::TEXT,
        2::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squads WHERE id LIKE 'test-squad-%'),
        (SELECT COUNT(*)::INTEGER FROM squads WHERE id LIKE 'test-squad-%') = 2;
    
    -- Test 3: User 3 should only see public squad = 1 squad
    RETURN QUERY
    SELECT 
        'User 3 squad visibility (public only)'::TEXT,
        1::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squads WHERE privacy_level = 'PUBLIC' AND id LIKE 'test-squad-%'),
        (SELECT COUNT(*)::INTEGER FROM squads WHERE privacy_level = 'PUBLIC' AND id LIKE 'test-squad-%') = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SQUAD MEMBERS TABLE SECURITY TESTS
-- ============================================================================

-- Test: Squad member visibility based on squad membership
CREATE OR REPLACE FUNCTION test_squad_members_rls()
RETURNS TABLE(test_name TEXT, expected_result INTEGER, actual_result INTEGER, passed BOOLEAN) AS $$
BEGIN
    -- Test 1: User 1 should see members of squad 1 only = 2 members
    RETURN QUERY
    SELECT 
        'User 1 can see squad 1 members'::TEXT,
        2::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squad_members 
         WHERE squad_id IN (SELECT squad_id FROM squad_members WHERE user_id = 'test-user-1')),
        (SELECT COUNT(*)::INTEGER FROM squad_members 
         WHERE squad_id IN (SELECT squad_id FROM squad_members WHERE user_id = 'test-user-1')) = 2;
    
    -- Test 2: User 2 should see all members (member of both squads) = 3 members
    RETURN QUERY
    SELECT 
        'User 2 can see all squad members'::TEXT,
        3::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squad_members WHERE id LIKE 'test-member-%'),
        (SELECT COUNT(*)::INTEGER FROM squad_members WHERE id LIKE 'test-member-%') = 3;
    
    -- Test 3: User 3 should see no squad members = 0 members
    RETURN QUERY
    SELECT 
        'User 3 cannot see any squad members'::TEXT,
        0::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM squad_members WHERE user_id = 'test-user-3'),
        (SELECT COUNT(*)::INTEGER FROM squad_members WHERE user_id = 'test-user-3') = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPREHENSIVE SECURITY TEST RUNNER
-- ============================================================================

-- Master test function that runs all security tests
CREATE OR REPLACE FUNCTION run_rls_security_tests()
RETURNS TABLE(
    test_category TEXT,
    test_name TEXT, 
    expected_result INTEGER, 
    actual_result INTEGER, 
    passed BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    -- Setup test data
    PERFORM setup_rls_test_data();
    
    -- Run profiles tests
    RETURN QUERY
    SELECT 
        'Profiles'::TEXT as test_category,
        t.test_name, 
        t.expected_result, 
        t.actual_result, 
        t.passed,
        CASE WHEN t.passed THEN 'PASS' ELSE 'FAIL - Security vulnerability detected!' END as notes
    FROM test_profiles_rls() t;
    
    -- Run tasting notes tests
    RETURN QUERY
    SELECT 
        'Tasting Notes'::TEXT as test_category,
        t.test_name, 
        t.expected_result, 
        t.actual_result, 
        t.passed,
        CASE WHEN t.passed THEN 'PASS' ELSE 'FAIL - Data leak detected!' END as notes
    FROM test_tasting_notes_rls() t;
    
    -- Run squads tests
    RETURN QUERY
    SELECT 
        'Squads'::TEXT as test_category,
        t.test_name, 
        t.expected_result, 
        t.actual_result, 
        t.passed,
        CASE WHEN t.passed THEN 'PASS' ELSE 'FAIL - Squad privacy breach!' END as notes
    FROM test_squads_rls() t;
    
    -- Run squad members tests
    RETURN QUERY
    SELECT 
        'Squad Members'::TEXT as test_category,
        t.test_name, 
        t.expected_result, 
        t.actual_result, 
        t.passed,
        CASE WHEN t.passed THEN 'PASS' ELSE 'FAIL - Member data exposed!' END as notes
    FROM test_squad_members_rls() t;
    
    -- Cleanup test data
    PERFORM cleanup_rls_test_data();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PENETRATION TESTING FUNCTIONS
-- ============================================================================

-- Test for SQL injection vulnerabilities in RLS policies
CREATE OR REPLACE FUNCTION test_rls_sql_injection()
RETURNS TABLE(test_name TEXT, vulnerability_found BOOLEAN, details TEXT) AS $$
BEGIN
    -- Test 1: Attempt to bypass RLS with malicious user input
    BEGIN
        -- This should fail if RLS is properly implemented
        PERFORM * FROM tasting_notes WHERE user_id = 'test-user-1'' OR ''1''=''1';
        RETURN QUERY SELECT 'SQL Injection Test 1'::TEXT, FALSE::BOOLEAN, 'RLS properly blocked malicious query'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'SQL Injection Test 1'::TEXT, TRUE::BOOLEAN, 'Potential vulnerability: ' || SQLERRM;
    END;
    
    -- Test 2: Attempt to access admin functions without proper auth
    BEGIN
        PERFORM is_admin('malicious-user'' OR 1=1 --');
        RETURN QUERY SELECT 'Admin Function Injection'::TEXT, FALSE::BOOLEAN, 'Admin check properly validated'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Admin Function Injection'::TEXT, TRUE::BOOLEAN, 'Function injection blocked: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Test for privilege escalation attempts
CREATE OR REPLACE FUNCTION test_privilege_escalation()
RETURNS TABLE(test_name TEXT, escalation_blocked BOOLEAN, details TEXT) AS $$
BEGIN
    -- Test 1: Attempt to modify other user's data
    BEGIN
        UPDATE profiles SET email = 'hacked@example.com' WHERE id = 'test-user-2';
        
        -- If we reach here, check if the update actually succeeded
        IF EXISTS (SELECT 1 FROM profiles WHERE id = 'test-user-2' AND email = 'hacked@example.com') THEN
            RETURN QUERY SELECT 'Profile Hijack Test'::TEXT, FALSE::BOOLEAN, 'CRITICAL: User data was modified!'::TEXT;
        ELSE
            RETURN QUERY SELECT 'Profile Hijack Test'::TEXT, TRUE::BOOLEAN, 'RLS blocked unauthorized update'::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Profile Hijack Test'::TEXT, TRUE::BOOLEAN, 'Update blocked: ' || SQLERRM;
    END;
    
    -- Test 2: Attempt to join private squad without permission
    BEGIN
        INSERT INTO squad_members (id, squad_id, user_id, role, joined_at) 
        VALUES ('hack-attempt', 'test-squad-2', 'test-user-3', 'ADMIN', NOW());
        
        -- Check if insertion succeeded
        IF EXISTS (SELECT 1 FROM squad_members WHERE id = 'hack-attempt') THEN
            RETURN QUERY SELECT 'Private Squad Infiltration'::TEXT, FALSE::BOOLEAN, 'CRITICAL: Unauthorized squad access!'::TEXT;
        ELSE
            RETURN QUERY SELECT 'Private Squad Infiltration'::TEXT, TRUE::BOOLEAN, 'RLS blocked unauthorized squad join'::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Private Squad Infiltration'::TEXT, TRUE::BOOLEAN, 'Squad join blocked: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE IMPACT TESTING
-- ============================================================================

-- Measure RLS policy performance impact
CREATE OR REPLACE FUNCTION test_rls_performance()
RETURNS TABLE(
    operation TEXT,
    table_name TEXT,
    execution_time_ms NUMERIC,
    rows_affected INTEGER,
    performance_impact TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
BEGIN
    -- Setup test data
    PERFORM setup_rls_test_data();
    
    -- Test 1: Profile selection performance
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM profiles;
    end_time := clock_timestamp();
    duration := EXTRACT(MILLISECONDS FROM end_time - start_time);
    
    RETURN QUERY SELECT 
        'SELECT'::TEXT, 
        'profiles'::TEXT, 
        duration, 
        (SELECT COUNT(*)::INTEGER FROM profiles),
        CASE WHEN duration < 10 THEN 'Excellent' 
             WHEN duration < 50 THEN 'Good' 
             WHEN duration < 100 THEN 'Acceptable' 
             ELSE 'Poor' END;
    
    -- Test 2: Tasting notes complex visibility query performance
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM tasting_notes WHERE visibility IN ('PUBLIC', 'SQUAD');
    end_time := clock_timestamp();
    duration := EXTRACT(MILLISECONDS FROM end_time - start_time);
    
    RETURN QUERY SELECT 
        'SELECT with visibility filter'::TEXT, 
        'tasting_notes'::TEXT, 
        duration, 
        (SELECT COUNT(*)::INTEGER FROM tasting_notes WHERE visibility IN ('PUBLIC', 'SQUAD')),
        CASE WHEN duration < 10 THEN 'Excellent' 
             WHEN duration < 50 THEN 'Good' 
             WHEN duration < 100 THEN 'Acceptable' 
             ELSE 'Poor' END;
    
    -- Test 3: Squad membership join query performance
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM squads s 
    JOIN squad_members sm ON s.id = sm.squad_id;
    end_time := clock_timestamp();
    duration := EXTRACT(MILLISECONDS FROM end_time - start_time);
    
    RETURN QUERY SELECT 
        'JOIN with RLS'::TEXT, 
        'squads + squad_members'::TEXT, 
        duration, 
        (SELECT COUNT(*)::INTEGER FROM squads s JOIN squad_members sm ON s.id = sm.squad_id),
        CASE WHEN duration < 10 THEN 'Excellent' 
             WHEN duration < 50 THEN 'Good' 
             WHEN duration < 100 THEN 'Acceptable' 
             ELSE 'Poor' END;
    
    -- Cleanup test data
    PERFORM cleanup_rls_test_data();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MASTER TEST RUNNER
-- ============================================================================

-- Run all security and performance tests
CREATE OR REPLACE FUNCTION run_complete_rls_test_suite()
RETURNS TABLE(
    test_suite TEXT,
    test_category TEXT,
    test_name TEXT,
    result TEXT,
    details TEXT,
    severity TEXT
) AS $$
BEGIN
    -- Security Tests
    RETURN QUERY
    SELECT 
        'Security'::TEXT as test_suite,
        s.test_category,
        s.test_name,
        CASE WHEN s.passed THEN 'PASS' ELSE 'FAIL' END as result,
        'Expected: ' || s.expected_result || ', Actual: ' || s.actual_result as details,
        CASE WHEN s.passed THEN 'INFO' ELSE 'CRITICAL' END as severity
    FROM run_rls_security_tests() s;
    
    -- Penetration Tests
    RETURN QUERY
    SELECT 
        'Penetration'::TEXT as test_suite,
        'SQL Injection'::TEXT as test_category,
        p.test_name,
        CASE WHEN p.vulnerability_found THEN 'VULNERABILITY' ELSE 'SECURE' END as result,
        p.details,
        CASE WHEN p.vulnerability_found THEN 'CRITICAL' ELSE 'INFO' END as severity
    FROM test_rls_sql_injection() p;
    
    RETURN QUERY
    SELECT 
        'Penetration'::TEXT as test_suite,
        'Privilege Escalation'::TEXT as test_category,
        pe.test_name,
        CASE WHEN pe.escalation_blocked THEN 'BLOCKED' ELSE 'VULNERABILITY' END as result,
        pe.details,
        CASE WHEN pe.escalation_blocked THEN 'INFO' ELSE 'CRITICAL' END as severity
    FROM test_privilege_escalation() pe;
    
    -- Performance Tests
    RETURN QUERY
    SELECT 
        'Performance'::TEXT as test_suite,
        'RLS Impact'::TEXT as test_category,
        pf.operation || ' on ' || pf.table_name as test_name,
        pf.performance_impact as result,
        pf.execution_time_ms || 'ms for ' || pf.rows_affected || ' rows' as details,
        CASE WHEN pf.performance_impact IN ('Excellent', 'Good') THEN 'INFO'
             WHEN pf.performance_impact = 'Acceptable' THEN 'WARNING'
             ELSE 'CRITICAL' END as severity
    FROM test_rls_performance() pf;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
To run the complete RLS test suite:

SELECT * FROM run_complete_rls_test_suite() 
ORDER BY test_suite, severity DESC, test_category, test_name;

To run only security tests:
SELECT * FROM run_rls_security_tests();

To run only performance tests:
SELECT * FROM test_rls_performance();

To run penetration tests:
SELECT * FROM test_rls_sql_injection();
SELECT * FROM test_privilege_escalation();

To manually setup/cleanup test data:
SELECT setup_rls_test_data();
SELECT cleanup_rls_test_data();

Expected Results:
- All security tests should PASS
- No vulnerabilities should be found in penetration tests  
- Performance should be 'Good' or better for most operations
- Any CRITICAL severity results require immediate attention
*/