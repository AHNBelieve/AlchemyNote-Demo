'use client';

import { ArrowUpRight, CircleX, Clock3, Target, TrendingUp, X } from 'lucide-react';
import { GoalChecklist, ProgressTopicList } from '@/components/context-structure';
import type { LivingContext } from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

export function ActiveProjectPanel({
  context,
  onOpenContext,
  onDeactivate,
  onClose,
  onToggleGoal,
  pendingGoalIds,
}: {
  context: LivingContext;
  onOpenContext: (contextId: string) => void;
  onDeactivate: () => void;
  onClose?: () => void;
  onToggleGoal: (goalId: string) => void;
  pendingGoalIds: string[];
}) {
  const color = getContextColor(context.colorKey);

  return (
    <aside
      className="active-context-panel scroll-area"
      style={{ '--panel-rgb': color.rgb } as React.CSSProperties}
      aria-label="활성 Context 진행 상황"
    >
      <div className="panel-topline">
        <span><i style={{ backgroundColor: color.accent }} /> Active Context</span>
        {onClose ? (
          <button className="icon-button panel-close" type="button" onClick={onClose} aria-label="Context 패널 닫기"><X size={16} /></button>
        ) : null}
      </div>

      <div className="panel-title">
        <h2>{context.title}</h2>
        <p>이 대화와 함께 계속 해석되는 현재 상태</p>
      </div>

      {context.recentUpdate ? (
        <section className="context-update-callout">
          <div><TrendingUp size={15} /><span>Context updated</span></div>
          <p>{context.recentUpdate.summary}</p>
        </section>
      ) : null}

      <section className="panel-section">
        <div className="panel-section-label"><Target size={15} /> Goal</div>
        <GoalChecklist items={context.goalItems} onToggle={onToggleGoal} pendingGoalIds={pendingGoalIds} compact />
      </section>

      <section className="panel-section progress-section">
        <div className="panel-section-label"><TrendingUp size={15} /> Current Progress</div>
        <ProgressTopicList topics={context.progressTopics} compact />
      </section>

      <div className="panel-updated"><Clock3 size={13} /> {formatUpdated(context.updatedAt)}</div>

      <div className="panel-actions">
        <button className="panel-primary" type="button" onClick={() => onOpenContext(context.id)}>
          Context 전체 보기 <ArrowUpRight size={15} />
        </button>
        <button className="panel-secondary" type="button" onClick={onDeactivate}>
          <CircleX size={15} /> General Chat으로 전환
        </button>
      </div>
    </aside>
  );
}

function formatUpdated(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return `Updated ${value}`;
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  if (minutes < 1_440) return `Updated ${Math.round(minutes / 60)}h ago`;
  return `Updated ${Math.round(minutes / 1_440)}d ago`;
}
