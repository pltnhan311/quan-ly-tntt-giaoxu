import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Shield,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles: UserRole[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const staffRoles: UserRole[] = ['admin', 'truong_nganh', 'glv'];

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Điều hành',
    items: [
      { icon: LayoutDashboard, label: 'Tổng quan', path: '/dashboard', roles: staffRoles },
      { icon: CalendarDays, label: 'Niên khóa', path: '/academic-years', roles: ['admin'] },
      { icon: GraduationCap, label: 'Chi đoàn', path: '/classes', roles: staffRoles },
    ],
  },
  {
    label: 'Nhân sự',
    items: [
      { icon: Users, label: 'Đoàn viên', path: '/students', roles: staffRoles },
      { icon: UserCheck, label: 'Giáo lý viên', path: '/catechists', roles: ['admin', 'truong_nganh'] },
      { icon: Shield, label: 'Người dùng', path: '/users', roles: ['admin'] },
    ],
  },
  {
    label: 'Dạy giáo lý',
    items: [
      { icon: ClipboardCheck, label: 'Điểm danh', path: '/attendance', roles: staffRoles },
      { icon: Star, label: 'Điểm số', path: '/scores', roles: staffRoles },
      { icon: BookOpen, label: 'Tài liệu', path: '/materials', roles: staffRoles },
    ],
  },
  {
    label: 'Phân tích',
    items: [
      { icon: BarChart3, label: 'Báo cáo', path: '/reports', roles: ['admin', 'truong_nganh'] },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { icon: Settings, label: 'Cài đặt', path: '/settings', roles: ['admin'] },
    ],
  },
];
