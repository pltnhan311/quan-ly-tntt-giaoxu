import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2, CheckCircle2, Church } from 'lucide-react';
import { toast } from 'sonner';
import { format, isSunday, previousSunday, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StudentCheckInProps {
  studentId: string;
  classId: string;
}

export function StudentCheckIn({ studentId, classId }: StudentCheckInProps) {
  const { user } = useAuth();

  // Helper to get the nearest past Sunday (or today if it's Sunday)
  const getNearestSunday = () => {
    const today = startOfDay(new Date());
    if (isSunday(today)) {
      return format(today, 'yyyy-MM-dd');
    }
    return format(previousSunday(today), 'yyyy-MM-dd');
  };

  const [selectedDate, setSelectedDate] = useState<string>(getNearestSunday());
  const [catechismAttended, setCatechismAttended] = useState(false);
  const [massAttended, setMassAttended] = useState(false);

  // Get attendance records for selected date
  const { data: attendanceRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['student-attendance', studentId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', selectedDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId && !!selectedDate,
  });

  // Get mass attendance for selected date
  const { data: massAttendance } = useQuery({
    queryKey: ['student-mass-attendance', studentId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mass_attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', selectedDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!selectedDate,
  });

  // Check if GLV already recorded attendance
  const glvRecord = attendanceRecords?.find(r => r.note === 'GLV' || r.recorded_by !== user?.id);
  const hasGlvRecord = !!glvRecord;

  // Save catechism attendance
  const saveCatechismMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) {
        throw new Error('Vui lòng chọn ngày');
      }

      // Delete existing record for this date if exists
      await supabase
        .from('attendance_records')
        .delete()
        .eq('student_id', studentId)
        .eq('date', selectedDate)
        .eq('class_id', classId);

      if (catechismAttended) {
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            student_id: studentId,
            class_id: classId,
            date: selectedDate,
            status: 'present',
            recorded_by: user?.id,
            note: 'Học viên tự điểm danh',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Đã lưu điểm danh Giáo lý!');
      refetchRecords();
    },
    onError: (error) => {
      console.error('Error saving catechism:', error);
      toast.error('Không thể lưu điểm danh');
    },
  });

  // Save mass attendance
  const saveMassMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) {
        throw new Error('Vui lòng chọn ngày');
      }

      // Delete existing record for this date if exists
      await supabase
        .from('mass_attendance')
        .delete()
        .eq('student_id', studentId)
        .eq('date', selectedDate);

      if (massAttended) {
        const { error } = await supabase
          .from('mass_attendance')
          .insert({
            student_id: studentId,
            date: selectedDate,
            attended: true,
            recorded_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Đã lưu điểm danh Thánh lễ!');
      refetchRecords();
    },
    onError: (error) => {
      console.error('Error saving mass:', error);
      toast.error('Không thể lưu điểm danh');
    },
  });

  // Initialize checkboxes when records load
  useEffect(() => {
    if (attendanceRecords) {
      const selfRecord = attendanceRecords.find(r => r.recorded_by === user?.id && r.note === 'Học viên tự điểm danh');
      setCatechismAttended(!!selfRecord);
    }
    if (massAttendance) {
      const selfMassRecord = massAttendance.recorded_by === user?.id;
      setMassAttended(massAttendance.attended && selfMassRecord);
    }
  }, [attendanceRecords, massAttendance, user?.id]);

  const handleSave = () => {
    saveCatechismMutation.mutate();
    saveMassMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd/MM/yyyy', { locale: vi });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isSunday(date)) {
      toast.error('Chỉ được phép điểm danh vào ngày Chủ Nhật');
      // Reset to nearest Sunday if they try to pick another day
      setSelectedDate(getNearestSunday());
      return;
    }
    setSelectedDate(e.target.value);
    // Reset checkboxes when date changes
    setCatechismAttended(false);
    setMassAttended(false);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Điểm danh
        </CardTitle>
        <CardDescription>
          Tự điểm danh bằng cách tick vào các ô tương ứng
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="attendance-date">Chọn ngày (Chủ Nhật) *</Label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {selectedDate && formatDate(selectedDate)}
            </p>
          </div>

          {/* GLV Record Warning */}
          {hasGlvRecord && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ Giáo lý viên đã điểm danh cho bạn vào ngày này. Bạn vẫn có thể tự điểm danh để cập nhật.
              </p>
            </div>
          )}

          {/* Catechism Attendance */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="catechism"
                checked={catechismAttended}
                onCheckedChange={(checked) => setCatechismAttended(checked === true)}
                disabled={saveCatechismMutation.isPending}
              />
              <Label htmlFor="catechism" className="text-sm font-medium cursor-pointer">
                Có đi học Giáo lý
              </Label>
            </div>
            {glvRecord && (
              <div className="ml-6 text-xs text-muted-foreground">
                GLV đã ghi nhận: {glvRecord.status === 'present' || glvRecord.status === 'late' ? 'Có mặt' : glvRecord.status === 'excused' ? 'Có phép' : 'Vắng'}
              </div>
            )}
          </div>

          {/* Mass Attendance */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mass"
                checked={massAttended}
                onCheckedChange={(checked) => setMassAttended(checked === true)}
                disabled={saveMassMutation.isPending}
              />
              <Label htmlFor="mass" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Church className="h-4 w-4" />
                Có đi Thánh lễ
              </Label>
            </div>
            {massAttendance && massAttendance.recorded_by !== user?.id && (
              <div className="ml-6 text-xs text-muted-foreground">
                GLV đã ghi nhận: {massAttendance.attended ? 'Có tham dự' : 'Không tham dự'}
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full"
            variant="gold"
            disabled={saveCatechismMutation.isPending || saveMassMutation.isPending || !selectedDate}
          >
            {(saveCatechismMutation.isPending || saveMassMutation.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu điểm danh'
            )}
          </Button>

          {/* Current Status */}
          {(attendanceRecords && attendanceRecords.length > 0) || massAttendance ? (
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Trạng thái hiện tại:</p>
              {attendanceRecords?.map((record) => (
                <div key={record.id} className="text-xs">
                  <span className="font-medium">Giáo lý:</span>{' '}
                  {record.status === 'present' || record.status === 'late' ? 'Có mặt' : record.status === 'excused' ? 'Có phép' : 'Vắng'}
                  {record.note === 'GLV' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                      GLV
                    </span>
                  )}
                </div>
              ))}
              {massAttendance && (
                <div className="text-xs">
                  <span className="font-medium">Thánh lễ:</span>{' '}
                  {massAttendance.attended ? 'Có tham dự' : 'Không tham dự'}
                  {massAttendance.recorded_by !== user?.id && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                      GLV
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
