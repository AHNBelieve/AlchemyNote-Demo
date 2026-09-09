'use client';

import { ArrowLeft, ArrowRight, CheckSquare2, Clock3, MessageCircle, Plus, Sparkles, Target, TrendingUp } from 'lucide-react';
import { GoalChecklist, ProgressTopicList } from '@/components/context-structure';
import type { LivingContext } from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

export function ContextsView({
  contexts,
  selectedContextId,
  onSelectContext,
  onBackToList,
  onStartChat,
  onToggleGoal,
  pendingGoalIds,
}: {
  contexts: LivingContext[];
  selectedContextId: string | null;
  onSelectContext: (id: string) => void;
  onBackToList: () => void;
  onStartChat: (contextId?: string) => void;
  onToggleGoal: (contextId: string, goalId: string) => void;
  pendingGoalIds: string[];
}) {
  const selected = contexts.find((context) => context.id === selectedContextId);
  if (selected) {
    return <ContextDetail
      context={selected}
      onBack={onBackToList}
      onStartChat={() => onStartChat(selected.id)}
      onToggleGoal={(goalId) => onToggleGoal(selected.id, goalId)}
      pendingGoalIds={pendingGoalIds}
    />;
  }

  return (
    <section className="contexts-view scroll-area">
      <div className="contexts-container">
        <header className="contexts-heading">
          <div>
            <p className="eyebrow">Living memory</p>
            <h1>Your Contexts</h1>
            <p>목표와 현재 상태가 대화에 따라 함께 움직이는, 당신만의 지속적인 이야기입니다.</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => onStartChat()}><Plus size={15} /> 대화 시작하기</button>
        </header>

        {contexts.length === 0 ? (
          <div className="contexts-empty">
            <span className="empty-context-icon"><Sparkles size={22} /></span>
            <p className="eyebrow">No contexts yet</p>
            <h2>먼저 대화를 시작해 보세요.</h2>
            <p>Alchemy가 계속 이어갈 가치가 있는 이야기를 발견하면, 저장하기 전에 먼저 보여드릴게요.</p>
            <button className="accent-button neutral-accent" type="button" onClick={() => onStartChat()}><MessageCircle size={15} /> General Chat 열기</button>
          </div>
        ) : (
          <div className="context-grid">
            {contexts.map((context) => {
              const color = getContextColor(context.colorKey);
              return (
                <button
                  key={context.id}
                  type="button"
                  className="context-list-card"
                  onClick={() => onSelectContext(context.id)}
                  style={{ '--card-rgb': color.rgb, '--card-accent': color.accent } as React.CSSProperties}
                >
                  <div className="context-card-top"><span className="accent-dot" /><span>{formatUpdated(context.updatedAt)}</span></div>
                  <h2>{context.title}</h2>
                  <p className="context-card-goal"><CheckSquare2 size={14} /> {context.goalItems.filter((item) => item.completed).length}/{context.goalItems.length} Goal 완료</p>
                  <div className="context-card-state">
                    <span>Current Progress</span>
                    <p>{context.progressTopics[0]?.summary ?? context.currentState}</p>
                    {context.progressTopics.length > 1 ? <small>+ {context.progressTopics.length - 1}개 하위 주제</small> : null}
                  </div>
                  <div className="context-card-link">Context 열기 <ArrowRight size={15} /></div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ContextDetail({
  context,
  onBack,
  onStartChat,
  onToggleGoal,
  pendingGoalIds,
}: {
  context: LivingContext;
  onBack: () => void;
  onStartChat: () => void;
  onToggleGoal: (goalId: string) => void;
  pendingGoalIds: string[];
}) {
  const color = getContextColor(context.colorKey);
  return (
    <section className="context-detail scroll-area" style={{ '--detail-rgb': color.rgb, '--detail-accent': color.accent } as React.CSSProperties}>
      <div className="detail-container">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={15} /> 모든 Contexts</button>
        <header className="detail-header">
          <div><span className="detail-dot" /><p className="eyebrow">Living Context</p></div>
          <h1>{context.title}</h1>
          <p>{formatUpdated(context.updatedAt)}</p>
        </header>

        {context.recentUpdate ? (
          <section className="detail-update">
            <div><Sparkles size={15} /><span>Recent Update</span></div>
            <h2>{context.recentUpdate.summary}</h2>
            <p>{context.recentUpdate.reason}</p>
          </section>
        ) : null}

        <div className="detail-sections">
          <section>
            <div className="detail-label"><Target size={16} /> Goal</div>
            <GoalChecklist items={context.goalItems} onToggle={onToggleGoal} pendingGoalIds={pendingGoalIds} />
          </section>
          <section>
            <div className="detail-label"><TrendingUp size={16} /> Current Progress</div>
            <ProgressTopicList topics={context.progressTopics} />
          </section>
        </div>

        <footer className="detail-footer">
          <span><Clock3 size={14} /> Created {formatDate(context.createdAt)}</span>
          <button className="accent-button" type="button" onClick={onStartChat}>이 Context로 대화하기 <ArrowRight size={15} /></button>
        </footer>
      </div>
    </section>
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
