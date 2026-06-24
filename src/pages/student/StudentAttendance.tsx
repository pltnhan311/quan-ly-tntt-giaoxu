import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardCheck, Check, X, Clock, Loader2, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StudentAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checkInCode, setCheckInCode] = useState('');
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  // Get student info
  const { data: student } = useQuery({
    queryKey: ['student-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id, name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get attendance records
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['student-attendance', student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', student?.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!student?.id,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!student?.id || !student?.class_id) {
        throw new Error('Thông tin học viên không hợp lệ');
      }

      // First verify the code and session
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', student.class_id)
        .eq('check_in_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('Mã điểm danh không hợp lệ hoặc đã hết hạn');
      }

      // Check if already checked in today
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', student.id)
        .eq('class_id', student.class_id)
        .eq('date', session.date)
        .maybeSingle();

      if (existing) {
        throw new Error('Bạn đã điểm danh ngày hôm nay rồi');
      }

      // Create attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          student_id: student.id,
          class_id: student.class_id,
          date: session.date,
          status: 'present',
          recorded_by: user?.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      toast.success('Điểm danh thành công!');
      setShowCheckInDialog(false);
      setCheckInCode('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCheckIn = () => {
    if (!checkInCode.trim()) {
      toast.error('Vui lòng nhập mã điểm danh');
      return;
    }
    checkInMutation.mutate(checkInCode.trim());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />Có mặt</Badge>;
      case 'absent':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Vắng</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Trễ</Badge>;
      case 'excused':
        return <Badge variant="secondary">Có phép</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: attendanceRecords?.length || 0,
    present: attendanceRecords?.filter(r => r.status === 'present' || r.status === 'late').length || 0,
    excused: attendanceRecords?.filter(r => r.status === 'excused').length || 0,
    absent: attendanceRecords?.filter(r => r.status === 'absent').length || 0,
  };

  if (!student?.class_id) {
    return (
      <MainLayout title="Điểm danh" subtitle="Lịch sử điểm danh">
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có lớp học</h3>
            <p className="text-muted-foreground">
              Bạn chưa được phân vào lớp học nào.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Điểm danh" subtitle="Lịch sử điểm danh của bạn">
      <div className="space-y-6">
        {/* Check-in Button */}
        <Card variant="gold">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Điểm danh hôm nay</h3>
                <p className="text-sm text-muted-foreground">
                  Nhập mã điểm danh từ Giáo lý viên để xác nhận có mặt
                </p>
              </div>
              <Button variant="gold" onClick={() => setShowCheckInDialog(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                Nhập mã điểm danh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng buổi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Có mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Vắng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.excused}</p>
              <p className="text-xs text-muted-foreground">Có phép</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử điểm danh</CardTitle>
            <CardDescription>Danh sách các buổi học đã điểm danh</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : attendanceRecords && attendanceRecords.length > 0 ? (
              <div className="space-y-2">
                {attendanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                      </p>
                      {record.note && (
                        <p className="text-xs text-muted-foreground">{record.note}</p>
                      )}
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Chưa có dữ liệu điểm danh
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check-in Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập mã điểm danh</DialogTitle>
            <DialogDescription>
              Nhập mã 6 số từ Giáo lý viên để điểm danh
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nhập mã 6 số..."
              value={checkInCode}
              onChange={(e) => setCheckInCode(e.target.value)}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleCheckIn} 
              disabled={checkInMutation.isPending || checkInCode.length < 6}
            >
              {checkInMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Điểm danh'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
