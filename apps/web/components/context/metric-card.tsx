import { ArrowUpRight, Footprints, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Metric } from '@/lib/living-context';
import { cn } from '@/lib/utils';

const toneMap = {
  sage: {
    icon: 'bg-[#e7eee9] text-[#60786a]',
    bar: 'bg-[#697f73]',
    value: 'text-[#536a5e]',
  },
  violet: {
    icon: 'bg-[#efecf6] text-[#756a9c]',
    bar: 'bg-[#7b70a5]',
    value: 'text-[#655b8d]',
  },
  blue: {
    icon: 'bg-[#e9eef4] text-[#61768d]',
    bar: 'bg-[#6a8096]',
    value: 'text-[#566d83]',
  },
} as const;

export function MetricCard({
  metric,
  updated,
}: {
  metric: Metric;
  updated: boolean;
}) {
  const tone = toneMap[metric.tone];
  const progress = (metric.current / metric.target) * 100;
  const Icon = metric.key === 'juggling' ? Trophy : Footprints;

  return (
    <Card className={cn('min-w-0 p-4 transition-all', updated && 'metric-updated')}>
      <div className="mb-5 flex items-center justify-between">
        <span className={cn('grid size-8 place-items-center rounded-xl', tone.icon)}>
          <Icon size={15} />
        </span>
        {metric.previous !== undefined && metric.current > metric.previous && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#6c8376]">
            <ArrowUpRight size={11} />
            {Math.round(((metric.current - metric.previous) / metric.previous) * 100)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="m-0 text-[10px] font-semibold text-[#817d84]">
            {metric.label}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1">
            <strong className={cn('text-[29px] leading-none tracking-[-0.05em]', tone.value)}>
              {metric.current}
            </strong>
            <span className="text-[11px] font-semibold text-[#aaa6ac]">
              {metric.unit === '%' ? '%' : '/ ' + metric.target}
            </span>
          </div>
        </div>
        {metric.unit === '%' && (
          <span className="pb-0.5 text-[9px] text-[#aaa6ac]">of {metric.target}%</span>
        )}
      </div>
      <Progress
        value={progress}
        className="mt-4"
        indicatorClassName={tone.bar}
      />
      <p className="mt-2.5 mb-0 truncate text-[9px] text-[#99959b]">
        {metric.note}
      </p>
    </Card>
  );
}
