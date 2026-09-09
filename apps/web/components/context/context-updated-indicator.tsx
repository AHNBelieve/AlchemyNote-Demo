import { Check, Sparkles } from 'lucide-react';

export function ContextUpdatedIndicator({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div
      className="context-toast pointer-events-none absolute top-20 right-5 z-20 flex items-center gap-2 rounded-full border border-[#d4dfd8] bg-white/95 px-3 py-2 text-[10px] font-semibold text-[#587063] shadow-[0_10px_32px_rgba(44,51,47,0.12)] backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <span className="grid size-5 place-items-center rounded-full bg-[#e5eee8] text-[#617a6c]">
        <Check size={11} />
      </span>
      {count === 1 ? 'Context updated' : count + ' updates detected'}
      <Sparkles size={10} className="text-[#7b70a2]" />
    </div>
  );
}
