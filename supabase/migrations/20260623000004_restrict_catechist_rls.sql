-- ============================================================
-- Restrict catechist RLS: Only admins can manage all catechists
-- GLV/Trưởng Ngành cannot modify other catechists anymore.
-- ============================================================

DROP POLICY IF EXISTS "Staff can manage GLV catechists" ON public.catechists;
