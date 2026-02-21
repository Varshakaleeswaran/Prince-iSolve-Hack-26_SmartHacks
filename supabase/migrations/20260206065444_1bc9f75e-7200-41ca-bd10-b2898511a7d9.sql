-- Fix the permissive INSERT policy - use security definer function instead
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only allow inserts through the security definer functions (create_notification, notify_officers_admins)
-- No direct INSERT policy needed since triggers use SECURITY DEFINER functions