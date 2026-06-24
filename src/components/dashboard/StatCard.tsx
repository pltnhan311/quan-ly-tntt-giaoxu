import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'gold' | 'primary';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card variant={variant === 'gold' ? 'gold' : 'elevated'} className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={title}>{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{value}</p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate" title={subtitle}>{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs sm:text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}% so với tuần trước
              </p>
            )}
          </div>
          <div className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl",
            variant === 'gold' ? "bg-accent/20" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6",
              variant === 'gold' ? "text-accent" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
