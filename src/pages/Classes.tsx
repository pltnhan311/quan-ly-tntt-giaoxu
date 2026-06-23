import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useClasses, useCreateClass, useUpdateClass, type ClassInfo } from '@/hooks/useClasses';
import { useAcademicYears, useActiveAcademicYear } from '@/hooks/useAcademicYears';
import { useBranches } from '@/hooks/useBranches';
import { Plus, Users, Clock, UserCheck, ChevronRight, Loader2, Database, Pencil, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_CLASSES_BY_BRANCH: Record<string, string[]> = {
  'Chiên Con': [
    'ANRÊ – CHIÊN A',
    'PHÊRÔ – CHIÊN B'
  ],
  'Ấu Nhi': [
    'GIACÔBÊ TIỀN – ẤU 1A',
    'GIOAN – ẤU 1B',
    'BATÔLÔMÊÔ – ẤU 2A',
    'MATHÊU (LÊVI) – ẤU 2B',
    'GIACÔBÊ HẬU – ẤU 3A',
    'GIUĐA (TAĐÊÔ) – ẤU 3B',
    'SIMON – ẤU 3C'
  ],
  'Thiếu Nhi': [
    'RUBEN – THIẾU 1A',
    'SIMÊON – THIẾU 1B',
    'GIUĐA – THIẾU 1C',
    'ZABULUN – THIẾU 1D',
    'ASHÊ – THIẾU 3A',
    'GÁT – THIẾU 3B',
    'ISAKHA – THIẾU 3C',
    'LÊVI – THIẾU 3D'
  ],
  'Nghĩa Sĩ': [
    'ANTIÔKIA – NGHĨA 1A',
    'CILICIA – NGHĨA 1B',
    'CORINTO – NGHĨA 3A',
    'GALÁT – NGHĨA 3B'
  ],
  'Hiệp Sĩ': [
    'ÊPHÊSÔ – HIỆP SĨ 1',
    'CÊSARÊ – HIỆP SĨ 2',
    'AKAIA – HIỆP SĨ 3'
  ],
  'Dự Trưởng': [
    'DỰ TRƯỞNG'
  ]
};

export default function Classes() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { data: classes, isLoading } = useClasses();
  const { data: academicYears } = useAcademicYears();
  const { data: activeYear } = useActiveAcademicYear();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(() => {
    return activeYear?.id || 'all';
  });
  const [newClass, setNewClass] = useState({
    name: '',
    academic_year_id: '',
    branch_id: '',
    description: '',
    schedule: 'CN | 9:00 - 10:30'
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [editClass, setEditClass] = useState({
    name: '',
    academic_year_id: '',
    branch_id: '',
    description: '',
    schedule: 'CN | 9:00 - 10:30'
  });

  // Branches for the selected academic year in dialog
  const { data: branches } = useBranches(newClass.academic_year_id || undefined);
  const { data: editBranches } = useBranches(editClass.academic_year_id || undefined);
  const { data: filterBranches } = useBranches(selectedYearFilter !== 'all' ? selectedYearFilter : undefined);

  const [useCustomName, setUseCustomName] = useState(false);
  const [useEditCustomName, setUseEditCustomName] = useState(false);

  const selectedBranch = branches?.find(b => b.id === newClass.branch_id);
  const branchName = selectedBranch?.name || '';
  const classOptions = DEFAULT_CLASSES_BY_BRANCH[branchName] || [];

  const selectedEditBranch = editBranches?.find(b => b.id === editClass.branch_id);
  const editBranchName = selectedEditBranch?.name || '';
  const editClassOptions = DEFAULT_CLASSES_BY_BRANCH[editBranchName] || [];

  const handleBranchChange = (value: string) => {
    const branchId = value === 'none' ? '' : value;
    const selectedB = branches?.find(b => b.id === branchId);
    const bName = selectedB?.name || '';
    const options = DEFAULT_CLASSES_BY_BRANCH[bName] || [];
    
    setNewClass({ 
      ...newClass, 
      branch_id: branchId,
      name: options[0] || '' 
    });
    setUseCustomName(false);
  };

  const handleEditBranchChange = (value: string) => {
    const branchId = value === 'none' ? '' : value;
    const selectedB = editBranches?.find(b => b.id === branchId);
    const bName = selectedB?.name || '';
    const options = DEFAULT_CLASSES_BY_BRANCH[bName] || [];
    
    setEditClass({ 
      ...editClass, 
      branch_id: branchId,
      name: options[0] || '' 
    });
    setUseEditCustomName(false);
  };

  // Filtered classes
  const filteredClasses = (classes || []).filter(cls => {
    const matchYear = selectedYearFilter === 'all' || cls.academic_year_id === selectedYearFilter;
    const matchBranch = selectedBranchFilter === 'all' || cls.branch_id === selectedBranchFilter;
    return matchYear && matchBranch;
  });

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.academic_year_id) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    createClass.mutate({
      name: newClass.name,
      academic_year_id: newClass.academic_year_id,
      branch_id: newClass.branch_id || null,
      description: newClass.description || undefined,
      schedule: newClass.schedule || undefined,
    }, {
      onSuccess: () => {
        setNewClass({ name: '', academic_year_id: '', branch_id: '', description: '', schedule: 'CN | 9:00 - 10:30' });
        setIsDialogOpen(false);
      }
    });
  };

  const handleOpenEditClass = (cls: ClassInfo) => {
    setEditingClass(cls);
    setEditClass({
      name: cls.name,
      academic_year_id: cls.academic_year_id,
      branch_id: cls.branch_id || '',
      description: cls.description || '',
      schedule: cls.schedule || 'CN | 9:00 - 10:30'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    if (!editClass.name || !editClass.academic_year_id) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    updateClass.mutate({
      id: editingClass.id,
      name: editClass.name,
      academic_year_id: editClass.academic_year_id,
      branch_id: editClass.branch_id || null,
      description: editClass.description || undefined,
      schedule: editClass.schedule || undefined,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingClass(null);
      }
    });
  };

  return (
    <MainLayout 
      title="Quản lý Chi đoàn" 
      subtitle="Tạo và quản lý các chi đoàn trong từng ngành"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 flex-wrap">
            <Select value={selectedYearFilter} onValueChange={(v) => { setSelectedYearFilter(v); setSelectedBranchFilter('all'); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả niên khóa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả niên khóa</SelectItem>
                {(academicYears || []).map(year => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} {year.is_active && '✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter} disabled={selectedYearFilter === 'all'}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả ngành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành</SelectItem>
                {(filterBranches || []).map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm self-center">
              {filteredClasses.length} chi đoàn
            </p>
          </div>
          {userRole === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gold" disabled={!academicYears || academicYears.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo lớp mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Tạo lớp mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin để tạo lớp học mới trong niên khóa.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Niên khóa *</Label>
                    <Select
                      value={newClass.academic_year_id}
                      onValueChange={(value) => {
                        setNewClass({ ...newClass, academic_year_id: value, branch_id: '', name: '' });
                        setUseCustomName(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn niên khóa" />
                      </SelectTrigger>
                      <SelectContent>
                        {(academicYears || []).map(year => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name} {year.is_active && '(Đang hoạt động)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newClass.academic_year_id && (
                    <div className="space-y-2">
                      <Label htmlFor="branchId">Ngành</Label>
                      <Select
                        value={newClass.branch_id || 'none'}
                        onValueChange={handleBranchChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngành (tuỳ chọn)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Không thuộc ngành nào —</SelectItem>
                          {(branches || []).map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="className">Tên chi đoàn *</Label>
                    {classOptions.length > 0 ? (
                      <div className="space-y-2">
                        <Select
                          value={useCustomName ? 'custom' : newClass.name}
                          onValueChange={(val) => {
                            if (val === 'custom') {
                              setUseCustomName(true);
                              setNewClass({ ...newClass, name: '' });
                            } else {
                              setUseCustomName(false);
                              setNewClass({ ...newClass, name: val });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tên chi đoàn từ danh sách" />
                          </SelectTrigger>
                          <SelectContent>
                            {classOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                            <SelectItem value="custom">— Tên khác (tự nhập) —</SelectItem>
                          </SelectContent>
                        </Select>
                        {useCustomName && (
                          <Input
                            id="className"
                            placeholder="Nhập tên chi đoàn tự chọn"
                            value={newClass.name}
                            onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                          />
                        )}
                      </div>
                    ) : (
                      <Input
                        id="className"
                        placeholder="VD: CHI ĐOÀN ANRÊ – CHIÊN A"
                        value={newClass.name}
                        onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả về lớp học..."
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateClass} disabled={createClass.isPending}>
                    {createClass.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      'Tạo chi đoàn'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Class Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingClass(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa chi đoàn</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin chi đoàn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editAcademicYear">Niên khóa *</Label>
                <Select
                  value={editClass.academic_year_id}
                  onValueChange={(value) => {
                    setEditClass({ ...editClass, academic_year_id: value, branch_id: '', name: '' });
                    setUseEditCustomName(false);
                  }}
                  disabled={!editingClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn niên khóa" />
                  </SelectTrigger>
                  <SelectContent>
                    {(academicYears || []).map(year => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.is_active && '(Đang hoạt động)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editClass.academic_year_id && (
                <div className="space-y-2">
                  <Label htmlFor="editBranchId">Ngành</Label>
                  <Select
                    value={editClass.branch_id || 'none'}
                    onValueChange={handleEditBranchChange}
                    disabled={!editingClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngành (tuỳ chọn)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Không thuộc ngành nào —</SelectItem>
                      {(editBranches || []).map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="editClassName">Tên chi đoàn *</Label>
                {editClassOptions.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={useEditCustomName || !editClassOptions.includes(editClass.name) ? 'custom' : editClass.name}
                      onValueChange={(val) => {
                        if (val === 'custom') {
                          setUseEditCustomName(true);
                        } else {
                          setUseEditCustomName(false);
                          setEditClass({ ...editClass, name: val });
                        }
                      }}
                      disabled={!editingClass}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tên chi đoàn từ danh sách" />
                      </SelectTrigger>
                      <SelectContent>
                        {editClassOptions.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                        <SelectItem value="custom">— Tên khác (tự nhập) —</SelectItem>
                      </SelectContent>
                    </Select>
                    {(useEditCustomName || !editClassOptions.includes(editClass.name)) && (
                      <Input
                        id="editClassName"
                        placeholder="Nhập tên chi đoàn tự chọn"
                        value={editClass.name}
                        onChange={(e) => setEditClass({ ...editClass, name: e.target.value })}
                        disabled={!editingClass}
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    id="editClassName"
                    placeholder="VD: CHI ĐOÀN ANRÊ – CHIÊN A"
                    value={editClass.name}
                    onChange={(e) => setEditClass({ ...editClass, name: e.target.value })}
                    disabled={!editingClass}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Mô tả</Label>
                <Textarea
                  id="editDescription"
                  placeholder="Mô tả về lớp học..."
                  value={editClass.description}
                  onChange={(e) => setEditClass({ ...editClass, description: e.target.value })}
                  disabled={!editingClass}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingClass(null);
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleUpdateClass} disabled={updateClass.isPending || !editingClass}>
                {updateClass.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Classes Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredClasses.map((cls, index) => (
              <Card 
                key={cls.id} 
                variant="interactive"
                className="animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/classes/${cls.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {cls.name}
                        <Badge variant="gold">{cls.academic_years?.name || 'N/A'}</Badge>
                        {cls.branches && (
                          <Badge variant="secondary" className="text-xs">
                            <GitBranch className="mr-1 h-3 w-3" />
                            {cls.branches.name}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {cls.description || 'Không có mô tả'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {userRole === 'admin' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClass(cls);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{cls.students?.[0]?.count || 0}</p>
                          <p className="text-xs text-muted-foreground">Đoàn viên</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <Clock className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{cls.schedule || 'CN | 9:00 - 10:30'}</p>
                          <p className="text-xs text-muted-foreground">Lịch học</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Giáo lý viên phụ trách</span>
                      </div>
                      {cls.class_catechists && cls.class_catechists.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {cls.class_catechists.map(cc => (
                            <Badge key={cc.id} variant="secondary">
                              {cc.catechists?.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Chưa gán GLV</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="flat" className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có lớp học nào</h3>
              <p className="text-muted-foreground text-center mb-4">
                {!academicYears || academicYears.length === 0 
                  ? 'Hãy tạo niên khóa trước khi tạo lớp học'
                  : 'Bắt đầu bằng việc tạo lớp học đầu tiên'}
              </p>
              {academicYears && academicYears.length > 0 && (
                <Button variant="gold" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo lớp đầu tiên
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
