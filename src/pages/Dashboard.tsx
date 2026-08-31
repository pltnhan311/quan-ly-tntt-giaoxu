import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClasses } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { useCatechists } from '@/hooks/useCatechists';
import { useActiveAcademicYear } from '@/hooks/useAcademicYears';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches, useMyBranch } from '@/hooks/useBranches';
import { useLearningMaterials } from '@/hooks/useLearningMaterials';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Loader2, 
  Database,
  BookOpen,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { addDays, format, isWithinInterval, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useClassSchedules, useParishEvents } from '@/hooks/useSchedule';

const BRANCH_ORDER: Record<string, number> = {
  'Chiên Con': 1,
  'Ấu Nhi': 2,
  'Thiếu Nhi': 3,
  'Nghĩa Sĩ': 4,
  'Hiệp Sĩ': 5,
  'Dự Trưởng': 6,
};

function getClassInitials(name: string): string {
  // Bỏ tiền tố "Chi đoàn" không phân biệt hoa thường
  let cleanName = name.replace(/^(chi\s+đoàn\s+)/i, '').trim();
  if (!cleanName) return 'CD';

  // Tách theo các ký tự phân cách như gạch ngang - hoặc –
  const parts = cleanName.split(/[-–]/);
  if (parts.length >= 2) {
    const part1 = parts[0].trim().split(/\s+/).filter(Boolean);
    const part2 = parts[1].trim().split(/\s+/).filter(Boolean);
    
    // Lấy chữ cái đầu của từ đầu tiên ở phần 1 và phần 2
    const char1 = part1[0]?.charAt(0) || '';
    const char2 = part2[0]?.charAt(0) || '';
    return (char1 + char2).toUpperCase();
  }

  // Nếu không có dấu phân cách, lấy chữ cái đầu của 2 từ đầu tiên
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  return cleanName.substring(0, 2).toUpperCase();
}

