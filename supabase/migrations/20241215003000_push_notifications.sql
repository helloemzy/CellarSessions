-- Push Notifications Migration
-- Adds push notification functionality and user preferences

-- Add push notification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "squad_activities": true,
  "likes": true,
  "comments": true,
  "challenges": true,
  "member_updates": true
}'::jsonb;

-- Create push notifications log table
CREATE TABLE IF NOT EXISTS push_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('SQUAD_ACTIVITY', 'LIKE', 'COMMENT', 'CHALLENGE', 'MEMBER_JOINED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing for performance
    CONSTRAINT valid_notification_type CHECK (type IN ('SQUAD_ACTIVITY', 'LIKE', 'COMMENT', 'CHALLENGE', 'MEMBER_JOINED'))
);

-- Create notification preferences table for granular control
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    squad_activities BOOLEAN DEFAULT true,
    likes BOOLEAN DEFAULT true,
    comments BOOLEAN DEFAULT true,
    challenges BOOLEAN DEFAULT true,
    member_updates BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON push_notifications(type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_sent_at ON push_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_read ON push_notifications(read, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_push_enabled ON profiles(push_notifications_enabled) WHERE push_notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_notifications
-- Users can only see their own notifications
CREATE POLICY "Users can view their own push notifications" ON push_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update read status of their own notifications
CREATE POLICY "Users can update their own notification read status" ON push_notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System can insert notifications (this would typically be done via service role)
CREATE POLICY "Service role can insert notifications" ON push_notifications
    FOR INSERT
    WITH CHECK (true); -- This should be restricted to service role in production

-- RLS Policies for notification_preferences
-- Users can view and manage their own preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE push_notifications 
    SET 
        read = true,
        read_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
    update_count INTEGER;
BEGIN
    UPDATE push_notifications 
    SET 
        read = true,
        read_at = now()
    WHERE user_id = auth.uid() AND read = false;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RETURN update_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM push_notifications
    WHERE user_id = auth.uid() AND read = false;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old notifications (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM push_notifications
    WHERE sent_at < (now() - interval '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user notification preferences with defaults
CREATE OR REPLACE FUNCTION get_user_notification_preferences(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    user_prefs notification_preferences%ROWTYPE;
    result JSON;
BEGIN
    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        -- Return default preferences if none exist
        result := json_build_object(
            'squad_activities', true,
            'likes', true,
            'comments', true,
            'challenges', true,
            'member_updates', true,
            'quiet_hours_enabled', false,
            'quiet_hours_start', '22:00:00',
            'quiet_hours_end', '08:00:00',
            'timezone', 'UTC'
        );
    ELSE
        result := json_build_object(
            'squad_activities', user_prefs.squad_activities,
            'likes', user_prefs.likes,
            'comments', user_prefs.comments,
            'challenges', user_prefs.challenges,
            'member_updates', user_prefs.member_updates,
            'quiet_hours_enabled', user_prefs.quiet_hours_enabled,
            'quiet_hours_start', user_prefs.quiet_hours_start,
            'quiet_hours_end', user_prefs.quiet_hours_end,
            'timezone', user_prefs.timezone
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_user_in_quiet_hours(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    prefs notification_preferences%ROWTYPE;
    current_time_in_tz TIME;
    is_quiet BOOLEAN := false;
BEGIN
    SELECT * INTO prefs
    FROM notification_preferences
    WHERE user_id = target_user_id;
    
    -- If no preferences or quiet hours disabled, not in quiet hours
    IF NOT FOUND OR NOT prefs.quiet_hours_enabled THEN
        RETURN false;
    END IF;
    
    -- Get current time in user's timezone
    current_time_in_tz := (now() AT TIME ZONE prefs.timezone)::TIME;
    
    -- Check if current time is within quiet hours
    IF prefs.quiet_hours_start <= prefs.quiet_hours_end THEN
        -- Same day range (e.g., 22:00 to 08:00 next day)
        is_quiet := current_time_in_tz >= prefs.quiet_hours_start OR current_time_in_tz <= prefs.quiet_hours_end;
    ELSE
        -- Cross-midnight range (e.g., 22:00 to 08:00)
        is_quiet := current_time_in_tz >= prefs.quiet_hours_start OR current_time_in_tz <= prefs.quiet_hours_end;
    END IF;
    
    RETURN is_quiet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_in_quiet_hours TO authenticated;

-- Grant service role permissions for background tasks
GRANT SELECT, INSERT, UPDATE, DELETE ON push_notifications TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO service_role;