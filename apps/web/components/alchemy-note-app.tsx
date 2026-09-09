'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Home, Layers3, Sparkles } from 'lucide-react';
import { ActiveProjectPanel } from '@/components/active-project-panel';
import { ChatPanel, type ChatNotice } from '@/components/chat-panel';
import { ContextPreviewDialog } from '@/components/context-preview-dialog';
import { ContextsView } from '@/components/contexts-view';
import { SessionResetDialog } from '@/components/session-reset-dialog';
import type {
  AssistantMode,
  ChatApiResponse,
  ChatMessage,
  ConversationTool,
  ContextCandidate,
  ContextColor,
  ContextIntent,
  ContextUpdate,
  LivingContext,
  ProjectTheme,
} from '@/lib/living-context';
import { starterMessages } from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

const STORAGE_KEY = 'alchemynote:living-projects:v3';

interface StoredState {
  contexts: LivingContext[];
  messages: ChatMessage[];
  mode: AssistantMode;
  activeContextId: string | null;
}

export function AlchemyNoteApp() {
  const [activeView, setActiveView] = useState<'home' | 'contexts'>('home');
  const [contexts, setContexts] = useState<LivingContext[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [mode, setMode] = useState<AssistantMode>('demo');
  const [isSending, setIsSending] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<ContextIntent | null>(null);
  const [pendingConversationTool, setPendingConversationTool] = useState<ConversationTool>({ type: 'none' });
  const [previewCandidate, setPreviewCandidate] = useState<ContextCandidate | null>(null);
  const [notice, setNotice] = useState<ChatNotice | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [pendingGoalIds, setPendingGoalIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredState> & { activeConversationProjectId?: string | null };
        const normalized = Array.isArray(parsed.contexts) ? parsed.contexts.map(normalizeContext).filter(Boolean) as LivingContext[] : [];
        setContexts(normalized);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(parsed.messages.map(normalizeMessage));
        }
        if (parsed.mode === 'gemini' || parsed.mode === 'demo') setMode(parsed.mode);
        const restoredActiveId = parsed.activeContextId ?? parsed.activeConversationProjectId ?? null;
        if (normalized.some((context) => context.id === restoredActiveId)) setActiveContextId(restoredActiveId);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredState = { contexts, messages, mode, activeContextId };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [activeContextId, contexts, hydrated, messages, mode]);

  const activeContext = useMemo(
    () => contexts.find((context) => context.id === activeContextId) ?? null,
    [activeContextId, contexts],
  );
  const activeColor = activeContext ? getContextColor(activeContext.colorKey) : null;
  const appStyle = activeColor ? {
    '--context-accent': activeColor.accent,
    '--context-rgb': activeColor.rgb,
  } as CSSProperties : undefined;

  async function handleSubmit(content: string) {
    const userMessage: ChatMessage = { id: makeId('user'), role: 'user', content, createdAt: new Date().toISOString() };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setPendingIntent(null);
    setPendingConversationTool({ type: 'none' });
    setNotice(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          contexts,
          activeContextId,
          history: conversation.slice(-12).map(({ role, content: text }) => ({ role, content: text })),
        }),
      });
      if (!response.ok) throw new Error('Context service unavailable');

      const result = await response.json() as ChatApiResponse;
      setMode(result.mode);
      setMessages((current) => [...current, {
        id: makeId('assistant'),
        role: 'assistant',
        content: result.reply,
        createdAt: new Date().toISOString(),
        mode: result.mode,
      }]);

      if (result.conversationTool.type !== 'none') {
        setPendingConversationTool(result.conversationTool);
      }

      if (result.contextIntent.type === 'suggest_new' && result.contextIntent.candidate) {
        setPendingIntent(result.contextIntent);
      } else if (
        (result.contextIntent.type === 'update_active' || result.contextIntent.type === 'update_existing')
        && result.contextIntent.contextId
        && result.contextIntent.update
      ) {
        applyContextUpdate(result.contextIntent.contextId, result.contextIntent.update);
      }
    } catch {
      setMessages((current) => [...current, {
        id: makeId('assistant-error'),
        role: 'assistant',
        content: '잠시 연결이 매끄럽지 않았어요. 어떤 Context도 변경하지 않았으니 한 번만 다시 보내 주세요.',
        createdAt: new Date().toISOString(),
        mode,
      }]);
    } finally {
      setIsSending(false);
    }
  }

  function createContext(candidate: ContextCandidate) {
    const now = new Date().toISOString();
    const id = uniqueId(slugify(candidate.title) || `context-${Date.now()}`, contexts.map((context) => context.id));
    const context: LivingContext = {
      ...candidate,
      id,
      createdAt: now,
      updatedAt: now,
      description: candidate.goal,
      emoji: '✦',
      theme: colorToLegacyTheme(candidate.colorKey),
      widgets: [],
      nextActions: [],
      recentChanges: [],
    };
    setContexts((current) => [...current, context]);
    setActiveContextId(context.id);
    setPendingIntent(null);
    setPreviewCandidate(null);
    setNotice({ message: `${context.title} Context가 시작됐어요.`, contextId: context.id, summary: '이 대화는 이제 Goal과 Current Progress를 함께 이어갑니다.' });
    setMessages((current) => [...current, {
      id: makeId('assistant-context-created'),
      role: 'assistant',
      content: `좋아요. 그럼 앞으로 ${context.title}에 대해서 조금 더 이야기해볼까요? 지금 대화부터 이 Context와 연결해둘게요.`,
      createdAt: now,
      mode,
    }]);
  }

  function applyContextUpdate(contextId: string, update: ContextUpdate) {
    const now = new Date().toISOString();
    setContexts((current) => current.map((context) => context.id === contextId ? {
      ...context,
      goal: update.goal ?? context.goal,
      currentState: update.currentState ?? context.currentState,
      goalItems: update.goalItems ?? context.goalItems,
      progressTopics: update.progressTopics ?? context.progressTopics,
      updatedAt: now,
      recentUpdate: {
        id: makeId('context-update'),
        summary: update.summary,
        reason: update.reason,
        goalChanged: update.goalChanged,
        createdAt: now,
      },
    } : context));
    const context = contexts.find((item) => item.id === contextId);
    setActiveContextId(contextId);
    setPendingIntent(null);
    setNotice({
      message: update.goalChanged ? `${context?.title ?? '현재'} Context의 Goal이 변경됐어요.` : `${context?.title ?? '현재'} Context가 업데이트됐어요.`,
      contextId,
      summary: update.summary,
    });
  }

  function navigate(view: 'home' | 'contexts') {
    setActiveView(view);
    setSelectedContextId(null);
    setMobilePanelOpen(false);
  }

  function startChat(contextId?: string) {
    setActiveContextId(contextId ?? null);
    setActiveView('home');
    setSelectedContextId(null);
    setPendingConversationTool({ type: 'none' });
  }

  function acceptConversationTransition() {
    if (pendingConversationTool.type === 'offer_context') {
      const targetExists = contexts.some((context) => context.id === pendingConversationTool.targetContextId);
      setActiveContextId(targetExists ? pendingConversationTool.targetContextId ?? null : null);
    } else if (pendingConversationTool.type === 'offer_general') {
      setActiveContextId(null);
    }
    setPendingConversationTool({ type: 'none' });
    setPendingIntent(null);
    setNotice(null);
    setMobilePanelOpen(false);
  }

  function resetConversationSession() {
    setMessages(starterMessages);
    setMode('demo');
    setActiveContextId(null);
    setSelectedContextId(null);
    setPendingIntent(null);
    setPendingConversationTool({ type: 'none' });
    setPreviewCandidate(null);
    setNotice(null);
    setMobilePanelOpen(false);
    setActiveView('home');
    setResetDialogOpen(false);
  }

  async function toggleContextGoal(contextId: string, goalId: string) {
    if (pendingGoalIds.length) return;
    const previous = contexts.find((context) => context.id === contextId);
    const previousItem = previous?.goalItems.find((item) => item.id === goalId);
    if (!previous || !previousItem) return;

    const now = new Date().toISOString();
    const nextItem = {
      ...previousItem,
      completed: !previousItem.completed,
      completedAt: previousItem.completed ? undefined : now,
    };
    const goalItems = previous.goalItems.map((item) => item.id === goalId ? nextItem : item);
    const nextContext: LivingContext = {
      ...previous,
      goalItems,
      goal: summarizeGoalItems(goalItems),
      updatedAt: now,
      recentUpdate: {
        id: makeId('goal-toggle'),
        summary: nextItem.completed
          ? `Goal “${nextItem.title}”을 완료했어요.`
          : `Goal “${nextItem.title}”을 다시 진행 중으로 바꿨어요.`,
        reason: '사용자가 체크리스트에서 직접 변경했고 로컬 RAG에 반영했습니다.',
        createdAt: now,
      },
    };

    setPendingGoalIds([goalId]);
    setContexts((current) => current.map((context) => context.id === contextId ? nextContext : context));

    try {
      const response = await fetch('/api/context-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changedGoalId: goalId, context: nextContext }),
      });
      if (!response.ok) throw new Error('Goal RAG sync failed');
      setNotice({
        message: nextItem.completed ? 'Goal 완료가 RAG에 반영됐어요.' : 'Goal을 다시 진행 중으로 바꿨어요.',
        contextId,
        summary: nextItem.title,
      });
    } catch {
      setContexts((current) => current.map((context) => context.id === contextId ? previous : context));
      setNotice({
        message: 'Goal 변경을 저장하지 못했어요.',
        contextId,
        summary: '체크 상태를 이전 값으로 되돌렸습니다.',
      });
    } finally {
      setPendingGoalIds([]);
    }
  }

  return (
    <main className={activeContext ? 'app-frame has-active-context' : 'app-frame'} style={appStyle}>
      <header className="app-header">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="AlchemyNote Home">
          <span className="brand-mark"><Sparkles size={15} /></span>
          <span>AlchemyNote</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => navigate('home')}><Home size={15} /> Home</button>
          <button className={activeView === 'contexts' ? 'active' : ''} type="button" onClick={() => navigate('contexts')}>
            <Layers3 size={15} /> Contexts
            {contexts.length ? <span>{contexts.length}</span> : null}
          </button>
        </nav>
      </header>

      <div className="app-content">
        {activeView === 'home' ? (
          <div className={activeContext ? 'chat-workspace with-context-panel' : 'chat-workspace'}>
            <ChatPanel
              messages={messages}
              contexts={contexts}
              isSending={isSending}
              pendingIntent={pendingIntent}
              pendingConversationTool={pendingConversationTool}
              notice={notice}
              activeContext={activeContext}
              onSubmit={handleSubmit}
              onPreviewContext={setPreviewCandidate}
              onViewContext={(contextId) => { setSelectedContextId(contextId); setActiveView('contexts'); }}
              onDismissIntent={() => setPendingIntent(null)}
              onSelectContext={(contextId) => { setActiveContextId(contextId); setPendingConversationTool({ type: 'none' }); setNotice(null); }}
              onOpenContextPanel={() => setMobilePanelOpen(true)}
              onAcceptTransition={acceptConversationTransition}
              onDismissTransition={() => setPendingConversationTool({ type: 'none' })}
              onResetSession={() => setResetDialogOpen(true)}
            />
            {activeContext ? (
              <div className={mobilePanelOpen ? 'panel-shell mobile-open' : 'panel-shell'}>
                <ActiveProjectPanel
                  context={activeContext}
                  onOpenContext={(contextId) => { setSelectedContextId(contextId); setActiveView('contexts'); setMobilePanelOpen(false); }}
                  onDeactivate={() => { setActiveContextId(null); setPendingConversationTool({ type: 'none' }); setMobilePanelOpen(false); setNotice(null); }}
                  onClose={() => setMobilePanelOpen(false)}
                  onToggleGoal={(goalId) => { void toggleContextGoal(activeContext.id, goalId); }}
                  pendingGoalIds={pendingGoalIds}
                />
              </div>
            ) : null}
            {mobilePanelOpen && activeContext ? <button className="panel-backdrop" type="button" aria-label="Context 패널 닫기" onClick={() => setMobilePanelOpen(false)} /> : null}
          </div>
        ) : (
          <ContextsView
            contexts={contexts}
            selectedContextId={selectedContextId}
            onSelectContext={setSelectedContextId}
            onBackToList={() => setSelectedContextId(null)}
            onStartChat={startChat}
            onToggleGoal={(contextId, goalId) => { void toggleContextGoal(contextId, goalId); }}
            pendingGoalIds={pendingGoalIds}
          />
        )}
      </div>

      <ContextPreviewDialog candidate={previewCandidate} onCancel={() => setPreviewCandidate(null)} onCreate={createContext} />
      <SessionResetDialog open={resetDialogOpen} onCancel={() => setResetDialogOpen(false)} onConfirm={resetConversationSession} />
    </main>
  );
}

