'use client';

import { ArrowRight, MessagesSquare, Sparkles } from 'lucide-react';
import type { ConversationTool, LivingContext } from '@/lib/living-context';

export function ContextTransitionCard({
  tool,
  activeContext,
  targetContext,
  onAccept,
  onDismiss,
}: {
  tool: Exclude<ConversationTool, { type: 'none' }>;
  activeContext: LivingContext;
  targetContext: LivingContext | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const destination = tool.type === 'offer_context' && targetContext
    ? targetContext.title
    : 'General Chat';

  return (
    <section className="context-transition-card message-arrive" aria-live="polite">
      <div className="transition-heading">
        <span className="transition-icon"><Sparkles size={15} /></span>
        <div>
          <p className="eyebrow">Conversation switch</p>
          <h3>주제가 바뀐 것 같아요</h3>
        </div>
      </div>

      <div className="transition-route" aria-label={`${activeContext.title}에서 ${destination}(으)로 전환`}>
        <span>{activeContext.title}</span>
        <ArrowRight size={15} />
        <strong><MessagesSquare size={14} /> {destination}</strong>
      </div>

      <div className="transition-copy">
        <strong>{tool.detectedTopic}</strong>
        <p>{tool.reason}</p>
      </div>

      <div className="transition-actions">
        <button className="secondary-button" type="button" onClick={onDismiss}>
          현재 Context 유지
        </button>
        <button className="transition-accept-button" type="button" onClick={onAccept}>
          {destination}(으)로 전환
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
