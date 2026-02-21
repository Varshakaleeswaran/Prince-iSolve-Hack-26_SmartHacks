-- Add citizen confirmation and rating to complaints
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS citizen_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for complaints and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _complaint_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
  VALUES (_user_id, _title, _message, _type, _complaint_id);
END;
$$;

-- Function to notify all officers and admins
CREATE OR REPLACE FUNCTION public.notify_officers_admins(
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _complaint_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  FOR _user_id IN 
    SELECT user_id FROM public.user_roles WHERE role IN ('officer', 'admin')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
    VALUES (_user_id, _title, _message, _type, _complaint_id);
  END LOOP;
END;
$$;

-- Trigger function for complaint status changes
CREATE OR REPLACE FUNCTION public.handle_complaint_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify citizen on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.create_notification(
      NEW.citizen_id,
      'Complaint Status Updated',
      'Your complaint status changed to: ' || NEW.status,
      'status_change',
      NEW.id
    );
  END IF;
  
  -- Notify worker when assigned
  IF OLD.worker_id IS DISTINCT FROM NEW.worker_id AND NEW.worker_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.worker_id,
      'New Assignment',
      'You have been assigned a new complaint',
      'assignment',
      NEW.id
    );
    
    -- Also notify citizen about assignment
    PERFORM public.create_notification(
      NEW.citizen_id,
      'Worker Assigned',
      'A worker has been assigned to your complaint',
      'assignment',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS complaint_status_change_trigger ON public.complaints;
CREATE TRIGGER complaint_status_change_trigger
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.handle_complaint_status_change();

-- Trigger function for new complaints
CREATE OR REPLACE FUNCTION public.handle_new_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify all officers and admins about new complaint
  PERFORM public.notify_officers_admins(
    'New Complaint Submitted',
    'A new complaint has been submitted and needs review',
    'new_complaint',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new complaints
DROP TRIGGER IF EXISTS new_complaint_trigger ON public.complaints;
CREATE TRIGGER new_complaint_trigger
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_complaint();