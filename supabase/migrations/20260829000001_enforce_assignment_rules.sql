-- Enforce assignment business rules at the database boundary.
-- A catechist can lead at most one branch and belong to at most one class.

CREATE UNIQUE INDEX IF NOT EXISTS branches_one_leader_per_catechist_idx
  ON public.branches (leader_catechist_id)
  WHERE leader_catechist_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS class_catechists_one_class_per_catechist_idx
  ON public.class_catechists (catechist_id);

CREATE OR REPLACE FUNCTION public.assign_branch_leader(
  p_branch_id uuid,
  p_catechist_id uuid DEFAULT NULL
)
RETURNS public.branches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_branch public.branches%ROWTYPE;
  v_previous_leader uuid;
  v_previous_user_id uuid;
  v_new_user_id uuid;
  v_new_user_role public.app_role;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can assign branch leaders'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_branch
  FROM public.branches
  WHERE id = p_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found' USING ERRCODE = 'P0002';
  END IF;

  v_previous_leader := v_branch.leader_catechist_id;

  IF p_catechist_id IS NOT NULL THEN
    SELECT user_id INTO v_new_user_id
    FROM public.catechists
    WHERE id = p_catechist_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Catechist not found or inactive' USING ERRCODE = '23503';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.branches
      WHERE leader_catechist_id = p_catechist_id
        AND id <> p_branch_id
    ) THEN
      RAISE EXCEPTION 'This catechist already leads another branch'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  UPDATE public.branches
  SET leader_catechist_id = p_catechist_id
  WHERE id = p_branch_id;

  IF p_catechist_id IS NOT NULL AND v_new_user_id IS NOT NULL THEN
    SELECT role INTO v_new_user_role
    FROM public.user_roles
    WHERE user_id = v_new_user_id;

    IF v_new_user_role IS NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_new_user_id, 'truong_nganh'::public.app_role);
    ELSIF v_new_user_role <> 'admin'::public.app_role THEN
      UPDATE public.user_roles
      SET role = 'truong_nganh'::public.app_role
      WHERE user_id = v_new_user_id;
    END IF;
  END IF;

  IF v_previous_leader IS NOT NULL AND v_previous_leader IS DISTINCT FROM p_catechist_id THEN
    SELECT user_id INTO v_previous_user_id
    FROM public.catechists
    WHERE id = v_previous_leader;

    IF v_previous_user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.branches
         WHERE leader_catechist_id = v_previous_leader
       ) THEN
      UPDATE public.user_roles
      SET role = 'glv'::public.app_role
      WHERE user_id = v_previous_user_id
        AND role = 'truong_nganh'::public.app_role;
    END IF;
  END IF;

  SELECT * INTO v_branch
  FROM public.branches
  WHERE id = p_branch_id;

  RETURN v_branch;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_branch_leader(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_branch_leader(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_leader_role_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role = 'truong_nganh'::public.app_role
     AND NEW.role NOT IN ('truong_nganh'::public.app_role, 'admin'::public.app_role)
     AND EXISTS (
       SELECT 1
       FROM public.branches b
       JOIN public.catechists c ON c.id = b.leader_catechist_id
       WHERE c.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Unassign this catechist from all branches before changing the role'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_active_branch_leader_role ON public.user_roles;
CREATE TRIGGER protect_active_branch_leader_role
  BEFORE UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_leader_role_demotion();
