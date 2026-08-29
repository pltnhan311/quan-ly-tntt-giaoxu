import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Bỏ qua đến nội dung chính
      </a>
      <Sidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "md:pl-20" : "md:pl-64")}>
        <Header title={title} subtitle={subtitle} onMenuClick={() => setMobileMenuOpen(true)} />
        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
