import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Download, Loader2, CheckCircle2, AlertCircle, Calendar, School, Users } from 'lucide-react';
import { parseCSV } from '@/utils/csvUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ClassImportData {
  name: string;
  description?: string;
  schedule?: string;
}

interface TeacherImportData {
  name: string;
  email: string;
  phone?: string;
  baptism_name?: string;
  address?: string;
  class_name?: string; // To assign to class
}

export function ImportSetupDialog({ open, onOpenChange, onSuccess }: ImportSetupDialogProps) {
  const [activeTab, setActiveTab] = useState('academic-year');
  const [isImporting, setIsImporting] = useState(false);
  
  // Academic year state
  const [academicYearName, setAcademicYearName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createdAcademicYearId, setCreatedAcademicYearId] = useState<string | null>(null);
  
  // Classes state
  const [classesData, setClassesData] = useState<ClassImportData[]>([]);
  const [classFileName, setClassFileName] = useState('');
  const classFileRef = useRef<HTMLInputElement>(null);
  const [createdClasses, setCreatedClasses] = useState<Array<{ id: string; name: string }>>([]);
  
  // Teachers state
  const [teachersData, setTeachersData] = useState<TeacherImportData[]>([]);
  const [teacherFileName, setTeacherFileName] = useState('');
  const teacherFileRef = useRef<HTMLInputElement>(null);

  const downloadClassTemplate = () => {
    const template = 'Tên lớp,Mô tả,Lịch học\nKhai Tâm 1,Lớp khai tâm năm 1,Chủ nhật 7h30\nKhai Tâm 2,Lớp khai tâm năm 2,Chủ nhật 8h30\nRước Lễ 1,Lớp rước lễ năm 1,Chủ nhật 9h30';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_danh_sach_lop.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTeacherTemplate = () => {
    const template = 'Họ và Tên,Email,Số điện thoại,Tên Thánh,Địa chỉ,Lớp phụ trách\nNguyễn Văn A,nguyenvana@email.com,0901234567,Giuse,123 Đường ABC,Khai Tâm 1\nTrần Thị B,tranthib@email.com,0912345678,Maria,456 Đường XYZ,Khai Tâm 2';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_danh_sach_giao_ly_vien.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClassFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClassFileName(file.name);

    try {
      const content = await file.text();
      const rows = parseCSV(content);
      
      if (rows.length < 2) {
        toast.error('File không có dữ liệu');
        return;
      }

      const classes: ClassImportData[] = rows.slice(1).map(row => ({
        name: row[0]?.trim() || '',
        description: row[1]?.trim() || '',
        schedule: row[2]?.trim() || 'CN | 9:00 - 10:30'
      })).filter(c => c.name);

      setClassesData(classes);
      toast.success(`Đã đọc ${classes.length} lớp từ file`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Lỗi khi đọc file CSV');
    }
  };

  const handleTeacherFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeacherFileName(file.name);

    try {
      const content = await file.text();
      const rows = parseCSV(content);
      
      if (rows.length < 2) {
        toast.error('File không có dữ liệu');
        return;
      }

      const teachers: TeacherImportData[] = rows.slice(1).map(row => ({
        name: row[0]?.trim() || '',
        email: row[1]?.trim() || '',
        phone: row[2]?.trim() || '',
        baptism_name: row[3]?.trim() || '',
        address: row[4]?.trim() || '',
        class_name: row[5]?.trim() || ''
      })).filter(t => t.name && t.email);

      setTeachersData(teachers);
      toast.success(`Đã đọc ${teachers.length} giáo lý viên từ file`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Lỗi khi đọc file CSV');
    }
  };

  const handleCreateAcademicYear = async () => {
    if (!academicYearName || !startDate || !endDate) {
      toast.error('Vui lòng nhập đầy đủ thông tin niên khóa');
      return;
    }

    setIsImporting(true);
    try {
      // Deactivate other academic years
      await supabase
        .from('academic_years')
        .update({ is_active: false })
        .eq('is_active', true);

      // Create new academic year
      const { data, error } = await supabase
        .from('academic_years')
        .insert({
          name: academicYearName,
          start_date: startDate,
          end_date: endDate,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedAcademicYearId(data.id);
      toast.success('Tạo niên khóa thành công!');
      setActiveTab('classes');
    } catch (error) {
      console.error('Error creating academic year:', error);
      toast.error('Lỗi khi tạo niên khóa');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClasses = async () => {
    if (!createdAcademicYearId) {
      toast.error('Vui lòng tạo niên khóa trước');
      return;
    }

    if (classesData.length === 0) {
      toast.error('Không có dữ liệu lớp để import');
      return;
    }

    setIsImporting(true);
    try {
      const classesToInsert = classesData.map(c => ({
        name: c.name,
        description: c.description || null,
        schedule: c.schedule || null,
        academic_year_id: createdAcademicYearId
      }));

      const { data, error } = await supabase
        .from('classes')
        .insert(classesToInsert)
        .select();

      if (error) throw error;

      setCreatedClasses(data.map(c => ({ id: c.id, name: c.name })));
      toast.success(`Đã tạo ${data.length} lớp thành công!`);
      setActiveTab('teachers');
    } catch (error) {
      console.error('Error importing classes:', error);
      toast.error('Lỗi khi import lớp');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportTeachers = async () => {
    if (teachersData.length === 0) {
      toast.error('Không có dữ liệu giáo lý viên để import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const teacher of teachersData) {
      try {
        // Create GLV account via edge function
        const { data, error } = await supabase.functions.invoke('create-glv-account', {
          body: {
            name: teacher.name,
            email: teacher.email,
            password: '123456', // Default password
            phone: teacher.phone,
            baptism_name: teacher.baptism_name,
            address: teacher.address
          }
        });

        if (error) throw error;

        // If class_name specified, try to assign to class
        if (teacher.class_name && createdClasses.length > 0) {
          const matchedClass = createdClasses.find(c => 
            c.name.toLowerCase().includes(teacher.class_name!.toLowerCase()) ||
            teacher.class_name!.toLowerCase().includes(c.name.toLowerCase())
          );

          if (matchedClass && data?.catechist?.id) {
            await supabase
              .from('class_catechists')
              .insert({
                class_id: matchedClass.id,
                catechist_id: data.catechist.id,
                is_primary: true
              });
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error creating teacher ${teacher.name}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Đã tạo ${successCount} giáo lý viên thành công!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} giáo lý viên không tạo được (có thể email đã tồn tại)`);
    }

    setIsImporting(false);
    onSuccess();
    onOpenChange(false);
  };

  const handleClose = () => {
    setAcademicYearName('');
    setStartDate('');
    setEndDate('');
    setCreatedAcademicYearId(null);
    setClassesData([]);
    setClassFileName('');
    setCreatedClasses([]);
    setTeachersData([]);
    setTeacherFileName('');
    setActiveTab('academic-year');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Setup nhanh niên khóa mới</DialogTitle>
          <DialogDescription>
            Tạo niên khóa, lớp học và giáo lý viên từ file CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="academic-year" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Niên khóa</span>
            </TabsTrigger>
            <TabsTrigger value="classes" disabled={!createdAcademicYearId} className="flex items-center gap-2">
              <School className="h-4 w-4" />
              <span className="hidden sm:inline">Lớp học</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" disabled={createdClasses.length === 0} className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Giáo lý viên</span>
            </TabsTrigger>
          </TabsList>

          {/* Academic Year Tab */}
          <TabsContent value="academic-year" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="year-name">Tên niên khóa *</Label>
                <Input
                  id="year-name"
                  placeholder="VD: Niên khóa 2026-2027"
                  value={academicYearName}
                  onChange={(e) => setAcademicYearName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Ngày bắt đầu *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Ngày kết thúc *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {createdAcademicYearId && (
              <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-success font-medium">Đã tạo niên khóa thành công!</span>
              </div>
            )}

            <Button
              onClick={handleCreateAcademicYear}
              disabled={isImporting || !!createdAcademicYearId}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : createdAcademicYearId ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Đã tạo - Tiếp tục bước 2
                </>
              ) : (
                'Tạo niên khóa'
              )}
            </Button>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={classFileRef}
                type="file"
                accept=".csv"
                onChange={handleClassFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => classFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Chọn file CSV
              </Button>
              <Button variant="ghost" onClick={downloadClassTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Tải template mẫu
              </Button>
              {classFileName && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {classFileName}
                </span>
              )}
            </div>

            {classesData.length > 0 ? (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Tên lớp</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Lịch học</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classesData.map((cls, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>{cls.description || '-'}</TableCell>
                        <TableCell>{cls.schedule || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-12">
                <School className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chọn file CSV hoặc tải template mẫu</p>
              </div>
            )}

            {createdClasses.length > 0 && (
              <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-success font-medium">Đã tạo {createdClasses.length} lớp thành công!</span>
              </div>
            )}

            <Button
              onClick={handleImportClasses}
              disabled={isImporting || classesData.length === 0 || createdClasses.length > 0}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang import...
                </>
              ) : createdClasses.length > 0 ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Đã tạo - Tiếp tục bước 3
                </>
              ) : (
                `Import ${classesData.length} lớp`
              )}
            </Button>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={teacherFileRef}
                type="file"
                accept=".csv"
                onChange={handleTeacherFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => teacherFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Chọn file CSV
              </Button>
              <Button variant="ghost" onClick={downloadTeacherTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Tải template mẫu
              </Button>
              {teacherFileName && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {teacherFileName}
                </span>
              )}
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Lưu ý:</strong> Mật khẩu mặc định của giáo lý viên là <code className="bg-background px-1 rounded">123456</code></p>
            </div>

            {teachersData.length > 0 ? (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Họ và Tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SĐT</TableHead>
                      <TableHead>Lớp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachersData.map((teacher, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell>{teacher.phone || '-'}</TableCell>
                        <TableCell>
                          {teacher.class_name ? (
                            <Badge variant="secondary">{teacher.class_name}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {teacher.name && teacher.email ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chọn file CSV hoặc tải template mẫu</p>
              </div>
            )}

            <Button
              onClick={handleImportTeachers}
              disabled={isImporting || teachersData.length === 0}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                `Import ${teachersData.length} giáo lý viên`
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
