import { useRef, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileText, CheckCircle2, Loader2, Download } from 'lucide-react';
import { parseCSV } from '@/utils/csvUtils';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface CatechistImportData {
  name: string;
  email: string;
  phone: string;
  baptism_name: string;
  address: string;
}

interface ImportCatechistsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (catechists: CatechistImportData[]) => Promise<void>;
  existingEmails: string[];
}

export function ImportCatechistsDialog({ open, onOpenChange, onImport, existingEmails }: ImportCatechistsDialogProps) {
  const [previewData, setPreviewData] = useState<CatechistImportData[]>([]);
  const [duplicateErrors, setDuplicateErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'Họ và Tên,Email,Số điện thoại,Tên Thánh,Địa chỉ\nNguyễn Văn A,nguyenvana@email.com,0901234567,Giuse,123 Đường ABC\nTrần Thị B,tranthib@email.com,0912345678,Maria,456 Đường XYZ';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_danh_sach_giao_ly_vien.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const rows = parseCSV(await file.text());
      if (rows.length < 2) {
        toast.error('File không có dữ liệu');
        return;
      }

      const parsedRows = rows.slice(1).map((row, index) => ({
        name: row[0]?.trim() || '',
        email: row[1]?.trim() || '',
        phone: row[2]?.trim() || '',
        baptism_name: row[3]?.trim() || '',
        address: row[4]?.trim() || '',
        lineNumber: index + 2,
      })).filter(catechist => catechist.name && catechist.email);

      const emailRows = new Map<string, number[]>();
      parsedRows.forEach(row => {
        const email = row.email.toLowerCase();
        emailRows.set(email, [...(emailRows.get(email) || []), row.lineNumber]);
      });

      const existingEmailSet = new Set(existingEmails.map(email => email.trim().toLowerCase()).filter(Boolean));
      const duplicateMessages: string[] = [];
      emailRows.forEach((lineNumbers, email) => {
        if (lineNumbers.length > 1) {
          duplicateMessages.push(`${email} (trùng trong file, dòng ${lineNumbers.join(', ')})`);
        }
        if (existingEmailSet.has(email)) {
          duplicateMessages.push(`${email} (đã tồn tại trong hệ thống)`);
        }
      });

      if (duplicateMessages.length > 0) {
        setDuplicateErrors(duplicateMessages);
        setPreviewData([]);
        toast.error(`Không thể import: phát hiện ${duplicateMessages.length} email trùng`);
        return;
      }

      setDuplicateErrors([]);
      const catechists = parsedRows.map(({ lineNumber: _lineNumber, ...catechist }) => catechist);

      if (catechists.length === 0) {
        toast.error('Không tìm thấy giáo lý viên hợp lệ trong file');
        return;
      }

      setPreviewData(catechists);
      toast.success(`Đã đọc ${catechists.length} giáo lý viên từ file`);
    } catch (error) {
      console.error('Error reading catechist file:', error);
      toast.error('Lỗi khi đọc file CSV');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0 || duplicateErrors.length > 0) {
      toast.error('Không có dữ liệu để import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(previewData);
      handleClose();
    } catch (error) {
      console.error('Import catechists error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPreviewData([]);
    setDuplicateErrors([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import danh sách giáo lý viên</DialogTitle>
          <DialogDescription>
            File CSV gồm: Họ và Tên, Email, Số điện thoại, Tên Thánh, Địa chỉ. Việc gán lớp thực hiện tại module Chi đoàn. Mật khẩu mặc định là 123456.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Chọn file CSV
            </Button>
            <Button variant="ghost" onClick={downloadTemplate} type="button">
              <Download className="mr-2 h-4 w-4" /> Tải template mẫu
            </Button>
            {fileName && <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" />{fileName}</div>}
          </div>

          {duplicateErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Không thể import file này</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Vui lòng sửa các email bị trùng rồi chọn lại file:</p>
                <ul className="list-disc space-y-1 pl-5">
                  {duplicateErrors.map(error => <li key={error}>{error}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 ? (
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và Tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tên Thánh</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((catechist, index) => (
                    <TableRow key={`${catechist.email}-${index}`}>
                      <TableCell className="font-medium">{catechist.name}</TableCell>
                      <TableCell>{catechist.email}</TableCell>
                      <TableCell>{catechist.baptism_name || '-'}</TableCell>
                      <TableCell>{catechist.phone || '-'}</TableCell>
                      <TableCell><CheckCircle2 className="h-4 w-4 text-success" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 50 && <p className="text-sm text-muted-foreground p-4">Hiển thị 50/{previewData.length} giáo lý viên</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chọn file CSV để xem trước dữ liệu</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Hủy</Button>
          <Button onClick={handleImport} disabled={previewData.length === 0 || duplicateErrors.length > 0 || isImporting}>
            {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang import...</> : <><Upload className="mr-2 h-4 w-4" />Import {previewData.length} giáo lý viên</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
