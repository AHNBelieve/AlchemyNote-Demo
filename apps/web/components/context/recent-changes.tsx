import { History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Change } from '@/lib/living-context';

export function RecentChanges({ changes }: { changes: Change[] }) {
  return (
    <Card className="h-full p-5">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-[#f0edf6] text-[#756b9d]">
          <History size={15} />
        </span>
        <div>
          <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#99959b] uppercase">
            Recent progress
          </p>
          <h2 className="mt-0.5 mb-0 text-[14px] font-bold">What changed</h2>
        </div>
      </div>

      <ol className="m-0 list-none space-y-0 p-0">
        {changes.slice(0, 4).map((change, index) => (
          <li key={change.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < Math.min(changes.length, 4) - 1 && (
              <span className="absolute top-3 left-[4px] h-full w-px bg-[#e2dfda]" />
            )}
            <span className="relative mt-1.5 size-[9px] shrink-0 rounded-full border-2 border-white bg-[#8378aa] shadow-[0_0_0_1px_#cfc9df]" />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="m-0 text-[11px] font-semibold leading-4 text-[#4d4951]">
                  {change.title}
                </p>
                <span className="shrink-0 text-[8px] text-[#aaa6ad]">
                  {change.createdAt}
                </span>
              </div>
              {change.detail && (
                <p className="mt-1 mb-0 text-[9px] leading-4 text-[#97939a]">
                  {change.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
