# CellarSessions Row Level Security (RLS) Implementation

## Overview

This document provides comprehensive documentation for the Row Level Security implementation in the CellarSessions application. The RLS system ensures data isolation, privacy controls, and secure access patterns across all database tables.

## Security Model

### Core Principles

1. **Principle of Least Privilege**: Users can only access data they own or have explicit permission to view
2. **Data Isolation**: Complete separation between user data, preventing cross-user data leaks
3. **Squad-Based Sharing**: Controlled data sharing within squad groups based on membership and visibility settings
4. **Administrative Override**: System administrators have elevated access for support and moderation
5. **Audit Trail**: All access attempts and security events are logged for monitoring

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CellarSessions RLS Model                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER LEVEL                SQUAD LEVEL              ADMIN   │
│  ┌─────────┐              ┌─────────────┐          ┌─────┐  │
│  │ Private │              │   Squad     │          │Admin│  │
│  │  Data   │              │   Shared    │          │Full │  │
│  │ ┌─────┐ │              │   Data      │          │Acc- │  │
│  │ │Mine │ │              │ ┌─────────┐ │          │ess  │  │
│  │ │Only │ │◄────────────►│ │Members  │ │◄────────►│     │  │
│  │ └─────┘ │              │ │ Only    │ │          │     │  │
│  └─────────┘              │ └─────────┘ │          └─────┘  │
│       ▲                   └─────────────┘              ▲    │
│       │                          ▲                     │    │
│       └──────────────┐            │            ┌────────┘    │
│                      │            │            │             │
│  PUBLIC LEVEL        │            │            │             │
│  ┌─────────────┐     │            │            │             │
│  │   Public    │     │            │            │             │
│  │    Data     │     │            │            │             │
│  │ ┌─────────┐ │     │            │            │             │
│  │ │Everyone │ │─────┴────────────┴────────────┘             │
│  │ │Can View │ │                                             │
│  │ └─────────┘ │                                             │
│  └─────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

## Table-by-Table Security Implementation

### 1. Profiles Table

**Security Objective**: Users can access their own profile and profiles of users they share squads with.

#### Access Rules
- **SELECT**: Own profile + squad member profiles + admin access
- **INSERT**: Users can only create their own profile
- **UPDATE**: Users can only modify their own profile
- **DELETE**: Users can delete their own profile (admins can delete any)

#### Implementation Details
```sql
-- Users can view their own profile and profiles of users in their squads
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (
        auth.uid()::text = id                    -- Own profile
        OR EXISTS (                              -- Squad member profiles
            SELECT 1 FROM squad_members sm1
            JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
            WHERE sm1.user_id = auth.uid()::text
            AND sm2.user_id = profiles.id
        )
        OR EXISTS (                              -- Admin access
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()::text
            AND p.email LIKE '%@cellarai.com'
        )
    );
```

#### Security Benefits
- Prevents profile enumeration attacks
- Enables social features within squads
- Maintains privacy for non-squad members
- Provides admin oversight capabilities

### 2. Tasting Notes Table

**Security Objective**: Complex visibility controls based on user ownership, squad membership, and visibility levels.

#### Visibility Levels
1. **PRIVATE**: Only the owner can view
2. **SQUAD**: Owner + squad members can view
3. **PUBLIC**: Everyone can view

#### Access Rules Matrix
| User Type | PRIVATE | SQUAD | PUBLIC |
|-----------|---------|-------|--------|
| Owner     | ✓       | ✓     | ✓      |
| Squad Member | ✗    | ✓     | ✓      |
| Other User | ✗      | ✗     | ✓      |
| Admin     | ✓       | ✓     | ✓      |

#### Implementation Details
```sql
CREATE POLICY "tasting_notes_select_policy" ON tasting_notes
    FOR SELECT
    USING (
        auth.uid()::text = user_id               -- Own notes
        OR visibility = 'PUBLIC'                 -- Public notes
        OR (                                     -- Squad notes
            visibility = 'SQUAD'
            AND EXISTS (
                SELECT 1 FROM squad_members sm1
                JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
                WHERE sm1.user_id = auth.uid()::text
                AND sm2.user_id = tasting_notes.user_id
            )
        )
        OR is_admin()                           -- Admin access
    );
```

#### Security Benefits
- Granular privacy controls
- Enables community sharing within squads
- Protects sensitive tasting data
- Supports public knowledge sharing

### 3. Squads Table

**Security Objective**: Control squad visibility based on privacy levels and membership.

#### Privacy Levels
1. **PUBLIC**: Visible to all users
2. **PRIVATE**: Only visible to members
3. **INVITE_ONLY**: Visible to all, but requires invitation to join

#### Access Rules
- **SELECT**: Public squads + member squads + admin access
- **INSERT**: Any authenticated user can create squads
- **UPDATE**: Squad creators + squad admins + system admins
- **DELETE**: Squad creators + system admins only

#### Implementation Details
```sql
CREATE POLICY "squads_select_policy" ON squads
    FOR SELECT
    USING (
        privacy_level = 'PUBLIC'                 -- Public squads
        OR EXISTS (                              -- Member squads
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squads.id
            AND sm.user_id = auth.uid()::text
        )
        OR is_admin()                           -- Admin access
    );
```

### 4. Squad Members Table

**Security Objective**: Restrict access to squad membership information based on squad participation.

#### Access Rules
- **SELECT**: Members can see other members of their squads
- **INSERT**: Squad admins can add members; users can join public squads
- **UPDATE**: Squad admins can modify member roles
- **DELETE**: Users can leave squads; admins can remove members

#### Special Considerations
- Prevents squad member enumeration
- Enables squad management functionality
- Protects privacy of squad participation

