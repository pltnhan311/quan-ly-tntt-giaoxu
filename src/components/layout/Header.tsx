import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <h1 className="font-heading text-lg font-semibold text-foreground md:text-xl">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      
      <div aria-hidden="true" className="hidden h-2 w-24 rounded-full bg-primary/10 sm:block" />
    </header>
  );
}
