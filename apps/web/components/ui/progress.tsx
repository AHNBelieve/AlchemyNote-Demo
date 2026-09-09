import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full bg-[#efeee9]', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <div
        className={cn(
          'h-full rounded-full bg-[#697f73] transition-[width] duration-700 ease-out',
          indicatorClassName,
        )}
        style={{ width: safeValue + '%' }}
      />
    </div>
  );
}
