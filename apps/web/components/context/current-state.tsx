import { Flag, Layers3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { LivingContext } from '@/lib/living-context';

export function CurrentState({ context }: { context: LivingContext }) {
  return (
    <div className="grid grid-cols-2 gap-3 max-[1240px]:grid-cols-1 min-[761px]:max-[1050px]:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-[#edf1ee] text-[#65786e]">
            <Layers3 size={15} />
          </span>
          <div>
            <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#98949a] uppercase">
              Current state
            </p>
            <h2 className="mt-0.5 mb-0 text-[14px] font-bold">Where things stand</h2>
          </div>
        </div>
        <p className="m-0 text-[12px] leading-[1.75] text-[#5f5b63]">
          {context.currentState}
        </p>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-[#f0edf6] text-[#756b9d]">
            <Flag size={15} />
          </span>
          <div>
            <p className="m-0 text-[9px] font-bold tracking-[0.12em] text-[#98949a] uppercase">
              Current goal
            </p>
            <h2 className="mt-0.5 mb-0 text-[14px] font-bold">What success looks like</h2>
          </div>
        </div>
        <p className="m-0 text-[12px] leading-[1.75] text-[#5f5b63]">
          {context.goal}
        </p>
      </Card>
    </div>
  );
}
