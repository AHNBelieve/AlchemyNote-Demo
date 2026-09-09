import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { Insight } from '@/lib/living-context';

export function AiInsight({ insight }: { insight: Insight }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#dad5e7] bg-[#efecf6] p-5">
      <div className="absolute -top-14 -right-14 size-40 rounded-full bg-white/45 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-white/75 text-[#6f6598] shadow-sm">
              <Sparkles size={15} />
            </span>
            <div>
              <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#89809d] uppercase">
                AI insight
              </p>
              <h2 className="mt-0.5 mb-0 text-[14px] font-bold text-[#443e50]">
                Pattern worth noticing
              </h2>
            </div>
          </div>
          <ArrowUpRight size={15} className="text-[#9a92aa]" />
        </div>
        <p className="m-0 text-[12px] leading-[1.8] font-medium text-[#5d5669]">
          “{insight.text}”
        </p>
        <p className="mt-3 mb-0 text-[9px] text-[#9991a6]">{insight.createdAt}</p>
      </div>
    </section>
  );
}