function normalizeContext(value: LivingContext): LivingContext | null {
  if (!value || typeof value.id !== 'string' || typeof value.title !== 'string') return null;
  const legacyTheme = (value as LivingContext & { theme?: ProjectTheme }).theme;
  const colorKey = isContextColor((value as LivingContext & { colorKey?: string }).colorKey)
    ? (value as LivingContext & { colorKey: ContextColor }).colorKey
    : legacyThemeToColor(legacyTheme);
  const now = new Date().toISOString();
  const legacyGoal = value.goal || '이 Context에서 가장 중요한 장기 목표를 정리하는 중이다.';
  const legacyState = value.currentState || '현재 상태를 다음 대화에서 함께 정리할 예정이다.';
  const goalItems = Array.isArray(value.goalItems) && value.goalItems.length
    ? value.goalItems.map((item) => ({
        ...item,
        id: item.id || makeId('goal'),
        title: item.title || legacyGoal,
        completed: Boolean(item.completed),
        createdAt: parseDateOrNow(item.createdAt, now),
        completedAt: item.completedAt ? parseDateOrNow(item.completedAt, now) : undefined,
      }))
    : [{ id: makeId('goal-legacy'), title: legacyGoal, completed: false, createdAt: now }];
  const progressTopics = Array.isArray(value.progressTopics) && value.progressTopics.length
    ? value.progressTopics.map((topic) => ({
        ...topic,
        id: topic.id || makeId('progress'),
        title: topic.title || '전체 진행',
        summary: topic.summary || legacyState,
        status: ['not_started', 'in_progress', 'improving', 'blocked', 'completed'].includes(topic.status)
          ? topic.status
          : 'in_progress',
        updatedAt: parseDateOrNow(topic.updatedAt, now),
      }))
    : [{ id: makeId('progress-legacy'), title: '전체 진행', summary: legacyState, status: 'in_progress' as const, updatedAt: now }];
  return {
    ...value,
    colorKey,
    goal: summarizeGoalItems(goalItems),
    currentState: summarizeProgressTopics(progressTopics),
    goalItems,
    progressTopics,
    createdAt: parseDateOrNow(value.createdAt, now),
    updatedAt: parseDateOrNow(value.updatedAt, now),
    description: value.description || value.goal,
    emoji: value.emoji || '✦',
    theme: legacyTheme || colorToLegacyTheme(colorKey),
    widgets: Array.isArray(value.widgets) ? value.widgets : [],
    nextActions: Array.isArray(value.nextActions) ? value.nextActions : [],
    recentChanges: Array.isArray(value.recentChanges) ? value.recentChanges : [],
  };
}

