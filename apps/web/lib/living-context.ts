export type AssistantMode = 'demo' | 'gemini';

export const contextColors = [
  'green',
  'blue',
  'violet',
  'amber',
  'cyan',
  'rose',
] as const;

export type ContextColor = (typeof contextColors)[number];

export interface ContextGoalItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'improving' | 'blocked' | 'completed';

export interface ContextProgressTopic {
  id: string;
  title: string;
  summary: string;
  status: ProgressStatus;
  updatedAt: string;
}

export interface ContextCandidate {
  title: string;
  goal: string;
  currentState: string;
  goalItems: ContextGoalItem[];
  progressTopics: ContextProgressTopic[];
  colorKey: ContextColor;
}

export interface ContextChange {
  id: string;
  summary: string;
  reason: string;
  createdAt: string;
  goalChanged?: boolean;
}

export interface LivingContext extends ContextCandidate {
  id: string;
  createdAt: string;
  updatedAt: string;
  recentUpdate?: ContextChange;
  /** Legacy prototype data retained only for localStorage migration. */
  description: string;
  emoji: string;
  theme: ProjectTheme;
  focus?: string;
  widgets: ContextWidget[];
  nextActions: ContextAction[];
  recentChanges: Array<{ id: string; title: string; createdAt: string }>;
}

export interface ContextUpdate {
  goal?: string;
  currentState?: string;
  goalItems?: ContextGoalItem[];
  progressTopics?: ContextProgressTopic[];
  summary: string;
  reason: string;
  goalChanged?: boolean;
}

export interface ContextIntent {
  type: 'none' | 'suggest_new' | 'update_active' | 'update_existing';
  contextId?: string;
  candidate?: ContextCandidate;
  update?: ContextUpdate;
}

export type ConversationTool =
  | { type: 'none' }
  | {
      type: 'offer_general' | 'offer_context';
      detectedTopic: string;
      reason: string;
      targetContextId?: string;
    };

export interface ChatApiResponse {
  reply: string;
  contextIntent: ContextIntent;
  conversationTool: ConversationTool;
  mode: AssistantMode;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  mode?: AssistantMode;
}

export const starterMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      '안녕하세요. 요즘 마음이 가는 일이나 계속 이어가고 싶은 이야기가 있나요?',
    createdAt: '',
    mode: 'demo',
  },
];

// Lightweight legacy exports keep dormant prototype files type-safe while the
// current product surface is intentionally centered on Goal and Current Progress.
export type ContextWidgetType = 'metric' | 'progress' | 'status' | 'list' | 'timeline';
export type WidgetTone = 'sage' | 'violet' | 'blue' | 'amber';
export type ProjectTheme = 'forest' | 'indigo' | 'ocean' | 'sunset' | 'clay' | 'plum';
export interface ContextWidgetItem { title: string; description?: string; date?: string; status?: string }
export interface ContextWidget { id: string; type: ContextWidgetType; title: string; value?: string; current?: number; max?: number; unit?: string; tone?: WidgetTone; items?: ContextWidgetItem[] }
export interface ContextAction { id: string; title: string; detail?: string; completed: boolean }
export interface WidgetUpdate { widgetId: string; value?: string; current?: number; max?: number; items?: ContextWidgetItem[] }
export type MetricKey = 'juggling' | 'leftFoot' | 'rightFoot';
export interface Metric { key: MetricKey; label: string; current: number; previous?: number; target: number; unit: 'reps' | '%'; note: string; tone: 'sage' | 'violet' | 'blue' }
export interface Change { id: string; title: string; detail?: string; createdAt: string }
export type ActionHorizon = 'Today' | 'This week' | 'Next match';
export interface ActionItem { id: string; horizon: ActionHorizon; title: string; detail?: string; completed: boolean }
export interface Insight { id: string; text: string; createdAt: string }
