import { cn } from '@/lib/utils';

type Variant = 'default' | 'warning' | 'destructive' | 'success';

const variants: Record<Variant, string> = {
  default: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 text-amber-800',
  destructive: 'bg-red-100 text-destructive',
  success: 'bg-green-100 text-green-800',
};

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
