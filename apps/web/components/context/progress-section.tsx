import { MetricCard } from '@/components/context/metric-card';
import type { Metric, MetricKey } from '@/lib/living-context';

export function ProgressSection({
  metrics,
  updatedMetrics,
}: {
  metrics: Metric[];
  updatedMetrics: MetricKey[];
}) {
  return (
    <section aria-labelledby="progress-heading">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="m-0 text-[9px] font-bold tracking-[0.14em] text-[#99959b] uppercase">
            Progress
          </p>
          <h2 id="progress-heading" className="mt-1 mb-0 text-[16px] font-bold">
            Core signals
          </h2>
        </div>
        <span className="text-[9px] text-[#a19da3]">Updated from conversation</span>
      </div>
      <div className="grid grid-cols-3 gap-3 max-[1240px]:grid-cols-1 min-[761px]:max-[1050px]:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            updated={updatedMetrics.includes(metric.key)}
          />
        ))}
      </div>
    </section>
  );
}
