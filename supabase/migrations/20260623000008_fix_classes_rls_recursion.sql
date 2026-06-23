-- Create helper function with SECURITY DEFINER to bypass RLS when fetching student's class
CREATE OR REPLACE FUNCTION public.get_student_class(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT class_id FROM public.students WHERE user_id = _user_id LIMIT 1;
$$;

-- Drop the old policy that caused infinite recursion
DROP POLICY IF EXISTS "Students can view their own class" ON public.classes;

-- Create the corrected policy using the helper function
CREATE POLICY "Students can view their own class" ON public.classes
    FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'student'::public.app_role) AND
        id = public.get_student_class(auth.uid())
    );
