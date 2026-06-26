-- Add presentation2 to score_type enum
ALTER TYPE public.score_type ADD VALUE 'presentation2';

-- Clean up any existing duplicate scores for safety before adding unique constraint
DELETE FROM public.scores a USING public.scores b
WHERE a.id < b.id 
  AND a.student_id = b.student_id 
  AND a.class_id = b.class_id 
  AND a.type = b.type;

-- Add unique constraint to scores table to allow upserting
ALTER TABLE public.scores ADD CONSTRAINT scores_student_id_class_id_type_key UNIQUE (student_id, class_id, type);
