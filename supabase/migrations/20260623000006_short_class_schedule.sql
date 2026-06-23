-- Update existing classes where schedule matches the old format or is empty
UPDATE public.classes
SET schedule = 'CN | 9:00 - 10:30'
WHERE schedule = '9:00 - 10:30 Chúa Nhật' OR schedule IS NULL OR schedule = '' OR schedule = 'Chưa xếp' OR schedule = 'Chưa xếp lịch';

-- Set new default value for new classes
ALTER TABLE public.classes
ALTER COLUMN schedule SET DEFAULT 'CN | 9:00 - 10:30';
