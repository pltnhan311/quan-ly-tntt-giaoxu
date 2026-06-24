-- 1. Drop old classes policies for GLVs
DROP POLICY IF EXISTS "GLV can view their assigned classes" ON public.classes;

-- 2. Create new classes policy allowing both GLVs and Trưởng Ngành who teach to view
CREATE POLICY "Staff can view their assigned classes" ON public.classes
    FOR SELECT
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'glv'::public.app_role) OR public.has_role(auth.uid(), 'truong_nganh'::public.app_role)) AND
        (EXISTS (
            SELECT 1 FROM public.class_catechists cc
            JOIN public.catechists cat ON cc.catechist_id = cat.id
            WHERE cc.class_id = public.classes.id AND cat.user_id = auth.uid()
        ))
    );

-- 3. Drop old GLV student management policy
DROP POLICY IF EXISTS "GLV can manage students in their classes" ON public.students;

-- 4. Create new students policy allowing both GLVs and Trưởng Ngành who teach to manage students
CREATE POLICY "Staff can manage students in their assigned classes" ON public.students
    FOR ALL
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'glv'::public.app_role) OR public.has_role(auth.uid(), 'truong_nganh'::public.app_role)) AND
        (EXISTS (
            SELECT 1 FROM public.class_catechists cc
            JOIN public.catechists cat ON cc.catechist_id = cat.id
            WHERE cc.class_id = public.students.class_id AND cat.user_id = auth.uid()
        ))
    );

-- 5. Drop old GLV materials policy
DROP POLICY IF EXISTS "GLV can manage materials for their classes" ON public.learning_materials;

-- 6. Create new materials policy allowing both GLVs and Trưởng Ngành who teach to manage materials
CREATE POLICY "Staff can manage materials for their assigned classes" ON public.learning_materials
    FOR ALL
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'glv'::public.app_role) OR public.has_role(auth.uid(), 'truong_nganh'::public.app_role)) AND
        (EXISTS (
            SELECT 1 FROM public.class_catechists cc
            JOIN public.catechists cat ON cc.catechist_id = cat.id
            WHERE cc.class_id = public.learning_materials.class_id AND cat.user_id = auth.uid()
        ))
    );

-- 7. Create new policy for Trưởng Ngành to upload and manage materials in their led branch
CREATE POLICY "Truong nganh can manage materials for their branches" ON public.learning_materials
    FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'truong_nganh'::public.app_role) AND
        branch_id IN (SELECT public.get_led_branches(auth.uid()))
    );

-- 8. Drop old Staff view materials policy
DROP POLICY IF EXISTS "Staff can view relevant materials" ON public.learning_materials;

-- 9. Recreate Staff view materials policy with Trưởng Ngành class teacher support
CREATE POLICY "Staff can view relevant materials" ON public.learning_materials
    FOR SELECT
    TO authenticated
    USING (
        -- Admin: see everything
        public.has_role(auth.uid(), 'admin'::public.app_role)
        -- Truong nganh: their branch materials + Chung (branch_id IS NULL) + classes they teach
        OR (
            public.has_role(auth.uid(), 'truong_nganh'::public.app_role)
            AND (
                branch_id IS NULL
                OR branch_id IN (SELECT public.get_led_branches(auth.uid()))
                OR class_id IN (
                    SELECT cc.class_id
                    FROM public.class_catechists cc
                    JOIN public.catechists c ON cc.catechist_id = c.id
                    WHERE c.user_id = auth.uid()
                )
            )
        )
        -- GLV: Chung + their branch + their specific classes
        OR (
            public.has_role(auth.uid(), 'glv'::public.app_role)
            AND (
                branch_id IS NULL
                OR class_id IN (
                    SELECT cc.class_id
                    FROM public.class_catechists cc
                    JOIN public.catechists c ON cc.catechist_id = c.id
                    WHERE c.user_id = auth.uid()
                )
                OR branch_id IN (
                    SELECT cl.branch_id
                    FROM public.classes cl
                    JOIN public.class_catechists cc2 ON cc2.class_id = cl.id
                    JOIN public.catechists cat ON cc2.catechist_id = cat.id
                    WHERE cat.user_id = auth.uid()
                )
            )
        )
    );
