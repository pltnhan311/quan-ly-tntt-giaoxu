import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, GraduationCap, LogOut } from 'lucide-react';
import { navigationGroups } from './navigation';

export interface SidebarProps {
  collapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapseChange }: SidebarProps) {
  const location = useLocation();
  const { user, signOut, hasRole, userRole } = useAuth();
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Người dùng';
  const roleLabel = userRole === 'admin' ? 'Quản trị viên' : userRole === 'truong_nganh' ? 'Trưởng Ngành' : 'Giáo lý viên';

  return (
    <aside
      aria-label="Thanh điều hướng chính"
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/dashboard" className={cn('flex items-center gap-3', collapsed && 'mx-auto')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-gold">
            <GraduationCap className="h-6 w-6 text-gold-foreground" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="font-heading text-lg font-semibold">Giáo Lý</span>
              <span className="text-xs text-sidebar-foreground/60">Xóm Chiếu</span>
            </div>
          )}
        </Link>
      </div>

      <nav aria-label="Điều hướng chính" className="flex-1 space-y-5 overflow-y-auto p-4">
        {navigationGroups.map((group) => {
          const groupItems = group.items.filter(item => hasRole(item.roles));
          if (groupItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                  {group.label}
                </p>
              )}
              {groupItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-sidebar-primary')} aria-hidden="true" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={signOut}
          aria-label="Đăng xuất"
          className={cn('min-h-11 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground', collapsed ? 'w-full' : 'w-full justify-start')}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {!collapsed && <span className="ml-2">Đăng xuất</span>}
        </Button>
      </div>

      <button
        type="button"
        aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        onClick={() => onCollapseChange(!collapsed)}
        className="absolute -right-4 top-20 flex h-9 w-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
      </button>
    </aside>
  );
}
