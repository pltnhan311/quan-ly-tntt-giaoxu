import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Download, Smartphone, Monitor, Check, Share, Plus, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <GraduationCap className="h-12 w-12 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản Lý Giáo Lý</h1>
            <p className="text-muted-foreground">Đoàn Thiếu Nhi Thánh Thể - Giáo xứ Xóm Chiếu</p>
          </div>
        </div>

        {/* Install Status */}
        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600">
                <Check className="h-6 w-6" />
                <div>
                  <p className="font-medium">Đã cài đặt thành công!</p>
                  <p className="text-sm text-muted-foreground">Ứng dụng đã được thêm vào màn hình chính.</p>
                </div>
              </div>
              <Link to="/dashboard" className="mt-4 block">
                <Button className="w-full">Mở ứng dụng</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Button (Chrome/Edge/etc) */}
            {deferredPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Cài đặt ứng dụng
                  </CardTitle>
                  <CardDescription>
                    Cài đặt ứng dụng để truy cập nhanh hơn và sử dụng offline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Cài đặt ngay
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Cài đặt trên iPhone/iPad
                  </CardTitle>
                  <CardDescription>
                    Làm theo các bước sau để cài đặt ứng dụng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="font-medium">Nhấn nút Chia sẻ</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Nhấn biểu tượng <Share className="h-4 w-4 inline" /> ở thanh công cụ Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="font-medium">Chọn "Thêm vào MH chính"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Cuộn xuống và chọn <Plus className="h-4 w-4 inline" /> Thêm vào Màn hình chính
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                    <div className="flex-1">
                      <p className="font-medium">Xác nhận cài đặt</p>
                      <p className="text-sm text-muted-foreground">Nhấn "Thêm" ở góc phải trên</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {isAndroid && !deferredPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Cài đặt trên Android
                  </CardTitle>
                  <CardDescription>
                    Làm theo các bước sau để cài đặt ứng dụng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="font-medium">Mở menu trình duyệt</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Nhấn biểu tượng <MoreVertical className="h-4 w-4 inline" /> ở góc phải trên
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="font-medium">Chọn "Cài đặt ứng dụng"</p>
                      <p className="text-sm text-muted-foreground">Hoặc "Thêm vào màn hình chính"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                    <div className="flex-1">
                      <p className="font-medium">Xác nhận cài đặt</p>
                      <p className="text-sm text-muted-foreground">Nhấn "Cài đặt" trong hộp thoại</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Cài đặt trên máy tính
                  </CardTitle>
                  <CardDescription>
                    Sử dụng Chrome, Edge hoặc các trình duyệt hỗ trợ PWA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="font-medium">Tìm biểu tượng cài đặt</p>
                      <p className="text-sm text-muted-foreground">
                        Biểu tượng <Download className="h-4 w-4 inline" /> trong thanh địa chỉ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="font-medium">Nhấn "Cài đặt"</p>
                      <p className="text-sm text-muted-foreground">Xác nhận trong hộp thoại xuất hiện</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Tính năng khi cài đặt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">Truy cập nhanh từ màn hình chính</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">Hoạt động mượt mà như ứng dụng native</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">Tải nhanh hơn nhờ cache thông minh</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">Nhận thông báo (sắp có)</span>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
