import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassSchedule {
  id: string;
  class_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  note: string | null;
  is_active: boolean;
  classes?: { name: string; academic_years?: { name: string } | null } | null;
}

export interface ParishEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

export interface ScheduleException {
  id: string;
  class_id: string;
  original_date: string;
  exception_type: 'cancelled' | 'rescheduled';
  new_date: string | null;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  classes?: { name: string } | null;
}

export function useClassSchedules() {
  return useQuery({
    queryKey: ['class-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules' as any)
        .select('id, class_id, weekday, start_time, end_time, note, is_active, classes(name, academic_years(name))')
        .eq('is_active', true)
        .order('weekday')
        .order('start_time');
      if (error) throw error;
      return (data || []) as ClassSchedule[];
    },
  });
}

export function useParishEvents() {
  return useQuery({
    queryKey: ['parish-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parish_events' as any)
        .select('id, title, description, event_date, start_time, end_time, location')
        .order('event_date')
        .order('start_time');
      if (error) throw error;
      return (data || []) as ParishEvent[];
    },
  });
}

export function useScheduleExceptions() {
  return useQuery({
    queryKey: ['schedule-exceptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schedule_exceptions' as any).select('id, class_id, original_date, exception_type, new_date, start_time, end_time, note, classes(name)').order('original_date');
      if (error) throw error;
      return (data || []) as ScheduleException[];
    },
  });
}

export function useCreateClassSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: Omit<ClassSchedule, 'id' | 'classes' | 'is_active'>) => {
      const { data, error } = await supabase.from('class_schedules' as any).insert(schedule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Đã thêm lịch sinh hoạt');
    },
    onError: (error: Error) => toast.error(error.message.includes('duplicate') ? 'Chi đoàn đã có lịch vào ngày này' : 'Không thể thêm lịch'),
  });
}

export function useCreateParishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: Omit<ParishEvent, 'id'>) => {
      const { data, error } = await supabase.from('parish_events' as any).insert(event).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parish-events'] });
      toast.success('Đã thêm sự kiện');
    },
    onError: () => toast.error('Không thể thêm sự kiện'),
  });
}

export function useCreateScheduleException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exception: Omit<ScheduleException, 'id' | 'classes'>) => {
      const { data, error } = await supabase.from('schedule_exceptions' as any).upsert(exception, { onConflict: 'class_id,original_date' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions'] });
      toast.success('Đã cập nhật ngoại lệ lịch');
    },
    onError: () => toast.error('Không thể cập nhật ngoại lệ lịch'),
  });
}
