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
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { parseCSV, parseStudentCSV, StudentImportData } from '@/utils/csvUtils';
import { toast } from 'sonner';

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Array<{ id: string; name: string }>;
  onImport: (students: Array<StudentImportData & { class_id: string }>) => Promise<void>;
}

export function ImportStudentsDialog({ 
  open, 
  onOpenChange, 
  classes,
  onImport 
}: ImportStudentsDialogProps) {
  const [previewData, setPreviewData] = useState<StudentImportData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadStudentTemplate = () => {
    const template = 'STT,Tên Thánh,Họ và Tên,Giới Tính,Ngày Sinh,Địa Chỉ,Lớp\n1,Giuse,Nguyễn Văn A,Nam,15/05/2012,123 Đường ABC,Khai Tâm 1\n2,Maria,Trần Thị B,Nữ,20/10/2012,456 Đường XYZ,Khai Tâm 1';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_danh_sach_hoc_vien.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const content = await file.text();
      const rows = parseCSV(content);
      const students = parseStudentCSV(rows);
      
      if (students.length === 0) {
        toast.error('Không tìm thấy dữ liệu học viên hợp lệ trong file');
        return;
      }

      setPreviewData(students);
      
      // Auto-select class from CSV if matches
      if (students[0]?.class_name && classes.length > 0) {
        const matchedClass = classes.find(c => 
          c.name.toLowerCase().includes(students[0].class_name.toLowerCase()) ||
          students[0].class_name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedClass) {
          setSelectedClassId(matchedClass.id);
        }
      }
      
      toast.success(`Đã đọc ${students.length} học viên từ file`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Lỗi khi đọc file CSV');
    }
  };

  const handleImport = async () => {
    if (!selectedClassId) {
      toast.error('Vui lòng chọn lớp');
      return;
    }

    if (previewData.length === 0) {
      toast.error('Không có dữ liệu để import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(previewData.map(student => ({
        ...student,
        class_id: selectedClassId
      })));
      
      // Reset state
      setPreviewData([]);
      setSelectedClassId('');
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPreviewData([]);
    setSelectedClassId('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import danh sách học viên</DialogTitle>
          <DialogDescription>
            Tải lên file CSV theo định dạng: STT, Tên Thánh, Họ và Tên, Giới Tính, Ngày Sinh, Địa Chỉ, Lớp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File upload */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Upload className="mr-2 h-4 w-4" />
              Chọn file CSV
            </Button>
            <Button
              variant="ghost"
              onClick={downloadStudentTemplate}
              type="button"
            >
              <Download className="mr-2 h-4 w-4" />
              Tải template mẫu
            </Button>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                <FileText className="h-4 w-4" />
                {fileName}
              </div>
            )}
          </div>

          {/* Class selection */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn lớp để import *</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview table */}
          {previewData.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên Thánh</TableHead>
                    <TableHead>Họ và Tên</TableHead>
                    <TableHead>Giới tính</TableHead>
                    <TableHead>Ngày sinh</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.baptism_name || '-'}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Badge variant={student.gender === 'male' ? 'default' : 'gold'}>
                          {student.gender === 'male' ? 'Nam' : 'Nữ'}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.birth_date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{student.address || '-'}</TableCell>
                      <TableCell>
                        {student.name && student.birth_date ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 50 && (
                <p className="text-sm text-muted-foreground p-4">
                  Hiển thị 50/{previewData.length} học viên
                </p>
              )}
            </div>
          )}

          {previewData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chọn file CSV để xem trước dữ liệu</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedClassId || previewData.length === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {previewData.length} học viên
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
