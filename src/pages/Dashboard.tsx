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
  Calendar, 
  Clock, 
  ChevronRight, 
  Loader2, 
  Database,
  BookOpen,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
      return classes.filter(c => c.branch_id === myBranch?.id);
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
      // Materials belonging to their branch or general
      return materials.filter(m => m.branch_id === myBranch?.id || !m.branch_id).length;
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

  const maxStudentCount = branchBreakdown.length > 0 
    ? Math.max(...branchBreakdown.map(b => b.studentCount), 1)
    : 1;

  return (
    <MainLayout 
      title="Tổng quan" 
      subtitle={
        userRole === 'truong_nganh' && myBranch
          ? `Chào mừng quay trở lại! Bạn đang quản lý Ngành ${myBranch.name}.`
          : "Chào mừng quay trở lại! Đây là tình hình hôm nay."
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Classes Overview (Danh sách chi đoàn) */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-sans">Danh sách chi đoàn</CardTitle>
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
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:shadow-custom-sm animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                          {cls.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{cls.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{cls.schedule || 'Chưa xếp lịch'}</span>
                            {cls.branches && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/30">
                                {cls.branches.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
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
                <Button variant="default" className="w-full justify-start" asChild>
                  <Link to="/attendance">
                    <Clock className="mr-2 h-4 w-4" />
                    Điểm danh hôm nay
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/students">
                    <Users className="mr-2 h-4 w-4" />
                    Xem danh sách đoàn viên
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
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

        {/* Branch distribution Breakdown (Chỉ hiện cho Admin) */}
        {userRole === 'admin' && branchBreakdown.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Phân bố đoàn viên theo Ngành</CardTitle>
              <CardDescription>Tình hình phân bổ nhân số và lớp học tại giáo xứ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {branchBreakdown.map((b) => (
                  <div key={b.id} className="space-y-2 rounded-lg border border-border p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{b.name}</p>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {b.classCount} chi đoàn
                      </span>
                    </div>
                    
                    {/* Progress Bar and counts */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Đoàn viên:</span>
                        <span className="font-bold text-foreground">{b.studentCount}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" 
                          style={{ width: `${(b.studentCount / maxStudentCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Schedule (Lịch sinh hoạt chi đoàn tuần này) */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Lịch sinh hoạt chi đoàn tuần này</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayClasses && displayClasses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {displayClasses.map(cls => (
                  <div key={cls.id} className="flex items-center gap-4 rounded-lg border border-border p-4 bg-card hover:shadow-custom-sm transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{cls.name}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-xs text-muted-foreground">{cls.schedule || 'Chưa xếp lịch'}</p>
                        {cls.branches && (
                          <p className="text-[10px] text-accent font-semibold">{cls.branches.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Chưa có lịch sinh hoạt nào được xếp
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}