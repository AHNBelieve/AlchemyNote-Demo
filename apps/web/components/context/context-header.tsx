import { CircleDot, Clock3, Focus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { LivingContext } from '@/lib/living-context';

export function ContextHeader({ context }: { context: LivingContext }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7eee9] text-[#60786a] shadow-[inset_0_0_0_1px_rgba(104,128,114,0.1)]">
            <CircleDot size={23} strokeWidth={1.8} />
          </span>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.12em] text-[#9a969c] uppercase">
                Living context
              </span>
              <Badge className="border-[#dbe4de] bg-[#f2f6f3] py-0.5 text-[9px] text-[#6d8276]">
                Active
              </Badge>
            </div>
            <h1 className="m-0 text-[30px] font-semibold tracking-[-0.045em] text-[#242229]">
              {context.title}
            </h1>
            <p className="mt-1 mb-0 text-[12px] text-[#77737b]">
              {context.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-2 text-[10px] font-medium text-[#969299]">
          <Clock3 size={12} />
          Last updated · {context.updatedAt}
        </div>
      </div>

      <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#dddbe4] bg-[linear-gradient(120deg,#f7f5fb,#f2f5f2)] p-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-[#71699a] shadow-sm">
          <Focus size={15} />
        </span>
        <div>
          <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#918a9d] uppercase">
            Current focus
          </p>
          <p className="mt-1 mb-0 text-[13px] font-semibold text-[#423e49]">
            {context.focus}
          </p>
        </div>
      </div>
    </div>
  );
}
