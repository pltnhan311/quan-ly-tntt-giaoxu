import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudents, useCreateStudent, useUpdateStudent, Student } from '@/hooks/useStudents';
import { supabase } from '@/integrations/supabase/client';
import { useClasses } from '@/hooks/useClasses';
import { useCatechists } from '@/hooks/useCatechists';
import { useMyBranch } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, Pencil, User, Phone, MapPin, Calendar, Loader2, Database, Upload, Download, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { ImportStudentsDialog } from '@/components/students/ImportStudentsDialog';
import { generateStudentCSV, downloadCSV, StudentImportData } from '@/utils/csvUtils';

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classParam = searchParams.get('classId') || '';

  const [selectedClass, setSelectedClass] = useState<string>(classParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { user, userRole } = useAuth();
  const { data: students, isLoading } = useStudents(selectedClass || undefined);
  const { data: classes } = useClasses();
  const { data: catechists } = useCatechists();
  const { data: myBranch } = useMyBranch();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const canManageClass = (() => {
    if (userRole === 'admin') return true;

    // Check if user is a teacher of this class (both GLV and Trưởng Ngành can teach)
    const currentCatechist = catechists?.find(c => c.user_id === user?.id);
    const targetClass = classes?.find(c => c.id === selectedClass);

    const isAssignedTeacher = !!(
      currentCatechist &&
      targetClass &&
      targetClass.class_catechists?.some(cc => cc.catechists?.id === currentCatechist.id)
    );

    if (isAssignedTeacher) return true;

    // Trưởng Ngành can manage classes in their led branch
    if (userRole === 'truong_nganh' && targetClass && myBranch) {
      return targetClass.branch_id === myBranch.id;
    }

    return false;
  })();

  const [newStudent, setNewStudent] = useState({
    name: '',
    birth_date: '',
    gender: 'male' as 'male' | 'female',
    class_id: '',
    baptism_name: '',
    phone: '',
    parent_phone: '',
    address: ''
  });

  const filteredStudents = (students || []).filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (student.baptism_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreateStudent = async () => {
    if (!newStudent.name || !newStudent.birth_date || !newStudent.class_id) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    createStudent.mutate({
      name: newStudent.name,
      birth_date: newStudent.birth_date,
      gender: newStudent.gender,
      class_id: newStudent.class_id,
      baptism_name: newStudent.baptism_name || null,
      phone: newStudent.phone || null,
      parent_phone: newStudent.parent_phone || null,
      address: newStudent.address || null,
      enrollment_date: new Date().toISOString().split('T')[0],
      is_active: true,
      avatar_url: null,
    }, {
      onSuccess: () => {
        toast.success('Đã thêm đoàn viên thành công');
        setNewStudent({
          name: '',
          birth_date: '',
          gender: 'male',
          class_id: '',
          baptism_name: '',
          phone: '',
          parent_phone: '',
          address: ''
        });
        setIsDialogOpen(false);
      }
    });
  };

  const handleUpdateStudent = () => {
    if (!editingStudent) return;

    updateStudent.mutate({
      id: editingStudent.id,
      name: editingStudent.name,
      birth_date: editingStudent.birth_date,
      gender: editingStudent.gender,
      class_id: editingStudent.class_id,
      baptism_name: editingStudent.baptism_name,
      phone: editingStudent.phone,
      parent_phone: editingStudent.parent_phone,
      address: editingStudent.address,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingStudent(null);
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Import students from CSV
  const handleImportStudents = async (importData: Array<StudentImportData & { class_id: string }>) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const studentData of importData) {
      try {
        const { error } = await supabase
          .from('students')
          .insert({
            name: studentData.name,
            birth_date: studentData.birth_date,
            gender: studentData.gender,
            class_id: studentData.class_id,
            baptism_name: studentData.baptism_name || null,
            address: studentData.address || null,
            enrollment_date: new Date().toISOString().split('T')[0],
            is_active: true,
          });

        if (error) throw error;

        successCount++;
      } catch (error) {
        console.error('Error importing student:', error);
        errors.push(`${studentData.name}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        errorCount++;
      }
    }

    // Refetch students
    await supabase.from('students').select('id').limit(1);
    window.location.reload();

    if (successCount > 0) {
      toast.success(`Đã import thành công ${successCount} học viên`);
    }
    if (errors.length > 0) {
      console.error('Import errors:', errors);
      toast.error(`Lỗi với ${errors.length} học viên. Xem console để biết chi tiết.`);
    }
  };

  // Export students to CSV
  const handleExportStudents = () => {
    if (!filteredStudents.length) {
      toast.error('Không có học viên để xuất');
      return;
    }

    setIsExporting(true);
    try {
      const exportData = filteredStudents.map(student => ({
        baptism_name: student.baptism_name,
        name: student.name,
        gender: student.gender,
        birth_date: student.birth_date,
        address: student.address,
        class_name: student.classes?.name || ''
      }));

      const csvContent = generateStudentCSV(exportData);
      const className = selectedClass !== 'all' 
        ? classes?.find(c => c.id === selectedClass)?.name?.replace(/\s+/g, '_') || 'all'
        : 'tat_ca';
      downloadCSV(csvContent, `danh_sach_hoc_vien_${className}.csv`);
      
      toast.success('Xuất danh sách thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất danh sách');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout 
      title="Quản lý Học viên" 
      subtitle="Danh sách và thông tin học viên"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card variant="flat" className="border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên hoặc mã HV..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedClass} onValueChange={(val) => {
                  setSelectedClass(val);
                  setSearchParams(val ? { classId: val } : {});
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Chọn chi đoàn" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      Thêm
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManageClass && (
                      <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} disabled={!classes || classes.length === 0}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import từ CSV
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleExportStudents} disabled={isExporting || !filteredStudents.length}>
                      <Download className="mr-2 h-4 w-4" />
                      Xuất danh sách
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {canManageClass && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="gold" disabled={!classes || classes.length === 0}>
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm đoàn viên
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Thêm đoàn viên mới</DialogTitle>
                      <DialogDescription>
                        Điền thông tin để thêm đoàn viên vào chi đoàn.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="studentName">Họ và tên *</Label>
                          <Input
                            id="studentName"
                            placeholder="Nguyễn Văn A"
                            value={newStudent.name}
                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="baptismName">Tên Thánh</Label>
                          <Input
                            id="baptismName"
                            placeholder="Giuse"
                            value={newStudent.baptism_name}
                            onChange={(e) => setNewStudent({ ...newStudent, baptism_name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="birthDate">Ngày sinh *</Label>
                          <Input
                            id="birthDate"
                            type="date"
                            value={newStudent.birth_date}
                            onChange={(e) => setNewStudent({ ...newStudent, birth_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Giới tính</Label>
                          <Select
                            value={newStudent.gender}
                            onValueChange={(value: 'male' | 'female') => setNewStudent({ ...newStudent, gender: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Nam</SelectItem>
                              <SelectItem value="female">Nữ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classId">Lớp học *</Label>
                        <Select
                          value={newStudent.class_id}
                          onValueChange={(value) => setNewStudent({ ...newStudent, class_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn lớp" />
                          </SelectTrigger>
                          <SelectContent>
                            {(classes || []).map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">SĐT học viên</Label>
                          <Input
                            id="phone"
                            placeholder="0901234567"
                            value={newStudent.phone}
                            onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parentPhone">SĐT phụ huynh</Label>
                          <Input
                            id="parentPhone"
                            placeholder="0901234567"
                            value={newStudent.parent_phone}
                            onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Địa chỉ</Label>
                        <Input
                          id="address"
                          placeholder="123 Đường ABC, Quận XYZ"
                          value={newStudent.address}
                          onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleCreateStudent} disabled={createStudent.isPending}>
                        {createStudent.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang thêm...
                          </>
                        ) : (
                          'Thêm học viên'
                        )}
                      </Button>
                    </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <ImportStudentsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          classes={classes || []}
          onImport={handleImportStudents}
        />

        {/* Results count */}
        {selectedClass && (
          <p className="text-sm text-muted-foreground">
            Tìm thấy {filteredStudents.length} đoàn viên
          </p>
        )}

        {/* Students Table */}
        {!selectedClass ? (
          <Card className="p-8 text-center bg-card">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Database className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">Vui lòng chọn chi đoàn ở bộ lọc phía trên để xem danh sách đoàn viên.</p>
            </div>
          </Card>
        ) : (
          <Card variant="elevated">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Tên Thánh</TableHead>
                      <TableHead>Chi đoàn</TableHead>
                      <TableHead>Ngày sinh</TableHead>
                      <TableHead>Giới tính</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => (
                      <TableRow 
                        key={student.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.baptism_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.classes?.name || 'Chưa xếp lớp'}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(student.birth_date)}</TableCell>
                      <TableCell>
                        <Badge variant={student.gender === 'male' ? 'default' : 'gold'}>
                          {student.gender === 'male' ? 'Nam' : 'Nữ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManageClass && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingStudent(student);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Chưa có học viên nào</p>
                <p className="text-sm text-muted-foreground">
                  {!classes || classes.length === 0 
                    ? 'Hãy tạo lớp học trước khi thêm học viên'
                    : 'Nhấn "Thêm học viên" để bắt đầu'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            {editingStudent && (
              <>
                <DialogHeader>
                  <DialogTitle>Chỉnh sửa thông tin học viên</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Họ và tên *</Label>
                      <Input
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tên Thánh</Label>
                      <Input
                        value={editingStudent.baptism_name || ''}
                        onChange={(e) => setEditingStudent({ ...editingStudent, baptism_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ngày sinh *</Label>
                      <Input
                        type="date"
                        value={editingStudent.birth_date}
                        onChange={(e) => setEditingStudent({ ...editingStudent, birth_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Giới tính</Label>
                      <Select
                        value={editingStudent.gender}
                        onValueChange={(value: 'male' | 'female') => setEditingStudent({ ...editingStudent, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Nam</SelectItem>
                          <SelectItem value="female">Nữ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Lớp học *</Label>
                    <Select
                      value={editingStudent.class_id || ''}
                      onValueChange={(value) => setEditingStudent({ ...editingStudent, class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(classes || []).map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SĐT học viên</Label>
                      <Input
                        value={editingStudent.phone || ''}
                        onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SĐT phụ huynh</Label>
                      <Input
                        value={editingStudent.parent_phone || ''}
                        onChange={(e) => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ</Label>
                    <Input
                      value={editingStudent.address || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleUpdateStudent} disabled={updateStudent.isPending}>
                    {updateStudent.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật'
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Student Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedStudent && (
              <>
                <DialogHeader>
                  <DialogTitle>Hồ sơ học viên</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedStudent.baptism_name} {selectedStudent.name}
                      </h3>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ngày sinh</p>
                        <p className="font-medium">{formatDate(selectedStudent.birth_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lớp</p>
                        <p className="font-medium">{selectedStudent.classes?.name || 'Chưa xếp lớp'}</p>
                      </div>
                    </div>
                    {selectedStudent.phone && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Số điện thoại</p>
                          <p className="font-medium">{selectedStudent.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedStudent.address && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Địa chỉ</p>
                          <p className="font-medium">{selectedStudent.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
