CREATE TABLE IF NOT EXISTS public.class_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    note text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT class_schedules_time_check CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS class_schedules_class_weekday_unique
    ON public.class_schedules (class_id, weekday) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    original_date date NOT NULL,
    exception_type text NOT NULL CHECK (exception_type IN ('cancelled', 'rescheduled')),
    new_date date,
    start_time time,
    end_time time,
    note text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT schedule_exceptions_reschedule_check CHECK (
      (exception_type = 'cancelled' AND new_date IS NULL)
      OR (exception_type = 'rescheduled' AND new_date IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_exceptions_class_date_unique
    ON public.schedule_exceptions (class_id, original_date);

CREATE TABLE IF NOT EXISTS public.parish_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    start_time time,
    end_time time,
    location text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT parish_events_time_check CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view class schedules" ON public.class_schedules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage class schedules" ON public.class_schedules
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view schedule exceptions" ON public.schedule_exceptions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage schedule exceptions" ON public.schedule_exceptions
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can view parish events" ON public.parish_events
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage parish events" ON public.parish_events
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parish_events_updated_at
  BEFORE UPDATE ON public.parish_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
