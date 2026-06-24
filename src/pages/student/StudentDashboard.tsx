import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, ClipboardCheck, Star, GraduationCap, Loader2, Users, UserCheck, QrCode } from 'lucide-react';
import { StudentCheckIn } from '@/components/student/StudentCheckIn';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { StatCard } from '@/components/dashboard/StatCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Học viên';

  // Get student info with class details
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (
            name,
            schedule,
            academic_years:academic_year_id (name)
          )
        `)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get class overview stats
  const { data: classOverview } = useQuery({
    queryKey: ['class-overview', student?.class_id],
    queryFn: async () => {
      if (!student?.class_id) return null;

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          class_catechists (
            id,
            is_primary,
            catechists (
              id,
              name
            )
          ),
          students (count)
        `)
        .eq('id', student.class_id)
        .maybeSingle();

      if (classError) throw classError;

      const studentCount = classData?.students?.[0]?.count || 0;
      const catechists = classData?.class_catechists?.map((cc: any) => cc.catechists) || [];

      return {
        studentCount,
        catechists,
        catechistCount: catechists.length,
      };
    },
    enabled: !!student?.class_id,
  });


  // Get attendance stats
  const { data: attendanceStats } = useQuery({
    queryKey: ['student-attendance-stats', student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', student?.id);

      if (error) throw error;

      const total = data?.length || 0;
      const present = data?.filter(r => r.status === 'present').length || 0;
      const late = data?.filter(r => r.status === 'late').length || 0;
      
      return {
        total,
        present,
        late,
        absent: total - present - late,
        rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      };
    },
    enabled: !!student?.id,
  });

  // Get recent scores
  const { data: scores } = useQuery({
    queryKey: ['student-scores', student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', student?.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!student?.id,
  });

  if (studentLoading) {
    return (
      <MainLayout title="Trang chủ" subtitle="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout title="Trang chủ" subtitle="Học viên">
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Tài khoản chưa được liên kết</h3>
            <p className="text-muted-foreground">
              Tài khoản của bạn chưa được liên kết với hồ sơ học viên.
              Vui lòng liên hệ Giáo lý viên để được hỗ trợ.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const classInfo = student.classes as any;

  return (
    <MainLayout title={`Xin chào, ${displayName}`} subtitle="Trang chủ học viên">
      <div className="space-y-6">
        {/* Overview Stats */}
        {classInfo && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <StatCard 
              title="Lớp học" 
              value={classInfo.name || '-'} 
              subtitle={classInfo.academic_years?.name || 'Chưa có niên khóa'} 
              icon={GraduationCap} 
            />
            <StatCard 
              title="Học viên trong lớp" 
              value={classOverview?.studentCount || 0} 
              subtitle="Tổng số học viên" 
              icon={Users} 
            />
            <StatCard 
              title="Giáo lý viên" 
              value={classOverview?.catechistCount || 0} 
              subtitle="Đang phụ trách" 
              icon={UserCheck} 
            />
            <StatCard 
              title="Tỷ lệ điểm danh" 
              value={`${attendanceStats?.rate || 0}%`} 
              subtitle="Chuyên cần" 
              icon={ClipboardCheck} 
              variant="gold"
            />
          </div>
        )}

        {/* Student Info Card */}
        <Card variant="gold">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{student.name}</h2>
                {student.baptism_name && (
                  <p className="text-muted-foreground">Tên Thánh: {student.baptism_name}</p>
                )}
                {classInfo && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {classInfo.name}
                    </span>
                    {classInfo.academic_years && (
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {classInfo.academic_years.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in Card */}
        {student.class_id && (
          <StudentCheckIn studentId={student.id} classId={student.class_id} />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{attendanceStats?.rate || 0}%</p>
              <p className="text-xs text-muted-foreground">Tỷ lệ điểm danh</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{attendanceStats?.present || 0}</p>
              <p className="text-xs text-muted-foreground">Có mặt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{attendanceStats?.late || 0}</p>
              <p className="text-xs text-muted-foreground">Đi trễ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-2xl font-bold">{attendanceStats?.absent || 0}</p>
              <p className="text-xs text-muted-foreground">Vắng</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Điểm số gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scores && scores.length > 0 ? (
              <div className="space-y-3">
                {scores.map((score) => (
                  <div key={score.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">
                        {score.type === 'presentation' ? 'Trình bày' : 
                         score.type === 'semester1' ? 'Học kỳ 1' : 'Học kỳ 2'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(score.date), 'dd/MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {score.score}/{score.max_score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Chưa có điểm số
              </p>
            )}
          </CardContent>
        </Card>

        {/* Class Overview */}
        {classInfo && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Class Schedule */}
            {classInfo.schedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Lịch học
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{classInfo.schedule}</p>
                </CardContent>
              </Card>
            )}

            {/* Catechists */}
            {classOverview && classOverview.catechists.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Giáo lý viên phụ trách
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {classOverview.catechists.map((cat: any) => (
                      <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
