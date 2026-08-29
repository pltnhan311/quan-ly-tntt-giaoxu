import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Church, KeyRound, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && !authLoading && userRole !== 'student') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, userRole, navigate]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        toast.error(error.message.includes('Invalid login credentials')
          ? 'Email hoặc mật khẩu không đúng'
          : error.message);
      } else {
        toast.success('Đăng nhập thành công!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Đang tải" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden bg-sidebar lg:block" aria-label="Giới thiệu Giáo xứ Xóm Chiếu">
        <img
          src="/church-xom-chieu.webp"
          alt="Mặt tiền nhà thờ Xóm Chiếu"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/75 to-sidebar/20" />
        <div className="relative z-10 flex min-h-dvh flex-col justify-between p-10 xl:p-16">
          <div className="flex items-center gap-3 text-[hsl(var(--hero-foreground))]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold shadow-gold">
              <Church className="h-6 w-6 text-gold-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">Giáo Lý Xóm Chiếu</p>
              <p className="text-xs text-[hsl(var(--hero-foreground)/0.82)]">Đoàn Thiếu Nhi Thánh Thể</p>
            </div>
          </div>

          <div className="max-w-xl pb-8">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-gold">Cùng nhau phục vụ</p>
            <h1 className="font-heading text-4xl font-semibold leading-tight text-[hsl(var(--hero-foreground))] xl:text-5xl">
              Đồng hành cùng từng chi đoàn.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[hsl(var(--hero-foreground)/0.84)]">
              Quản lý lớp học, đoàn viên và sinh hoạt trên một không gian chung.
            </p>
          </div>

          <p className="text-xs text-[hsl(var(--hero-foreground)/0.76)]">Giáo xứ Xóm Chiếu · Quận 4 · Thành phố Hồ Chí Minh</p>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-14 xl:px-24" aria-label="Đăng nhập hệ thống">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold shadow-gold">
              <Church className="h-6 w-6 text-gold-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">Giáo Lý Xóm Chiếu</p>
              <p className="text-xs text-muted-foreground">Đoàn Thiếu Nhi Thánh Thể</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-accent">Cổng quản lý nội bộ</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Chào mừng trở lại</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Đăng nhập để tiếp tục quản lý hoạt động giáo lý.</p>
          </div>

          <Card className="border-border/80 shadow-custom-lg">
            <CardHeader className="space-y-1 border-b border-border/70 pb-5">
              <CardTitle className="font-heading text-xl">Đăng nhập</CardTitle>
              <CardDescription>Sử dụng tài khoản được cấp cho nhân sự phụ trách.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="ten@example.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      className="h-11 pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đăng nhập...</> : 'Đăng nhập'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            © 2026 Giáo xứ Xóm Chiếu · Khu vực dành cho Admin, Trưởng ngành và Giáo lý viên.
          </p>
        </div>
      </section>
    </main>
  );
}
