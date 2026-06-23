-- ============================================================
-- TNTT v2.0: Remove student_id (Mã học viên) from public.students
-- ============================================================

ALTER TABLE public.students DROP COLUMN IF EXISTS student_id;
