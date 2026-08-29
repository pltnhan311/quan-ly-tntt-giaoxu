import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GraduationCap, LogOut } from 'lucide-react';
import { navigationGroups } from './navigation';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const location = useLocation();
  const { user, signOut, hasRole, userRole } = useAuth();
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Người dùng';
  const roleLabel = userRole === 'admin' ? 'Quản trị viên' : userRole === 'truong_nganh' ? 'Trưởng Ngành' : 'Giáo lý viên';

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border p-4">
          <SheetTitle className="flex items-center gap-3 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
              <GraduationCap className="h-6 w-6 text-gold-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-heading text-lg font-semibold">Giáo Lý</span>
              <span className="text-xs text-sidebar-foreground/60">Xóm Chiếu</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {user && (
          <div className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        <nav aria-label="Điều hướng chính" className="flex-1 space-y-5 overflow-y-auto p-4">
          {navigationGroups.map((group) => {
            const groupItems = group.items.filter(item => hasRole(item.roles));
            if (groupItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                  {group.label}
                </p>
                {groupItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-sidebar-primary')} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            aria-label="Đăng xuất"
            className="min-h-11 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
            Đăng xuất
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
