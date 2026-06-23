-- Drop the policy that allows everyone to view classes
DROP POLICY IF EXISTS "Everyone can view classes" ON public.classes;

-- Create policy for GLVs to view their assigned classes
CREATE POLICY "GLV can view their assigned classes" ON public.classes
    FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'glv'::public.app_role) AND
        (EXISTS (
            SELECT 1 FROM public.class_catechists cc
            JOIN public.catechists cat ON cc.catechist_id = cat.id
            WHERE cc.class_id = public.classes.id AND cat.user_id = auth.uid()
        ))
    );

-- Create policy for Students to view their assigned class
CREATE POLICY "Students can view their own class" ON public.classes
    FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'student'::public.app_role) AND
        id IN (
            SELECT class_id FROM public.students WHERE user_id = auth.uid()
        )
    );