function summarizeGoalItems(items: LivingContext['goalItems']) {
  return items.map((item) => `${item.completed ? '완료' : '진행 중'}: ${item.title}`).join(' · ');
}

function summarizeProgressTopics(items: LivingContext['progressTopics']) {
  return items.map((topic) => `${topic.title}: ${topic.summary}`).join(' · ');
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  if (message.id === 'welcome') return starterMessages[0];
  return {
    ...message,
    content: message.content.replace(/프로젝트/g, 'Context').replace(/Project/g, 'Context'),
  };
}

function parseDateOrNow(value: string, fallback: string) {
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function isContextColor(value?: string): value is ContextColor {
  return ['green', 'blue', 'violet', 'amber', 'cyan', 'rose'].includes(value ?? '');
}

function legacyThemeToColor(theme?: ProjectTheme): ContextColor {
  return ({ forest: 'green', indigo: 'violet', ocean: 'cyan', sunset: 'rose', clay: 'amber', plum: 'violet' } as Record<ProjectTheme, ContextColor>)[theme ?? 'indigo'];
}

function colorToLegacyTheme(color: ContextColor): ProjectTheme {
  return ({ green: 'forest', blue: 'indigo', violet: 'plum', amber: 'clay', cyan: 'ocean', rose: 'sunset' } as Record<ContextColor, ProjectTheme>)[color];
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniqueId(baseId: string, ids: string[]) {
  if (!ids.includes(baseId)) return baseId;
  let index = 2;
  while (ids.includes(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
