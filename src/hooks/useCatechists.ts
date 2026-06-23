import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateGLVParams {
  name: string;
  email: string;
  phone?: string;
  password: string;
  baptism_name?: string;
  address?: string;
}

export interface Catechist {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  baptism_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: string;
  class_catechists?: {
    id: string;
    is_primary: boolean;
    classes: {
      id: string;
      name: string;
      academic_year_id: string;
    };
  }[];
}

export function useCatechists() {
  return useQuery({
    queryKey: ['catechists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catechists')
        .select(`
          *,
          class_catechists (
            id,
            is_primary,
            classes (
              id,
              name,
              academic_year_id
            )
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []) as Catechist[];
    },
  });
}

export function useCatechist(id: string) {
  return useQuery({
    queryKey: ['catechist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catechists')
        .select(`
          *,
          class_catechists (
            id,
            is_primary,
            classes (
              id,
              name,
              academic_year_id
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as Catechist | null;
    },
    enabled: !!id,
  });
}

export function useCreateCatechist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateGLVParams) => {
      // Call edge function to create auth user
      const { data, error } = await supabase.functions.invoke('create-glv-account', {
        body: params
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catechists'] });
      toast.success('Thêm giáo lý viên thành công!');
    },
    onError: (error) => {
      toast.error('Không thể thêm giáo lý viên: ' + error.message);
    },
  });
}

export function useUpdateCatechist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, ...updates }: Partial<Catechist> & { user_id: string }) => {
      const { error } = await supabase
        .from('catechists')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          address: updates.address,
          baptism_name: updates.baptism_name,
        })
        .eq('user_id', user_id);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catechists'] });
      toast.success('Đã cập nhật giáo lý viên thành công');
    },
    onError: (error) => {
      console.error('Error updating catechist:', error);
      toast.error('Không thể cập nhật giáo lý viên');
    },
  });
}

export function useDeleteCatechist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase
        .from('catechists')
        .update({ is_active: false })
        .eq('user_id', user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catechists'] });
      toast.success('Đã xóa giáo lý viên thành công');
    },
    onError: (error) => {
      console.error('Error deleting catechist:', error);
      toast.error('Không thể xóa giáo lý viên');
    },
  });
}
