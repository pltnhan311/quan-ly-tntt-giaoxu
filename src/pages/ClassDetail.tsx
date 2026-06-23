import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClass, useAssignCatechist, useRemoveCatechist } from '@/hooks/useClasses';
import { useStudents } from '@/hooks/useStudents';
import { useCatechists } from '@/hooks/useCatechists';
import { ArrowLeft, Users, Clock, UserCheck, Plus, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const { data: classInfo, isLoading: classLoading } = useClass(id || '');
  const { data: allStudents, isLoading: studentsLoading } = useStudents(id);
  const { data: allCatechists } = useCatechists();
  const assignCatechist = useAssignCatechist();
  const removeCatechist = useRemoveCatechist();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedGlv, setSelectedGlv] = useState<string>('');

  const classStudents = allStudents || [];
  const assignedCatechists = classInfo?.class_catechists?.map(cc => cc.catechists) || [];
  const availableCatechists = allCatechists?.filter(cat => {
    // 1. Check if already assigned to this class
    const isAssignedToThisClass = assignedCatechists.some(ac => ac.id === cat.id);
    if (isAssignedToThisClass) return false;

    // 2. Check if already assigned to ANY class in the current academic year
    const isAssignedInCurrentYear = cat.class_catechists?.some(cc => 
      cc.classes?.academic_year_id === classInfo?.academic_year_id
    );

    return !isAssignedInCurrentYear;
  }) || [];

  if (classLoading || studentsLoading) {
    return (
      <MainLayout title="Đang tải..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!classInfo) {
    return (
      <MainLayout title="Không tìm thấy" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lớp học không tồn tại</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/classes')}>
            Quay lại danh sách
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleAssignGlv = () => {
    if (!selectedGlv) {
      toast.error('Vui lòng chọn GLV');
      return;
    }

    assignCatechist.mutate(
      { classId: id!, catechistId: selectedGlv },
      {
        onSuccess: () => {
          setSelectedGlv('');
          setIsAssignOpen(false);
        }
      }
    );
  };

  const handleRemoveGlv = (catechistId: string) => {
    removeCatechist.mutate({ classId: id!, catechistId });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <MainLayout 
      title={classInfo.name} 
      subtitle={`Niên khóa ${classInfo.academic_years?.name || ''}`}
    >
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách lớp
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Học viên</p>
                <p className="text-2xl font-bold">{classStudents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <UserCheck className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GLV phụ trách</p>
                <p className="text-2xl font-bold">{assignedCatechists.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lịch học</p>
                <p className="text-sm font-medium">{classInfo.schedule || '9:00 - 10:30 Chúa Nhật'}</p>
              </div>
            </CardContent>
          </Card>
          <Card variant="gold">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chuyên cần TB</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Students List */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Danh sách học viên</CardTitle>
                  <CardDescription>{classStudents.length} học viên</CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <Link to={`/students?classId=${id}`}>
                    Xem tất cả
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {classStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Tên Thánh</TableHead>
                      <TableHead>Ngày sinh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classStudents.slice(0, 5).map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.baptism_name || '-'}</TableCell>
                        <TableCell>{formatDate(student.birth_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có học viên trong lớp này
                </p>
              )}
            </CardContent>
          </Card>

          {/* Catechists */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Giáo lý viên</CardTitle>
                {userRole === 'admin' && (
                  <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogTrigger asChild>
                      <Button variant="gold" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Gán GLV
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gán Giáo lý viên</DialogTitle>
                        <DialogDescription>
                          Chọn GLV để phụ trách lớp {classInfo.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Select value={selectedGlv} onValueChange={setSelectedGlv}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn GLV" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCatechists.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                          Hủy
                        </Button>
                        <Button onClick={handleAssignGlv} disabled={assignCatechist.isPending}>
                          {assignCatechist.isPending ? 'Đang gán...' : 'Gán vào lớp'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedCatechists.length > 0 ? (
                  assignedCatechists.map(cat => (
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 font-medium text-accent">
                          {cat.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{cat.name}</p>
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveGlv(cat.id)}
                          disabled={removeCatechist.isPending}
                        >
                          Gỡ
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Chưa có GLV phụ trách
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card variant="flat" className="border">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to={`/attendance?classId=${id}`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Điểm danh
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/scores?classId=${id}`}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Xem điểm
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/materials?classId=${id}`}>
                  Tài liệu
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
