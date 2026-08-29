-- A user may only have the derived truong_nganh role while leading a branch.

CREATE OR REPLACE FUNCTION public.prevent_orphan_truong_nganh_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'truong_nganh'::public.app_role
     AND NOT EXISTS (
       SELECT 1
       FROM public.branches b
       JOIN public.catechists c ON c.id = b.leader_catechist_id
       WHERE c.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'A truong_nganh must be assigned to a branch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_branch_for_truong_nganh ON public.user_roles;
CREATE TRIGGER require_branch_for_truong_nganh
  BEFORE INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_orphan_truong_nganh_role();