export default function Dashboard() {
  const { user, userRole } = useAuth();

  // Hooks for fetching data
  const { data: activeYear, isLoading: yearLoading } = useActiveAcademicYear();
  const { data: classes, isLoading: classesLoading } = useClasses(activeYear?.id);
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: catechists, isLoading: catechistsLoading } = useCatechists();
  const { data: branches, isLoading: branchesLoading } = useBranches(activeYear?.id);
  const { data: myBranch, isLoading: myBranchLoading } = useMyBranch();
  const { data: materials, isLoading: materialsLoading } = useLearningMaterials();
  const { data: classSchedules } = useClassSchedules();
  const { data: parishEvents } = useParishEvents();

  const isLoading = 
    classesLoading || 
    studentsLoading || 
    catechistsLoading || 
    yearLoading || 
    branchesLoading || 
    myBranchLoading || 
    materialsLoading;

  // ----------------------------------------------------
  // Compute role-based statistics
  // ----------------------------------------------------
  
  // Find current user's catechist record
  const currentCatechist = catechists?.find(c => c.user_id === user?.id);

  // Scoped Classes (Chi đoàn):
  const displayClasses = (() => {
    if (isLoading || !classes) return [];
    if (userRole === 'admin') return classes;
    if (userRole === 'truong_nganh') {
      return classes.filter(c => 
        c.branch_id === myBranch?.id || 
        c.class_catechists?.some(cc => cc.catechists?.id === currentCatechist?.id)
      );
    }
    if (userRole === 'glv') {
      return classes.filter(cls => 
        cls.class_catechists?.some(cc => cc.catechists?.id === currentCatechist?.id)
      );
    }
    return classes;
  })();

  // Scoped Students (Đoàn viên) count
  const totalStudents = (() => {
    if (isLoading || !students) return 0;
    if (userRole === 'admin') return students.length;
    if (userRole === 'truong_nganh') {
      // Students in classes belonging to this branch
      const branchClassIds = new Set(displayClasses.map(c => c.id));
      return students.filter(s => s.class_id && branchClassIds.has(s.class_id)).length;
    }
    if (userRole === 'glv') {
      // Students in classes taught by this GLV
      const glvClassIds = new Set(displayClasses.map(c => c.id));
      return students.filter(s => s.class_id && glvClassIds.has(s.class_id)).length;
    }
    return students.length;
  })();

  // Scoped Catechists count
  const totalCatechists = (() => {
    if (isLoading || !catechists) return 0;
    if (userRole === 'admin') return catechists.length;
    if (userRole === 'truong_nganh') {
      // Unique catechists assigned to classes in this branch
      const branchCatechistIds = new Set<string>();
      displayClasses.forEach(cls => {
        cls.class_catechists?.forEach(cc => {
          if (cc.catechists?.id) branchCatechistIds.add(cc.catechists.id);
        });
      });
      return branchCatechistIds.size;
    }
    if (userRole === 'glv') {
      // Unique catechists assigned to the same classes
      const glvClassIds = new Set(displayClasses.map(c => c.id));
      const coCatechistIds = new Set<string>();
      classes?.forEach(cls => {
        if (glvClassIds.has(cls.id)) {
          cls.class_catechists?.forEach(cc => {
            if (cc.catechists?.id) coCatechistIds.add(cc.catechists.id);
          });
        }
      });
      return coCatechistIds.size;
    }
    return catechists.length;
  })();

  // Scoped Materials count
  const totalMaterials = (() => {
    if (isLoading || !materials) return 0;
    if (userRole === 'admin') return materials.length;
    if (userRole === 'truong_nganh') {
      // Materials belonging to their branch, general, or classes they teach
      const glvClassIds = new Set(
        classes?.filter(c => c.class_catechists?.some(cc => cc.catechists?.id === currentCatechist?.id))
          .map(c => c.id) || []
      );
      return materials.filter(m => 
        m.branch_id === myBranch?.id || 
        !m.branch_id || 
        (m.class_id && glvClassIds.has(m.class_id))
      ).length;
    }
    if (userRole === 'glv') {
      // Materials belonging to their classes, branch, or general
      const glvClassIds = new Set(displayClasses.map(c => c.id));
      const glvBranchIds = new Set(displayClasses.map(c => c.branch_id).filter(Boolean) as string[]);
      return materials.filter(m => 
        (m.class_id && glvClassIds.has(m.class_id)) || 
        (m.branch_id && glvBranchIds.has(m.branch_id)) || 
        (!m.class_id && !m.branch_id)
      ).length;
    }
    return materials.length;
  })();

  // ----------------------------------------------------
  // Scoped Stat Cards Props
  // ----------------------------------------------------
  const getCardProps = () => {
    const defaultSubtitle = activeYear?.name || 'Chưa có niên khóa';
    if (userRole === 'admin') {
      return [
        { title: 'Tổng đoàn viên', value: totalStudents, subtitle: defaultSubtitle, icon: Users, variant: 'default' as const },
        { title: 'Số chi đoàn', value: displayClasses.length, subtitle: 'Đang hoạt động', icon: GraduationCap, variant: 'gold' as const },
        { title: 'Giáo lý viên', value: totalCatechists, subtitle: 'Đang phụ trách', icon: UserCheck, variant: 'default' as const },
        { title: 'Tổng số ngành', value: branches?.length || 6, subtitle: 'Cơ cấu phân ban', icon: Layers, variant: 'primary' as const },
      ];
    }
    if (userRole === 'truong_nganh') {
      return [
        { title: 'Đoàn viên trong ngành', value: totalStudents, subtitle: myBranch?.name || defaultSubtitle, icon: Users, variant: 'default' as const },
        { title: 'Chi đoàn trong ngành', value: displayClasses.length, subtitle: myBranch?.name || 'Đang hoạt động', icon: GraduationCap, variant: 'gold' as const },
        { title: 'GLV trong ngành', value: totalCatechists, subtitle: 'Đang phụ trách', icon: UserCheck, variant: 'default' as const },
        { title: 'Tài liệu học tập', value: totalMaterials, subtitle: 'Ngành + Chung', icon: BookOpen, variant: 'primary' as const },
      ];
    }
    // GLV
    return [
      { title: 'Đoàn viên phụ trách', value: totalStudents, subtitle: 'Thuộc chi đoàn phụ trách', icon: Users, variant: 'default' as const },
      { title: 'Chi đoàn phụ trách', value: displayClasses.length, subtitle: defaultSubtitle, icon: GraduationCap, variant: 'gold' as const },
      { title: 'GLV cộng tác', value: totalCatechists, subtitle: 'Đồng phụ trách chi đoàn', icon: UserCheck, variant: 'default' as const },
      { title: 'Tài liệu lớp học', value: totalMaterials, subtitle: 'Lớp + Ngành + Chung', icon: BookOpen, variant: 'primary' as const },
    ];
  };

  const statCards = getCardProps();

  // ----------------------------------------------------
  // Branch distribution for Admin
  // ----------------------------------------------------
  const branchBreakdown = (() => {
    if (userRole !== 'admin' || isLoading || !branches || !classes || !students) return [];
    return branches.map(branch => {
      const branchClasses = classes.filter(c => c.branch_id === branch.id);
      const studentCount = students.filter(s => 
        s.class_id && branchClasses.some(c => c.id === s.class_id)
      ).length;
      return {
        id: branch.id,
        name: branch.name,
        classCount: branchClasses.length,
        studentCount
      };
    });
  })();

  const upcomingSchedule = (() => {
    const today = startOfDay(new Date());
    const end = addDays(today, 7);
    const items = (classSchedules || []).flatMap(schedule => {
      const dates = Array.from({ length: 8 }, (_, index) => addDays(today, index));
      return dates.filter(date => date.getDay() === schedule.weekday).map(date => ({
        id: `${schedule.id}-${date.toISOString()}`,
        date,
        title: schedule.classes?.name || 'Chi đoàn',
        time: `${schedule.start_time.slice(0, 5)} – ${schedule.end_time.slice(0, 5)}`,
      }));
    });
    const events = (parishEvents || [])
      .filter(event => isWithinInterval(new Date(`${event.event_date}T00:00:00`), { start: today, end }))
      .map(event => ({ id: event.id, date: new Date(`${event.event_date}T00:00:00`), title: event.title, time: event.start_time?.slice(0, 5) || 'Cả ngày' }));
    return [...items, ...events].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  })();

  return (
    <MainLayout 
      title="Tổng quan" 
      subtitle={
        userRole === 'truong_nganh' && myBranch
          ? `Chào mừng quay trở lại! Bạn đang quản lý Ngành ${myBranch.name}.`
          : "Chào mừng quay trở lại! Đây là tình hình hôm nay."
      }
    >
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-3xl gradient-hero px-6 py-7 text-[hsl(var(--hero-foreground))] shadow-custom-lg sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[24px] border-gold/15" aria-hidden="true" />
          <div className="absolute -bottom-28 right-24 h-48 w-48 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">Bảng điều hành</p>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Một tuần sinh hoạt thật tốt nhé{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--hero-foreground)/0.82)]">Quản lý lớp học, đoàn viên và lịch sinh hoạt tiện lợi, nhanh chóng.</p>
            </div>
            <Button variant="gold" className="w-fit shrink-0 shadow-gold" asChild>
              <Link to="/attendance">
                <Clock className="mr-2 h-4 w-4" />
                Điểm danh hôm nay
              </Link>
            </Button>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, idx) => (
            <StatCard 
              key={idx}
              title={card.title} 
              value={isLoading ? '-' : card.value} 
              subtitle={card.subtitle} 
              icon={card.icon}
              variant={card.variant}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
          
          {/* Classes Overview (Danh sách chi đoàn) */}
          <Card variant="elevated" className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading">Danh sách chi đoàn</CardTitle>
                <CardDescription>
                  {userRole === 'admin' 
                    ? "Các chi đoàn trong niên khóa hiện tại" 
                    : userRole === 'truong_nganh' 
                    ? `Các chi đoàn thuộc Ngành ${myBranch?.name || ''}` 
                    : "Các chi đoàn bạn đang phụ trách"
                  }
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/classes">
                  Xem tất cả
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayClasses && displayClasses.length > 0 ? (
                <div className="space-y-4">
                  {displayClasses.slice(0, 5).map((cls, index) => (
                    <div 
                      key={cls.id} 
                      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-custom-sm animate-fade-in sm:flex-row sm:items-center sm:justify-between"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                          {getClassInitials(cls.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{cls.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{cls.schedule || 'CN | 9:00 - 10:30'}</span>
                            {cls.branches && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/30">
                                {cls.branches.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {cls.students?.[0]?.count || 0} đoàn viên
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cls.class_catechists?.map(cc => cc.catechists?.name?.split(' ').pop()).join(', ') || 'Chưa gán GLV'}
                          </p>
                        </div>
                        <Badge variant="success">Đang học</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Chưa có chi đoàn nào</p>
                  {userRole === 'admin' && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/classes">Tạo chi đoàn đầu tiên</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Setup Guide */}
          <div className="space-y-6">
            
            {/* Quick Actions (Thao tác nhanh) */}
            <Card variant="gold">
              <CardHeader>
                <CardTitle className="text-lg">Thao tác nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="default" className="h-11 w-full justify-start" asChild>
                  <Link to="/attendance">
                    <Clock className="mr-2 h-4 w-4" />
                    Điểm danh hôm nay
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 w-full justify-start" asChild>
                  <Link to="/students">
                    <Users className="mr-2 h-4 w-4" />
                    Xem danh sách đoàn viên
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 w-full justify-start" asChild>
                  <Link to="/scores">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Nhập điểm
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Getting Started Guide (Chỉ hiện cho Admin) */}
            {userRole === 'admin' && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Bắt đầu</CardTitle>
                  <CardDescription>Các bước thiết lập hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${activeYear ? 'bg-success' : 'bg-muted'}`} />
                    <span className={`text-sm ${activeYear ? 'text-foreground' : 'text-muted-foreground'}`}>
                      1. Tạo niên khóa (Tự động tạo 6 ngành)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${classes && classes.length > 0 ? 'bg-success' : 'bg-muted'}`} />
                    <span className={`text-sm ${classes && classes.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      2. Tạo chi đoàn & gán ngành
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${catechists && catechists.length > 0 ? 'bg-success' : 'bg-muted'}`} />
                    <span className={`text-sm ${catechists && catechists.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      3. Thêm giáo lý viên
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${students && students.length > 0 ? 'bg-success' : 'bg-muted'}`} />
                    <span className={`text-sm ${students && students.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      4. Thêm đoàn viên vào chi đoàn
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Lịch sắp tới</CardTitle><CardDescription>Trong 7 ngày tới</CardDescription></div>
            <Button variant="outline" size="sm" asChild><Link to="/schedule">Xem lịch<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {upcomingSchedule.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{upcomingSchedule.map(item => <div key={item.id} className="rounded-xl border border-border/80 bg-background/60 p-3"><p className="text-xs font-medium text-accent">{format(item.date, 'EEE, dd/MM', { locale: vi })}</p><p className="mt-1 truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.time}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Chưa có lịch sắp tới.</p>}
          </CardContent>
        </Card>

        {/* Branch distribution Breakdown (Chỉ hiện cho Admin) */}
        {userRole === 'admin' && branchBreakdown.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Phân bổ theo ngành</CardTitle>
              <CardDescription>Số chi đoàn và đoàn viên trong từng ngành</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...branchBreakdown]
                  .sort((a, b) => (BRANCH_ORDER[a.name] ?? 99) - (BRANCH_ORDER[b.name] ?? 99))
                  .map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/70 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${b.studentCount > 0 ? 'bg-success' : 'bg-muted-foreground/30'}`} aria-hidden="true" />
                        <p className="truncate font-semibold text-foreground">{b.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold tabular-nums text-foreground">{b.studentCount}</p>
                        <p className="text-[11px] text-muted-foreground">{b.classCount} chi đoàn</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  );
}
