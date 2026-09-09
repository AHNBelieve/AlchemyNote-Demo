import { Check, Circle, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ActionItem } from '@/lib/living-context';
import { cn } from '@/lib/utils';

export function NextActions({
  actions,
  onToggle,
}: {
  actions: ActionItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-[#ebe9e4] px-5 py-4">
        <span className="grid size-8 place-items-center rounded-xl bg-[#e9efeb] text-[#627a6c]">
          <ListChecks size={15} />
        </span>
        <div>
          <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#99959b] uppercase">
            Next actions
          </p>
          <h2 className="mt-0.5 mb-0 text-[14px] font-bold">Keep momentum</h2>
        </div>
      </div>

      <div className="divide-y divide-[#eeece7]">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="group flex w-full items-start gap-3 bg-white px-5 py-4 text-left transition hover:bg-[#fafaf7]"
            onClick={() => onToggle(action.id)}
            aria-pressed={action.completed}
          >
            <span
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition',
                action.completed
                  ? 'border-[#6b8274] bg-[#6b8274] text-white'
                  : 'border-[#cbc8c1] text-transparent group-hover:border-[#8c8790]',
              )}
            >
              {action.completed ? <Check size={11} /> : <Circle size={8} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] font-bold tracking-[0.08em] text-[#857c9c] uppercase">
                {action.horizon}
              </span>
              <span
                className={cn(
                  'block text-[12px] font-semibold text-[#48454d]',
                  action.completed && 'text-[#aaa6ac] line-through',
                )}
              >
                {action.title}
              </span>
              {action.detail && (
                <span className="mt-1 block text-[10px] leading-4 text-[#969299]">
                  {action.detail}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
