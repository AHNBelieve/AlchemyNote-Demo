'use client';

import { ArrowRight, Sparkles, X } from 'lucide-react';
import { GoalChecklist, ProgressTopicList } from '@/components/context-structure';
import type { ContextCandidate } from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

export function GenerativeContextCard({
  candidate,
  onPreview,
  onDismiss,
}: {
  candidate: ContextCandidate;
  onPreview: (candidate: ContextCandidate) => void;
  onDismiss: () => void;
}) {
  const color = getContextColor(candidate.colorKey);

  return (
    <aside
      className="context-suggestion message-arrive"
      style={{
        '--context-accent': color.accent,
        '--context-rgb': color.rgb,
      } as React.CSSProperties}
    >
      <div className="suggestion-head">
        <span className="suggestion-icon"><Sparkles size={16} /></span>
        <div>
          <p className="eyebrow">계속 관리해볼 만한 이야기 같아요</p>
          <h3>이 이야기를 하나의 Context로 이어갈까요?</h3>
        </div>
        <button className="icon-button" type="button" onClick={onDismiss} aria-label="Context 제안 닫기">
          <X size={16} />
        </button>
      </div>

      <div className="suggestion-body">
        <div className="candidate-title-row">
          <span className="accent-dot" />
          <strong>{candidate.title}</strong>
          <span className="color-name">{color.label}</span>
        </div>
        <div className="candidate-fields">
          <div>
            <span>Goal</span>
            <GoalChecklist items={candidate.goalItems} compact />
          </div>
          <div>
            <span>Current Progress</span>
            <ProgressTopicList topics={candidate.progressTopics} compact />
          </div>
        </div>
      </div>

      <button className="accent-button suggestion-cta" type="button" onClick={() => onPreview(candidate)}>
        Context로 발전시키기
        <ArrowRight size={16} />
      </button>
    </aside>
  );
}
