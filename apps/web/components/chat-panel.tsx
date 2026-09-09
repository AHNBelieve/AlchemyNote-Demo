'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  CircleDot,
  PanelRightOpen,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { ContextTransitionCard } from '@/components/context-transition-card';
import { GenerativeContextCard } from '@/components/generative-context-card';
import type {
  ChatMessage as ChatMessageType,
  ConversationTool,
  ContextCandidate,
  ContextIntent,
  LivingContext,
} from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

const footballPrompt = '요즘 축구 다시 시작했어. 리프팅 목표는 100개인데 오늘 84개 했고, 왼발 터치가 아직 불안정한 것 같아.';

export interface ChatNotice {
  message: string;
  contextId: string;
  summary?: string;
}

export function ChatPanel({
  messages,
  contexts,
  isSending,
  pendingIntent,
  pendingConversationTool,
  notice,
  activeContext,
  onSubmit,
  onPreviewContext,
  onViewContext,
  onDismissIntent,
  onSelectContext,
  onOpenContextPanel,
  onAcceptTransition,
  onDismissTransition,
  onResetSession,
}: {
  messages: ChatMessageType[];
  contexts: LivingContext[];
  isSending: boolean;
  pendingIntent: ContextIntent | null;
  pendingConversationTool: ConversationTool;
  notice: ChatNotice | null;
  activeContext: LivingContext | null;
  onSubmit: (message: string) => Promise<void>;
  onPreviewContext: (candidate: ContextCandidate) => void;
  onViewContext: (contextId: string) => void;
  onDismissIntent: () => void;
  onSelectContext: (contextId: string | null) => void;
  onOpenContextPanel: () => void;
  onAcceptTransition: () => void;
  onDismissTransition: () => void;
  onResetSession: () => void;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const accent = activeContext ? getContextColor(activeContext.colorKey) : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending, pendingConversationTool, pendingIntent, notice]);

  const transitionTarget = pendingConversationTool.type === 'offer_context'
    ? contexts.find((context) => context.id === pendingConversationTool.targetContextId) ?? null
    : null;

  async function send(message = draft) {
    const next = message.trim();
    if (!next || isSending) return;
    setDraft('');
    await onSubmit(next);
    textareaRef.current?.focus();
  }

  return (
    <section className="chat-panel" aria-label="General AI conversation">
      <header className="conversation-header">
        <div>
          <p className="conversation-kicker">{activeContext ? 'Talking about' : 'Home'}</p>
          <h1>{activeContext ? activeContext.title : 'General Chat'}</h1>
        </div>

        <div className="context-controls">
          {contexts.length ? (
            <label className="context-select" style={accent ? { '--select-accent': accent.accent } as React.CSSProperties : undefined}>
              <CircleDot size={14} />
              <select
                value={activeContext?.id ?? ''}
                onChange={(event) => onSelectContext(event.target.value || null)}
                aria-label="활성 Context 변경"
              >
                <option value="">General Chat</option>
                {contexts.map((context) => <option key={context.id} value={context.id}>{context.title}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
          ) : (
            <span className="general-badge"><CircleDot size={13} /> General</span>
          )}
          {activeContext ? (
            <button className="panel-open-button" type="button" onClick={onOpenContextPanel} aria-label="Context Progress 열기">
              <PanelRightOpen size={15} />
              <span>Progress</span>
            </button>
          ) : null}
          <button className="session-reset-button" type="button" onClick={onResetSession} aria-label="대화 세션 초기화">
            <RotateCcw size={14} />
            <span>새 대화</span>
          </button>
        </div>
      </header>

      <div className="conversation-scroll scroll-area">
        <div className="conversation-inner">
          {messages.length <= 1 ? (
            <section className="general-empty-state">
              <span className="alchemy-orb"><Sparkles size={21} /></span>
              <p className="eyebrow">General conversation</p>
              <h2>아직 이름 붙지 않은 이야기부터<br />편하게 시작해 보세요.</h2>
              <p className="empty-copy">Alchemy는 모든 대화를 저장하지 않아요. 오래 이어질 만한 목표와 변화가 보일 때만 Context를 제안합니다.</p>
              <button type="button" className="starter-prompt" onClick={() => {
                setDraft(footballPrompt);
                textareaRef.current?.focus();
              }}>
                <span>Demo prompt</span>
                “축구를 다시 시작했는데, 리프팅 목표는 100개야…”
              </button>
            </section>
          ) : null}

          <div className="messages-list">
            {messages.map((message) => <ChatMessage key={message.id} message={message} />)}

            {notice ? (
              <button className="context-notice message-arrive" type="button" onClick={() => onViewContext(notice.contextId)}>
                <span className="notice-mark"><Sparkles size={14} /></span>
                <span>
                  <strong>{notice.message}</strong>
                  {notice.summary ? <small>{notice.summary}</small> : null}
                </span>
                <span className="notice-link">보기</span>
              </button>
            ) : null}

            {pendingConversationTool.type !== 'none' && activeContext ? (
              <ContextTransitionCard
                tool={pendingConversationTool}
                activeContext={activeContext}
                targetContext={transitionTarget}
                onAccept={onAcceptTransition}
                onDismiss={onDismissTransition}
              />
            ) : null}

            {isSending ? (
              <div className="thinking-row message-arrive">
                <span className="assistant-mark"><Sparkles size={14} /></span>
                <span className="thinking-bubble"><i /><i /><i /><em>대화와 맥락을 함께 살펴보는 중</em></span>
              </div>
            ) : null}

            {pendingIntent?.type === 'suggest_new' && pendingIntent.candidate ? (
              <GenerativeContextCard
                candidate={pendingIntent.candidate}
                onPreview={onPreviewContext}
                onDismiss={onDismissIntent}
              />
            ) : null}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      <div className="composer-wrap">
        <form className="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={activeContext ? `${activeContext.title}에 대해 계속 이야기하세요…` : '무엇이든 편하게 이야기하세요…'}
            aria-label="AlchemyNote 메시지"
            disabled={isSending}
          />
          <div className="composer-footer">
            <span>Shift + Enter로 줄바꿈</span>
            <button type="submit" disabled={!draft.trim() || isSending} aria-label="메시지 보내기"><ArrowUp size={17} /></button>
          </div>
        </form>
        <p className="composer-caption">AlchemyNote는 중요한 변화를 발견하면 Context의 현재 상태를 다시 해석합니다.</p>
      </div>
    </section>
  );
}
