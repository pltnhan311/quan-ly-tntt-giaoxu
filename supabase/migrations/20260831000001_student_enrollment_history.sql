-- Keep the current students.class_id as the current-state shortcut, and store
-- the complete class/academic-year history in a separate table.
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    started_on date DEFAULT CURRENT_DATE NOT NULL,
    ended_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_enrollments_pkey PRIMARY KEY (id),
    CONSTRAINT student_enrollments_student_fkey FOREIGN KEY (student_id)
        REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT student_enrollments_class_fkey FOREIGN KEY (class_id)
        REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT student_enrollments_academic_year_fkey FOREIGN KEY (academic_year_id)
        REFERENCES public.academic_years(id) ON DELETE CASCADE,
    CONSTRAINT student_enrollments_dates_check CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS student_enrollments_unique_class
    ON public.student_enrollments (student_id, class_id, academic_year_id);

CREATE UNIQUE INDEX IF NOT EXISTS student_enrollments_one_active_year
    ON public.student_enrollments (student_id, academic_year_id)
    WHERE ended_on IS NULL;

CREATE INDEX IF NOT EXISTS student_enrollments_student_history_idx
    ON public.student_enrollments (student_id, started_on DESC);

-- Backfill the current assignment for existing students.
INSERT INTO public.student_enrollments (student_id, class_id, academic_year_id, started_on)
SELECT s.id, c.id, c.academic_year_id, COALESCE(s.enrollment_date, s.created_at::date)
FROM public.students s
JOIN public.classes c ON c.id = s.class_id
ON CONFLICT (student_id, class_id, academic_year_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_student_enrollment_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    old_year_id uuid;
    new_year_id uuid;
    change_date date := COALESCE(NEW.updated_at::date, CURRENT_DATE);
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.class_id IS NOT DISTINCT FROM OLD.class_id THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.class_id IS NOT NULL THEN
        SELECT academic_year_id INTO old_year_id
        FROM public.classes
        WHERE id = OLD.class_id;

        UPDATE public.student_enrollments
        SET ended_on = GREATEST(change_date, started_on)
        WHERE student_id = NEW.id
          AND class_id = OLD.class_id
          AND ended_on IS NULL;
    END IF;

    IF NEW.class_id IS NOT NULL THEN
        SELECT academic_year_id INTO new_year_id
        FROM public.classes
        WHERE id = NEW.class_id;

        IF new_year_id IS NOT NULL THEN
            INSERT INTO public.student_enrollments (
                student_id, class_id, academic_year_id, started_on
            )
            VALUES (
                NEW.id, NEW.class_id, new_year_id,
                CASE
                    WHEN TG_OP = 'INSERT' THEN COALESCE(NEW.enrollment_date, change_date)
                    ELSE change_date
                END
            )
            ON CONFLICT (student_id, class_id, academic_year_id) DO UPDATE
            SET ended_on = NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_student_enrollment_history_trigger ON public.students;
CREATE TRIGGER sync_student_enrollment_history_trigger
    AFTER INSERT OR UPDATE OF class_id ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_enrollment_history();

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view student enrollment history"
    ON public.student_enrollments
    FOR SELECT TO authenticated
    USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage student enrollment history"
    ON public.student_enrollments
    FOR ALL TO authenticated
    USING (public.is_staff(auth.uid()))
    WITH CHECK (public.is_staff(auth.uid()));

-- Student accounts are not part of this staff-only application anymore.
DELETE FROM public.user_roles WHERE role = 'student'::public.app_role;

ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_no_student_role;
ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_no_student_role CHECK (role <> 'student'::public.app_role);

DROP POLICY IF EXISTS "Students can insert own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can update own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can delete own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can insert own mass attendance" ON public.mass_attendance;
DROP POLICY IF EXISTS "Students can update own mass attendance" ON public.mass_attendance;
DROP POLICY IF EXISTS "Students can delete own mass attendance" ON public.mass_attendance;
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view own mass attendance" ON public.mass_attendance;
DROP POLICY IF EXISTS "Students can view own scores" ON public.scores;
DROP POLICY IF EXISTS "Students can view themselves" ON public.students;
DROP POLICY IF EXISTS "Students can view their own class" ON public.classes;

DROP FUNCTION IF EXISTS public.get_student_class(uuid);
