import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'pending' | 'progress' | 'completed' | 'delayed';
}

const variantStyles = {
  default: 'border-border',
  pending: 'border-destructive/30',
  progress: 'border-warning/30',
  completed: 'border-success/30',
  delayed: 'border-destructive/50 animate-pulse',
};

const iconStyles = {
  default: 'bg-primary/20 text-primary',
  pending: 'bg-destructive/20 text-destructive',
  progress: 'bg-warning/20 text-warning',
  completed: 'bg-success/20 text-success',
  delayed: 'bg-destructive/30 text-destructive',
};

export const KPICard = ({ title, value, icon: Icon, trend, variant = 'default' }: KPICardProps) => {
  return (
    <div className={cn("kpi-card border", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
          {trend && (
            <p className={cn(
              "text-sm mt-2",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
