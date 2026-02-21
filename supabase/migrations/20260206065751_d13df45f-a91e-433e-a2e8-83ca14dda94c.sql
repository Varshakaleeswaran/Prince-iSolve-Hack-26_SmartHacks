-- Allow officers and admins to view user_roles (needed for worker assignment dropdown)
CREATE POLICY "Officers can view all roles"
ON public.user_roles FOR SELECT
USING (is_officer_or_admin(auth.uid()));