### 5. Supporting Tables

#### Wines Table
- **Open Access**: All authenticated users can view wines (reference data)
- **Admin Only**: Only admins can modify wine database

#### Blind Tasting Guesses Table
- **Follows Tasting Notes**: Access follows the associated tasting note's visibility rules
- **Contextual Access**: Users can only guess on notes they can access

## Administrative Functions

### Admin Detection
System administrators are identified by email domain:
```sql
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
```

### Admin Capabilities
- Full access to all tables and records
- Ability to moderate content
- User management capabilities
- System monitoring and debugging

## Performance Optimization

### Index Strategy
Critical indexes for RLS policy performance:

```sql
-- Core RLS indexes
CREATE INDEX idx_squad_members_user_squad ON squad_members(user_id, squad_id);
CREATE INDEX idx_tasting_notes_user_visibility ON tasting_notes(user_id, visibility);
CREATE INDEX idx_profiles_email_admin ON profiles(email) WHERE email LIKE '%@cellarai.com';
```

### Materialized Views
Pre-computed views for expensive operations:

1. **mv_user_squads**: User squad memberships
2. **mv_squad_relationships**: User relationship graph

### Performance Targets
- Simple queries: < 50ms p95
- Complex queries: < 100ms p95
- Materialized view queries: < 10ms p95

## Security Testing

### Automated Test Suite
Comprehensive testing covers:

1. **Access Control Tests**: Verify correct access permissions
2. **Data Isolation Tests**: Ensure no cross-user data leaks
3. **Penetration Tests**: SQL injection and privilege escalation attempts
4. **Performance Tests**: Measure RLS overhead

### Test Categories

#### Functional Security Tests
```sql
-- Verify user 1 can only see appropriate profiles
SELECT COUNT(*) FROM profiles; -- Should return expected count based on squad membership
```

#### Penetration Tests
```sql
-- Attempt SQL injection
PERFORM * FROM tasting_notes WHERE user_id = 'test'' OR ''1''=''1';
-- Should be blocked by RLS
```

#### Performance Tests
```sql
-- Measure query performance with RLS enabled
SELECT benchmark_rls_performance();
```

## Audit and Monitoring

### Security Audit Log
All security-relevant events are logged:

```sql
CREATE TABLE security_audit_log (
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
```

### Monitored Events
- RLS policy violations
- Admin actions
- Failed access attempts
- Performance anomalies
- Maintenance operations

### Alerting
- Critical security events trigger immediate alerts
- Performance degradation monitoring
- Unusual access pattern detection

## Deployment Procedures

### Initial Setup
1. Execute `rls-policies.sql` to create all policies
2. Run `rls-security-tests.sql` to validate implementation
3. Execute performance optimization scripts
4. Set up monitoring and alerting

### Verification Steps
```sql
-- Run complete test suite
SELECT * FROM run_complete_rls_test_suite() 
ORDER BY test_suite, severity DESC;

-- Verify all tests pass
-- Check performance meets targets
-- Confirm no security vulnerabilities
```

### Rollback Plan
- RLS policies can be disabled per table if issues arise
- Backup policies available for quick restoration
- Performance monitoring to detect degradation

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Refresh materialized views
- Monitor performance metrics
- Review audit logs for anomalies

#### Weekly
- Run comprehensive security tests
- Analyze index usage and performance
- Review and optimize slow queries

#### Monthly
- Full performance benchmark
- Security policy review
- Update performance optimizations

### Maintenance Commands
```sql
-- Daily maintenance
SELECT maintain_rls_performance();

-- Weekly testing
SELECT * FROM run_complete_rls_test_suite();

-- Performance analysis
SELECT * FROM benchmark_rls_performance();
```

## Troubleshooting

### Common Issues

#### Performance Problems
1. **Symptom**: Slow query performance
2. **Diagnosis**: Check index usage and query plans
3. **Solution**: Add missing indexes or optimize policies

#### Access Denied Errors
1. **Symptom**: Users cannot access expected data
2. **Diagnosis**: Review RLS policy logic
3. **Solution**: Verify squad membership and visibility settings

#### Data Leaks
1. **Symptom**: Users see unauthorized data
2. **Diagnosis**: Run penetration tests
3. **Solution**: Immediate policy correction and audit

### Debugging Commands
```sql
-- Check user's squad memberships
SELECT * FROM mv_user_squads WHERE user_id = 'user-id';

-- Test specific policy
SELECT can_access_tasting_note('note-id', 'user-id');

-- Review recent audit events
SELECT * FROM security_audit_log 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Security Best Practices

### Development Guidelines
1. Always test RLS policies with multiple user contexts
2. Use the least permissive policy that meets requirements
3. Regularly review and audit policy effectiveness
4. Monitor performance impact of policy changes
5. Document all policy decisions and rationale

### Code Review Checklist
- [ ] Policy covers all CRUD operations
- [ ] No obvious bypass vulnerabilities
- [ ] Performance impact assessed
- [ ] Test coverage includes edge cases
- [ ] Documentation updated

### Deployment Checklist
- [ ] All tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security review completed
- [ ] Monitoring configured
- [ ] Rollback plan documented

## Conclusion

The CellarSessions RLS implementation provides comprehensive security while maintaining performance and usability. The multi-layered approach ensures data protection at the database level while enabling rich social features through controlled sharing mechanisms.

Key benefits:
- **Complete data isolation** between users
- **Flexible privacy controls** for content sharing
- **Squad-based collaboration** with secure access
- **Administrative oversight** for content moderation
- **Performance optimization** for scalability
- **Comprehensive audit trail** for compliance

This implementation follows security best practices and provides a robust foundation for the CellarSessions application's data protection requirements.