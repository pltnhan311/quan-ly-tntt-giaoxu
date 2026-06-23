-- Update existing classes where schedule is not set
UPDATE public.classes
SET schedule = '9:00 - 10:30 Chúa Nhật'
WHERE schedule IS NULL OR schedule = '' OR schedule = 'Chưa xếp' OR schedule = 'Chưa xếp lịch';

-- Set default value for new classes
ALTER TABLE public.classes
ALTER COLUMN schedule SET DEFAULT '9:00 - 10:30 Chúa Nhật';
