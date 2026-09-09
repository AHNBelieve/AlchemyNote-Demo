import type { ReactNode } from 'react';
import {
  Layers3,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ContextSidebar({
  activeView,
  contextCount,
  collapsed,
  onNavigate,
  onReset,
  onToggle,
}: {
  activeView: 'chat' | 'contexts';
  contextCount: number;
  collapsed: boolean;
  onNavigate: (view: 'chat' | 'contexts') => void;
  onReset: () => void;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        'desktop-sidebar flex min-h-0 flex-col border-r border-[#2a2a2c] bg-black text-white',
        collapsed ? 'p-3' : 'p-4',
      )}
    >
      <div
        className={cn(
          'flex h-20 items-center',
          collapsed ? 'flex-col justify-center gap-2' : 'gap-3 px-1',
        )}
      >
        <span
          className={cn(
            'grid shrink-0 place-items-center bg-[#0066cc] text-white',
            collapsed ? 'size-9 rounded-xl' : 'size-10 rounded-2xl',
          )}
        >
          <Sparkles size={18} />
        </span>
        {!collapsed ? <div className="min-w-0 flex-1">
          <p className="m-0 text-[21px] font-bold tracking-[-0.04em]">AlchemyNote</p>
          <p className="mt-1 mb-0 truncate text-[14px] text-[#cccccc]">Conversation becomes context</p>
        </div> : null}
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full text-[#cccccc] transition hover:bg-[#1d1d1f] hover:text-white"
          onClick={onToggle}
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="mt-6 space-y-2" aria-label="Main navigation">
        <NavButton
          active={activeView === 'chat'}
          icon={<MessageCircle size={18} />}
          label="Chat"
          hint="One open conversation"
          collapsed={collapsed}
          onClick={() => onNavigate('chat')}
        />
        <NavButton
          active={activeView === 'contexts'}
          icon={<Layers3 size={18} />}
          label="Contexts"
          hint={`${contextCount} living contexts`}
          collapsed={collapsed}
          onClick={() => onNavigate('contexts')}
        />
      </nav>

      <div className="mt-auto border-t border-[#2a2a2c] pt-4">
        <Button
          variant="ghost"
          className={cn(
            'h-12 w-full text-[15px] text-[#cccccc]',
            collapsed ? 'justify-center px-0' : 'justify-start px-3',
          )}
          onClick={onReset}
          title="Reset MVP"
        >
          <RotateCcw size={15} />
          {!collapsed ? 'Reset MVP' : null}
        </Button>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  hint,
  collapsed,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  hint: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center rounded-[18px] border text-left transition',
        collapsed
          ? 'min-h-14 justify-center px-0 py-2'
          : 'min-h-[68px] gap-4 px-3.5 py-3',
        active
          ? 'border-[#2a2a2c] bg-[#1d1d1f] text-white'
          : 'border-transparent text-[#cccccc] hover:bg-[#111113]',
      )}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          active ? 'bg-[#0066cc] text-white' : 'bg-[#1d1d1f] text-[#cccccc]',
        )}
      >
        {icon}
      </span>
      {!collapsed ? <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold text-white">{label}</span>
        <span className="mt-1 block text-[14px] text-[#cccccc]">{hint}</span>
      </span> : null}
    </button>
  );
}
