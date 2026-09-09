import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  ListChecks,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type {
  ContextWidget,
  LivingContext,
  WidgetTone,
} from '@/lib/living-context';
import { getProjectTheme } from '@/lib/project-theme';

const toneStyles: Record<WidgetTone, {
  shell: string;
  accent: string;
  progress: string;
}> = {
  sage: {
    shell: 'bg-[#f1f5f1] text-[#557062]',
    accent: 'text-[#607a6b]',
    progress: 'bg-[#6d8778]',
  },
  violet: {
    shell: 'bg-[#f3f0f8] text-[#6e6392]',
    accent: 'text-[#73689a]',
    progress: 'bg-[#786ea0]',
  },
  blue: {
    shell: 'bg-[#eef3f6] text-[#5f7484]',
    accent: 'text-[#637d8e]',
    progress: 'bg-[#708a9a]',
  },
  amber: {
    shell: 'bg-[#f7f2e8] text-[#897044]',
    accent: 'text-[#8b7249]',
    progress: 'bg-[#9a7e4c]',
  },
};

export function ContextDashboard({
  context,
  onBack,
  onToggleAction,
}: {
  context: LivingContext;
  onBack: () => void;
  onToggleAction: (contextId: string, actionId: string) => void;
}) {
  const projectTheme = getProjectTheme(context.theme);

  return (
    <div className="apple-project-dashboard scroll-area h-full overflow-y-auto bg-[#000000]">
      <div className="mx-auto w-full max-w-[1080px] px-5 py-6 sm:px-8 sm:py-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-5">
          <ArrowLeft size={14} />
          모든 Contexts
        </Button>

        <header className="mb-8 flex flex-col gap-5 border-b border-[#dedcd6] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-[22px] border text-2xl shadow-sm"
              style={{
                backgroundColor: projectTheme.soft,
                borderColor: projectTheme.border,
                color: projectTheme.accent,
              }}
            >
              {context.emoji}
            </span>
            <div>
              <p className="m-0 text-[10px] font-bold tracking-[0.11em] text-[#928e95] uppercase">
                Living Context
              </p>
              <h1 className="mt-1 mb-0 text-[30px] font-bold tracking-[-0.055em] text-[#29272d]">
                {context.title}
              </h1>
              <p className="mt-1.5 mb-0 max-w-2xl text-[13px] leading-5 text-[#76727a]">
                {context.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-[#908c93]">
            <span className="size-1.5 rounded-full bg-[#789080]" />
            Updated {context.updatedAt}
          </div>
        </header>

        {context.focus ? (
          <section
            className="mb-6 rounded-[24px] border px-6 py-5"
            style={{ background: projectTheme.gradient, borderColor: projectTheme.border }}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"
                style={{ color: projectTheme.accent }}
              >
                <Target size={14} />
              </span>
              <div>
                <p className="m-0 text-[9px] font-bold tracking-[0.1em] text-[#9188a7] uppercase">
                  Current focus
                </p>
                <p className="mt-1 mb-0 text-[13px] font-bold text-[#494450]">
                  {context.focus}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="dynamic-view-title">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="m-0 text-[9px] font-bold tracking-[0.11em] text-[#9b969e] uppercase">
                Generated view
              </p>
              <h2 id="dynamic-view-title" className="mt-1 mb-0 text-[15px] font-bold">
                이 Context에 맞춰 생성된 화면
              </h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {context.widgets.map((widget) => (
              <WidgetCard key={widget.id} widget={widget} />
            ))}
          </div>
        </section>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2" style={{ color: projectTheme.accent }}>
                <Flag size={14} />
                <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] uppercase">
                  Goal
                </h2>
              </div>
              <p className="m-0 text-[14px] leading-6 font-semibold text-[#444149]">
                {context.goal}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] text-[#858189] uppercase">
                Current state
              </h2>
              <p className="mt-3 mb-0 text-[13px] leading-6 text-[#57535c]">
                {context.currentState}
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks size={15} className="text-[#677c70]" />
                <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] text-[#747078] uppercase">
                  Next actions
                </h2>
              </div>
              <div className="space-y-2.5">
                {context.nextActions.length ? (
                  context.nextActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-xl border border-[#ebe9e4] bg-[#fafaf8] px-3.5 py-3 text-left transition hover:border-[#d8d5ce] hover:bg-white"
                      onClick={() => onToggleAction(context.id, action.id)}
                    >
                      {action.completed ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#66806f]" />
                      ) : (
                        <Circle size={16} className="mt-0.5 shrink-0 text-[#aaa6ad]" />
                      )}
                      <span>
                        <span className="block text-[11px] font-bold text-[#4d4951]">
                          {action.title}
                        </span>
                        {action.detail ? (
                          <span className="mt-1 block text-[10px] leading-4 text-[#929097]">
                            {action.detail}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="m-0 text-[11px] text-[#969299]">
                    다음 대화에서 작은 행동을 함께 정해볼게요.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={14} className="text-[#81769e]" />
                <h2 className="m-0 text-[11px] font-bold tracking-[0.08em] text-[#747078] uppercase">
                  Recent changes
                </h2>
              </div>
              {context.recentChanges.length ? (
                <div className="space-y-3">
                  {context.recentChanges.slice(0, 5).map((change) => (
                    <div key={change.id} className="flex gap-3">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: projectTheme.accent }}
                      />
                      <div>
                        <p className="m-0 text-[11px] font-semibold text-[#555159]">
                          {change.title}
                        </p>
                        <p className="mt-0.5 mb-0 text-[9px] text-[#aaa6ad]">
                          {change.createdAt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-[11px] text-[#969299]">
                  다음 대화에서 생기는 변화가 여기에 쌓입니다.
                </p>
              )}
            </Card>
          </div>
        </div>

        <p className="mt-8 mb-1 text-center text-[9px] text-[#aaa6ac]">
          Built from conversation · Saved on this device
        </p>
      </div>
    </div>
  );
}

function WidgetCard({ widget }: { widget: ContextWidget }) {
  const tone = toneStyles[widget.tone ?? 'sage'];
  const percentage =
    widget.current !== undefined && widget.max
      ? (widget.current / widget.max) * 100
      : 0;

  if (widget.type === 'list') {
    return (
      <Card className="min-h-40 p-5 md:col-span-2 xl:col-span-1">
        <WidgetHeading widget={widget} />
        <div className="mt-4 space-y-2.5">
          {widget.items?.map((item, index) => (
            <div key={`${item.title}-${index}`} className="flex items-start gap-2.5">
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${tone.shell}`}>
                <Check size={9} />
              </span>
              <div>
                <p className="m-0 text-[11px] font-semibold text-[#514d55]">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 mb-0 text-[9px] leading-4 text-[#969299]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (widget.type === 'timeline') {
    return (
      <Card className="min-h-40 p-5 md:col-span-2 xl:col-span-1">
        <WidgetHeading widget={widget} />
        <div className="mt-4 space-y-0">
          {widget.items?.map((item, index) => (
            <div key={`${item.title}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
              {index < (widget.items?.length ?? 0) - 1 ? (
                <span className="absolute top-3 left-[5px] h-full w-px bg-[#e4e1db]" />
              ) : null}
              <span className={`relative mt-1 size-2.5 shrink-0 rounded-full border-2 border-white ${tone.progress}`} />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[11px] font-semibold text-[#514d55]">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 mb-0 text-[9px] text-[#969299]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[9px] font-medium text-[#918d94]">
                  {item.status ?? item.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-h-40 p-5">
      <WidgetHeading widget={widget} />
      <div className="mt-7">
        {widget.type === 'status' ? (
          <p className={`m-0 text-[18px] leading-6 font-bold tracking-[-0.025em] ${tone.accent}`}>
            {widget.value ?? '관찰 중'}
          </p>
        ) : (
          <div className="flex items-end gap-1.5">
            <span className={`text-[32px] leading-none font-bold tracking-[-0.06em] ${tone.accent}`}>
              {widget.current ?? widget.value ?? '—'}
            </span>
            {widget.max !== undefined ? (
              <span className="pb-0.5 text-[12px] font-semibold text-[#aaa6ad]">
                / {widget.max}
              </span>
            ) : null}
            {widget.unit ? (
              <span className="pb-0.5 text-[10px] font-medium text-[#aaa6ad]">
                {widget.unit}
              </span>
            ) : null}
          </div>
        )}
        {widget.type === 'progress' ? (
          <Progress
            value={percentage}
            className="mt-4 h-2"
            indicatorClassName={tone.progress}
          />
        ) : null}
      </div>
    </Card>
  );
}

function WidgetHeading({ widget }: { widget: ContextWidget }) {
  const tone = toneStyles[widget.tone ?? 'sage'];
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="m-0 text-[10px] font-bold tracking-[0.07em] text-[#77737b] uppercase">
        {widget.title}
      </p>
      <span className={`size-2 rounded-full ${tone.progress}`} />
    </div>
  );
}
