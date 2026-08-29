import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 md:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Mở menu điều hướng"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Giáo lý Xóm Chiếu</p>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      
      <div aria-hidden="true" className="hidden h-2 w-24 rounded-full bg-primary/10 sm:block" />
    </header>
  );
}
