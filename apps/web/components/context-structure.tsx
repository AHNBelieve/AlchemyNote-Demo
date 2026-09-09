'use client';

import { Check, LoaderCircle } from 'lucide-react';
import type { ContextGoalItem, ContextProgressTopic, ProgressStatus } from '@/lib/living-context';

const statusLabels: Record<ProgressStatus, string> = {
  not_started: '시작 전',
  in_progress: '진행 중',
  improving: '좋아지는 중',
  blocked: '막힘',
  completed: '완료',
};

export function GoalChecklist({
  items,
  onToggle,
  pendingGoalIds = [],
  compact = false,
}: {
  items: ContextGoalItem[];
  onToggle?: (goalId: string) => void;
  pendingGoalIds?: string[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'goal-checklist compact' : 'goal-checklist'}>
      {items.map((item) => {
        const pending = pendingGoalIds.includes(item.id);
        return (
          <div key={item.id} className={item.completed ? 'goal-check-row completed' : 'goal-check-row'}>
            <button
              className="goal-checkbox"
              type="button"
              role="checkbox"
              aria-checked={item.completed}
              aria-label={`${item.title} ${item.completed ? '완료 취소' : '완료로 표시'}`}
              disabled={!onToggle || pending}
              onClick={() => onToggle?.(item.id)}
            >
              {pending ? <LoaderCircle className="goal-saving" size={13} /> : item.completed ? <Check size={13} /> : null}
            </button>
            <span>{item.title}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressTopicList({
  topics,
  compact = false,
}: {
  topics: ContextProgressTopic[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'progress-topic-list compact' : 'progress-topic-list'}>
      {topics.map((topic) => (
        <article key={topic.id} className={`progress-topic status-${topic.status}`}>
          <div className="progress-topic-head">
            <strong>{topic.title}</strong>
            <span><i />{statusLabels[topic.status]}</span>
          </div>
          <p>{topic.summary}</p>
        </article>
      ))}
    </div>
  );
}
