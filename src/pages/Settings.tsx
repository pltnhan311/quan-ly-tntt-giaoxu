import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImportSetupDialog } from '@/components/settings/ImportSetupDialog';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Clock, 
  Settings as SettingsIcon, 
  CalendarDays, 
  KeyRound, 
  Globe, 
  ShieldCheck
} from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <MainLayout 
      title="Cài đặt hệ thống" 
      subtitle="Quản lý cấu hình và thiết lập hệ thống"
    >
      <div className="space-y-6 max-w-5xl">
        {/* System Configuration Display */}
        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Cấu hình hệ thống</CardTitle>
                <CardDescription>Các thiết lập mặc định được áp dụng tự động trên toàn hệ thống</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {/* Study Schedule Config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Lịch học cố định</p>
                  <p className="text-sm text-muted-foreground">
                    Áp dụng cố định cho tất cả các Chi đoàn sinh hoạt vào ngày Chúa Nhật.
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:self-center">
                <Badge variant="gold" className="text-sm px-3 py-1 font-semibold">
                  9:00 - 10:30 Chúa Nhật hàng tuần
                </Badge>
              </div>
            </div>

            {/* Default Password Config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Mật khẩu tài khoản mới</p>
                  <p className="text-sm text-muted-foreground">
                    Mật khẩu mặc định được tạo tự động cho Giáo lý viên khi thực hiện import dữ liệu.
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:self-center">
                <Badge variant="secondary" className="text-sm px-3 py-1 font-mono">
                  123456
                </Badge>
              </div>
            </div>

            {/* Timezone Config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Múi giờ hệ thống</p>
                  <p className="text-sm text-muted-foreground">
                    Sử dụng để ghi nhận thời gian điểm danh và cập nhật dữ liệu.
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:self-center">
                <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded">
                  Asia/Ho_Chi_Minh (GMT+7)
                </span>
              </div>
            </div>

            {/* Verification & Access Config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Xác thực người dùng</p>
                  <p className="text-sm text-muted-foreground">
                    Phân quyền truy cập dựa trên 3 vai trò: Quản trị viên, Trưởng Ngành, Giáo lý viên.
                  </p>
                </div>
              </div>
              <div className="flex items-center sm:self-center">
                <Badge variant="outline" className="text-sm px-3 py-1 text-success border-success/30 bg-success/5 font-semibold">
                  Đang hoạt động (Supabase Auth)
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Setup / Import Section */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Khởi tạo dữ liệu niên khóa</CardTitle>
                <CardDescription>
                  Thiết lập nhanh niên khóa mới bằng cách import dữ liệu chi đoàn và giáo lý viên từ file CSV.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-muted/30 p-4 rounded-lg border border-dashed">
              <div className="max-w-xl">
                <p className="text-sm font-medium text-foreground">Import Setup Niên khóa mới</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hệ thống sẽ tự động liên kết các Chi đoàn với các Giáo lý viên tương ứng dựa trên tên lớp được cấu hình trong file CSV.
                </p>
              </div>
              <Button onClick={() => setImportDialogOpen(true)} variant="gold" className="shrink-0">
                <Upload className="mr-2 h-4 w-4" />
                Import dữ liệu niên khóa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Setup Dialog */}
      <ImportSetupDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['academic-years'] });
          queryClient.invalidateQueries({ queryKey: ['classes'] });
          queryClient.invalidateQueries({ queryKey: ['catechists'] });
          queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
        }}
      />
    </MainLayout>
  );
}
