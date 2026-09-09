import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  ChatApiResponse,
  ConversationTool,
  ContextCandidate,
  ContextGoalItem,
  ContextIntent,
  ContextProgressTopic,
  ContextUpdate,
  ProgressStatus,
} from '@/lib/living-context';
import {
  retrieveRagMemory,
  saveRagTurn,
  type MemoryExtraction,
  type RagCluster,
  type RagRetrieval,
} from '@/lib/local-rag';

export const runtime = 'nodejs';

const colorKeys = ['green', 'blue', 'violet', 'amber', 'cyan', 'rose'] as const;
const progressStatuses = ['not_started', 'in_progress', 'improving', 'blocked', 'completed'] as const;

const goalItemDraftSchema = z.object({
  title: z.string().trim().min(1).max(140),
});

const progressTopicDraftSchema = z.object({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(320),
  status: z.enum(progressStatuses),
});

const candidateSchema = z.object({
  title: z.string().trim().min(1).max(48),
  goal: z.string().trim().min(1).max(420),
  currentState: z.string().trim().min(1).max(700),
  goalItems: z.array(goalItemDraftSchema).min(1).max(8),
  progressTopics: z.array(progressTopicDraftSchema).min(1).max(8),
  colorKey: z.enum(colorKeys),
});

const updateSchema = z.object({
  goal: z.string().trim().min(1).max(420).optional(),
  currentState: z.string().trim().min(1).max(700).optional(),
  goalItems: z.array(goalItemDraftSchema).min(1).max(8).optional(),
  progressTopics: z.array(progressTopicDraftSchema).min(1).max(8).optional(),
  summary: z.string().trim().min(1).max(220),
  reason: z.string().trim().min(1).max(300),
  goalChanged: z.boolean().optional(),
});

const intentSchema = z.object({
  type: z.enum(['none', 'suggest_new', 'update_active', 'update_existing']),
  contextId: z.string().max(100).optional(),
  candidate: candidateSchema.optional(),
  update: updateSchema.optional(),
});

const conversationToolSchema = z.object({
  type: z.enum(['none', 'offer_general', 'offer_context']),
  targetContextId: z.string().max(100).optional(),
  detectedTopic: z.string().trim().max(80),
  reason: z.string().trim().max(220),
});

const memorySchema = z.object({
  shouldStore: z.boolean(),
  topicKey: z.string().trim().min(1).max(64),
  canonicalTitle: z.string().trim().min(1).max(48),
  summary: z.string().trim().min(1).max(500),
  clusterSummary: z.string().trim().min(1).max(700),
  durableFacts: z.array(z.string().trim().min(1).max(220)).max(8),
  goalSignal: z.string().trim().max(300).optional(),
  stateSignal: z.string().trim().max(400).optional(),
  projectWorthiness: z.number().min(0).max(1),
});

const modelResponseSchema = z.object({
  reply: z.string().trim().min(1).max(2200),
  memory: memorySchema,
  contextIntent: intentSchema,
  conversationTool: conversationToolSchema,
});

const contextSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(80),
  goal: z.string().max(700),
  currentState: z.string().max(1000),
  goalItems: z.array(z.object({
    id: z.string().max(100),
    title: z.string().max(180),
    completed: z.boolean(),
    createdAt: z.string().max(64),
    completedAt: z.string().max(64).optional(),
  })).max(12).default([]),
  progressTopics: z.array(z.object({
    id: z.string().max(100),
    title: z.string().max(100),
    summary: z.string().max(500),
    status: z.enum(progressStatuses),
    updatedAt: z.string().max(64),
  })).max(12).default([]),
  colorKey: z.enum(colorKeys).optional().default('violet'),
}).passthrough();

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2500),
  contexts: z.array(contextSchema).max(30).default([]),
  activeContextId: z.string().max(100).nullable().optional(),
  history: z.array(z.object({
    role: z.enum(['assistant', 'user']),
    content: z.string().max(2500),
  })).max(16).default([]),
});

type ContextSnapshot = z.infer<typeof contextSchema>;

const responseJsonSchema = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Gemini가 직접 작성한 자연스럽고 구체적인 대화 응답. 메모리나 분류 시스템을 언급하지 않는다.',
    },
    memory: {
      type: 'object',
      description: '현재 사용자 발화에서 로컬 RAG에 보존할 장기 기억을 추출한다.',
      properties: {
        shouldStore: { type: 'boolean' },
        topicKey: { type: 'string' },
        canonicalTitle: {
          type: 'string',
          description: '관련 기억 묶음을 대표하는 2~5단어의 명사구. 사용자 문장을 복사하지 않는다.',
        },
        summary: { type: 'string' },
        clusterSummary: {
          type: 'string',
          description: '검색된 관련 기억과 현재 발화를 합친 주제 묶음 전체의 최신 요약.',
        },
        durableFacts: { type: 'array', items: { type: 'string' } },
        goalSignal: { type: 'string' },
        stateSignal: { type: 'string' },
        projectWorthiness: { type: 'number' },
      },
      required: [
        'shouldStore',
        'topicKey',
        'canonicalTitle',
        'summary',
        'clusterSummary',
        'durableFacts',
        'projectWorthiness',
      ],
      additionalProperties: false,
    },
    contextIntent: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['none', 'suggest_new', 'update_active', 'update_existing'],
        },
        contextId: { type: 'string' },
        candidate: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            goal: { type: 'string' },
            currentState: { type: 'string' },
            goalItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: { title: { type: 'string' } },
                required: ['title'],
                additionalProperties: false,
              },
            },
            progressTopics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  status: { type: 'string', enum: [...progressStatuses] },
                },
                required: ['title', 'summary', 'status'],
                additionalProperties: false,
              },
            },
            colorKey: { type: 'string', enum: [...colorKeys] },
          },
          required: ['title', 'goal', 'currentState', 'goalItems', 'progressTopics', 'colorKey'],
          additionalProperties: false,
        },
        update: {
          type: 'object',
          properties: {
            goal: { type: 'string' },
            currentState: { type: 'string' },
            goalItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: { title: { type: 'string' } },
                required: ['title'],
                additionalProperties: false,
              },
            },
            progressTopics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  status: { type: 'string', enum: [...progressStatuses] },
                },
                required: ['title', 'summary', 'status'],
                additionalProperties: false,
              },
            },
            summary: { type: 'string' },
            reason: { type: 'string' },
            goalChanged: { type: 'boolean' },
          },
          required: ['summary', 'reason'],
          additionalProperties: false,
        },
      },
      required: ['type'],
      additionalProperties: false,
    },
    conversationTool: {
      type: 'object',
      description: '활성 Context와 다른 대화 흐름이 명확할 때 UI에 전환 선택지를 띄우는 도구 호출.',
      properties: {
        type: {
          type: 'string',
          enum: ['none', 'offer_general', 'offer_context'],
        },
        targetContextId: {
          type: 'string',
          description: 'offer_context일 때만 사용하며, 제공된 기존 Context의 정확한 ID다.',
        },
        detectedTopic: {
          type: 'string',
          description: '새로 감지한 대화 주제를 짧은 명사구로 쓴다. none이면 빈 문자열이다.',
        },
        reason: {
          type: 'string',
          description: '왜 전환을 제안하는지 사용자에게 보여줄 짧은 설명. none이면 빈 문자열이다.',
        },
      },
      required: ['type', 'detectedTopic', 'reason'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'memory', 'contextIntent', 'conversationTool'],
  additionalProperties: false,
} as const;

const systemInstruction = [
  '당신은 AlchemyNote의 대화 모델이다. 모든 정상 요청에 대해 Gemini가 직접 자연스럽고 구체적인 reply를 작성한다.',
  '미리 준비된 매크로, 반복되는 환영 문구, 기계적인 “조금 더 들려주세요” 문장을 사용하지 않는다.',
  '사용자의 질문이나 이야기에 먼저 정확히 반응한다. 필요하면 저장된 RAG 기억을 자연스럽게 활용하되, RAG·검색·클러스터·분류 과정을 사용자에게 설명하지 않는다.',
  'memory는 reply와 별도로 작성한다. 취향, 반복 관심사, 개인적 사실, 목표, 진행 상황, 제약, 결정처럼 다음 대화에서 유용한 정보는 shouldStore=true다.',
  '단발성 지식 질문이나 맥락 없는 잡담처럼 장기적으로 쓸 정보가 없으면 shouldStore=false다. 그래도 나머지 memory 필드는 현재 대화 주제를 짧게 기술한다.',
  'topicKey는 같은 관심 영역에서 안정적으로 재사용할 짧은 kebab-case 키다.',
  'canonicalTitle은 사용자의 마지막 문장이 아니라 관련 기억 전체를 대표하는 2~5단어 명사구다. “방금 드리블 훈련을 하겠다” 같은 문장을 제목으로 복사하지 않는다.',
  'clusterSummary는 제공된 관련 기억과 현재 발화를 합쳐 유효한 사실을 보존한 최신 요약이다.',
  'Context 제안은 보수적으로 한다. 한 번의 발화만으로 suggest_new를 선택하지 않는다.',
  '검색된 RAG 클러스터에 이미 최소 1회의 이전 사용자 발화가 있고, 현재 발화가 같은 장기 목표나 변화 상태를 강화해 총 2회 이상의 독립된 근거가 될 때만 suggest_new를 고려한다.',
  '단순히 “훈련하겠다”, “해보고 싶다”라고 한 번 말한 것은 Context 생성 근거가 아니다.',
  'suggest_new 후보의 title, goal, currentState는 반드시 검색된 관련 RAG 기억 묶음 전체를 참고해 만든다.',
  'Context의 Goal은 사용자가 직접 체크할 수 있는 goalItems 배열이다. 각 항목은 추상적인 슬로건이 아니라 완료 여부를 판단할 수 있는 짧은 행동 또는 도달 상태로 작성한다.',
  'Context의 Current Progress는 progressTopics 배열이다. 같은 Context 안의 병렬 주제(예: 드리블, 왼발, 체력)를 각각 title과 최신 summary로 분리한다.',
  '비슷한 progressTopics는 하나로 통합하고 표현만 다른 중복 항목을 만들지 않는다. 기존 항목의 의미를 유지하면서 새 대화의 변화를 반영한 전체 Snapshot을 반환한다.',
  '현재 발화에서 다루지 않은 progressTopic은 기존 title, summary, status를 그대로 유지한다. “이번 세션에서 언급되지 않음” 같은 불필요한 문구를 덧붙이지 않는다.',
  'progressTopics의 status는 not_started, in_progress, improving, blocked, completed 중 하나다.',
  'Goal 체크 완료 상태는 사용자가 UI에서 직접 결정한다. Gemini는 goalItems의 문구를 제안하거나 명시적 목표 변경을 반영할 수 있지만 완료 여부를 바꾸지 않는다.',
  '이미 같은 Context가 존재하면 새로 제안하지 않는다. 활성 Context의 의미 있는 변화는 update_active, 비활성 Context의 변화는 update_existing이다.',
  'conversationTool은 대화 흐름 전환을 제안하는 UI 도구다. 활성 Context가 없으면 반드시 type=none이다.',
  '활성 Context가 있는데 사용자가 그 Context와 분명히 무관한 새 주제로 대화를 시작하면 offer_general을 선택한다.',
  '새 주제가 이미 만들어진 다른 Context와 명확히 일치하면 offer_general 대신 offer_context를 선택하고 정확한 targetContextId를 넣는다.',
  '짧은 곁가지 질문, 비유, 잠깐의 언급, 의미가 모호한 문장에는 전환을 제안하지 않는다.',
  '전환을 제안하는 턴에는 contextIntent를 none으로 두고, reply 안에서는 전환 여부를 되묻지 않는다. 사용자의 새 주제에는 평소처럼 자연스럽게 답하며 UI가 별도로 선택지를 보여준다.',
  'detectedTopic은 새 흐름의 이름을 2~5단어로, reason은 기존 Context와 별개로 보이는 이유를 한 문장으로 작성한다. type=none일 때 둘 다 빈 문자열이다.',
  'Context Current State는 마지막 문장 복사가 아니라 기존 상태, 관련 RAG 기억, 최근 대화를 통합한 현재 Snapshot이다.',
  'Goal은 사용자가 장기 목표 변경을 명시한 경우에만 바꾼다.',
  '확인되지 않은 사실을 만들지 않는다.',
].join('\n');

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: '메시지 형식을 확인해 주세요.' }, { status: 400 });
  }

  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Gemini API key is required. Demo macro responses are disabled.' },
      { status: 503 },
    );
  }

  const { message, contexts, activeContextId, history } = parsed.data;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const retrieval = await retrieveRagMemory({ ai, query: message });
    const matchedCluster = retrieval.clusters[0] && isStrongClusterMatch(retrieval.clusters[0])
      ? retrieval.clusters[0]
      : null;
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const interaction = await ai.interactions.create({
      model,
      input: [
        '현재 활성 Context ID:',
        activeContextId ?? 'none',
        '',
        '사용자가 이미 만든 Context:',
        JSON.stringify(contexts.map(({ id, title, goal, currentState, goalItems, progressTopics, colorKey }) => ({
          id,
          title,
          goal,
          currentState,
          goalItems,
          progressTopics,
          colorKey,
          active: id === activeContextId,
        }))),
        '',
        `로컬 RAG 검색 모드: ${retrieval.mode}`,
        '관련 기억 클러스터:',
        JSON.stringify(retrieval.clusters.map((cluster) => ({
          id: cluster.id,
          canonicalTitle: cluster.canonicalTitle,
          summary: cluster.summary,
          goalSnapshot: cluster.goalSnapshot,
          stateSnapshot: cluster.stateSnapshot,
          previousUserTurns: cluster.userTurnCount,
          evidenceCount: cluster.evidenceCount,
          projectWorthiness: cluster.projectWorthiness,
          hybridScore: Number(cluster.hybridScore.toFixed(3)),
        }))),
        '',
        '관련 사용자 기억:',
        JSON.stringify(retrieval.memories.map((memory) => ({
          clusterId: memory.clusterId,
          summary: memory.summary,
          durableFacts: memory.durableFacts,
          goalSignal: memory.goalSignal,
          stateSignal: memory.stateSignal,
          hybridScore: Number(memory.hybridScore.toFixed(3)),
        }))),
        '',
        '최근 화면 대화:',
        JSON.stringify(history.slice(-10)),
        '',
        '현재 사용자 메시지:',
        message,
      ].join('\n'),
      system_instruction: systemInstruction,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: responseJsonSchema,
      },
      store: false,
    });

    if (!interaction.output_text) throw new Error('Gemini returned an empty response.');
    const result = modelResponseSchema.parse(JSON.parse(interaction.output_text));
    const saved = await saveRagTurn({
      ai,
      userContent: message,
      assistantContent: result.reply,
      extraction: result.memory as MemoryExtraction,
      matchedClusterId: matchedCluster?.id,
      activeContextId,
    });
    const contextIntent = guardContextIntent({
      intent: result.contextIntent,
      memory: result.memory,
      message,
      contexts,
      activeContextId,
      retrieval,
      previousMatchedClusterId: matchedCluster?.id,
      savedCluster: saved.cluster,
    });
    const conversationTool = guardConversationTool({
      tool: result.conversationTool,
      contexts,
      activeContextId,
    });

    return NextResponse.json<ChatApiResponse>({
      reply: result.reply,
      contextIntent: conversationTool.type === 'none' ? contextIntent : { type: 'none' },
      conversationTool,
      mode: 'gemini',
    });
  } catch (error) {
    console.error(
      '[AlchemyNote] Gemini + RAG turn failed.',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { message: 'Gemini could not complete this turn. No macro fallback was used.' },
      { status: 502 },
    );
  }
}

function guardConversationTool({
  tool,
  contexts,
  activeContextId,
}: {
  tool: z.infer<typeof conversationToolSchema>;
  contexts: ContextSnapshot[];
  activeContextId?: string | null;
}): ConversationTool {
  const activeContext = contexts.find((context) => context.id === activeContextId);
  if (!activeContext || tool.type === 'none') return { type: 'none' };

  const detectedTopic = tool.detectedTopic || '새로운 주제';
  const reason = tool.reason || `지금 이야기는 ${activeContext.title}와 별개의 흐름으로 보여요.`;

  if (tool.type === 'offer_context') {
    const target = contexts.find(
      (context) => context.id === tool.targetContextId && context.id !== activeContext.id,
    );
    if (!target) return { type: 'none' };
    return {
      type: 'offer_context',
      targetContextId: target.id,
      detectedTopic,
      reason,
    };
  }

  return { type: 'offer_general', detectedTopic, reason };
}

function guardContextIntent({
  intent,
  memory,
  message,
  contexts,
  activeContextId,
  retrieval,
  previousMatchedClusterId,
  savedCluster,
}: {
  intent: z.infer<typeof intentSchema>;
  memory: z.infer<typeof memorySchema>;
  message: string;
  contexts: ContextSnapshot[];
  activeContextId?: string | null;
  retrieval: RagRetrieval;
  previousMatchedClusterId?: string;
  savedCluster: RagCluster | null;
}): ContextIntent {
  if (intent.type === 'suggest_new') {
    const previousCluster = retrieval.clusters.find(
      (cluster) => cluster.id === previousMatchedClusterId,
    );
    const candidate = intent.candidate;
    const hasIndependentHistory = Boolean(
      previousCluster &&
      previousCluster.userTurnCount >= 1 &&
      isStrongClusterMatch(previousCluster),
    );
    const clusterMatured = Boolean(
      savedCluster &&
      savedCluster.id === previousMatchedClusterId &&
      savedCluster.userTurnCount >= 2 &&
      savedCluster.evidenceCount >= 2 &&
      savedCluster.projectWorthiness >= 0.62 &&
      memory.projectWorthiness >= 0.58,
    );
    const duplicateContext = savedCluster
      ? contexts.some((context) => contextMatchesCluster(context, savedCluster))
      : false;

    if (!candidate || !hasIndependentHistory || !clusterMatured || duplicateContext || !savedCluster) {
      return { type: 'none' };
    }

    return {
      type: 'suggest_new',
      candidate: {
        title: savedCluster.canonicalTitle,
        goal: candidate.goal || savedCluster.goalSnapshot,
        currentState: candidate.currentState || savedCluster.stateSnapshot,
        goalItems: createGoalItems(candidate.goalItems),
        progressTopics: createProgressTopics(candidate.progressTopics),
        colorKey: candidate.colorKey,
      } satisfies ContextCandidate,
    };
  }

  if (intent.type === 'update_active' || intent.type === 'update_existing') {
    const targetId = intent.type === 'update_active' ? activeContextId : intent.contextId;
    const context = contexts.find((item) => item.id === targetId);
    if (!context || !intent.update) return { type: 'none' };
    const modelUpdate = intent.update;
    const update: ContextUpdate = {
      summary: modelUpdate.summary,
      reason: modelUpdate.reason,
      goalChanged: modelUpdate.goalChanged,
    };

    if (modelUpdate.goalChanged) {
      if (modelUpdate.goal) update.goal = modelUpdate.goal;
      if (modelUpdate.goalItems) {
        update.goalItems = reconcileGoalItems(
          context.goalItems,
          modelUpdate.goalItems,
          context.goal,
        );
        update.goal = summarizeGoalItems(update.goalItems);
      }
    }

    if (modelUpdate.progressTopics) {
      update.progressTopics = reconcileProgressTopics(
        context.progressTopics,
        modelUpdate.progressTopics,
      );
      update.currentState = summarizeProgressTopics(update.progressTopics);
    } else if (modelUpdate.currentState) {
      update.currentState = modelUpdate.currentState;
      if (context.progressTopics.length <= 1) {
        update.progressTopics = reconcileProgressTopics(
          context.progressTopics,
          [{ title: context.progressTopics[0]?.title || '전체 진행', summary: modelUpdate.currentState, status: 'in_progress' }],
        );
      }
    }

    if (update.currentState && normalize(update.currentState) === normalize(message)) {
      return { type: 'none' };
    }
    if (!update.goal && !update.currentState && !update.goalItems && !update.progressTopics) {
      return { type: 'none' };
    }
    return { type: intent.type, contextId: context.id, update };
  }

  return { type: 'none' };
}

function createGoalItems(drafts: Array<{ title: string }>): ContextGoalItem[] {
  const now = new Date().toISOString();
  return uniqueByTitle(drafts).map((draft) => ({
    id: `goal-${randomUUID()}`,
    title: draft.title,
    completed: false,
    createdAt: now,
  }));
}

function createProgressTopics(
  drafts: Array<{ title: string; summary: string; status: ProgressStatus }>,
): ContextProgressTopic[] {
  const now = new Date().toISOString();
  return uniqueByTitle(drafts).map((draft) => ({
    id: `progress-${randomUUID()}`,
    title: draft.title,
    summary: draft.summary,
    status: draft.status,
    updatedAt: now,
  }));
}

function reconcileGoalItems(
  current: ContextGoalItem[],
  drafts: Array<{ title: string }>,
  legacyGoal: string,
): ContextGoalItem[] {
  const now = new Date().toISOString();
  const existing = current.length ? current : [{
    id: `goal-${randomUUID()}`,
    title: legacyGoal,
    completed: false,
    createdAt: now,
  }];

  return uniqueByTitle(drafts).map((draft) => {
    const match = bestTitleMatch(draft.title, existing);
    return match ? { ...match, title: draft.title } : {
      id: `goal-${randomUUID()}`,
      title: draft.title,
      completed: false,
      createdAt: now,
    };
  });
}

function reconcileProgressTopics(
  current: ContextProgressTopic[],
  drafts: Array<{ title: string; summary: string; status: ProgressStatus }>,
): ContextProgressTopic[] {
  const now = new Date().toISOString();
  return uniqueByTitle(drafts).map((draft) => {
    const match = bestTitleMatch(draft.title, current);
    return {
      id: match?.id ?? `progress-${randomUUID()}`,
      title: draft.title,
      summary: draft.summary,
      status: draft.status,
      updatedAt: now,
    };
  });
}

function uniqueByTitle<T extends { title: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalize(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestTitleMatch<T extends { title: string }>(title: string, items: T[]) {
  const normalizedTitle = normalize(title);
  const direct = items.find((item) => normalize(item.title) === normalizedTitle);
  if (direct) return direct;
  const titleTokens = new Set(tokenize(title));
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const candidateTokens = tokenize(item.title);
    const overlap = candidateTokens.filter((token) => titleTokens.has(token)).length;
    const score = overlap / Math.max(1, Math.min(titleTokens.size, candidateTokens.length));
    if (score >= 0.5 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item;
}

function summarizeGoalItems(items: ContextGoalItem[]) {
  return items.map((item) => `${item.completed ? '완료' : '진행 중'}: ${item.title}`).join(' · ');
}

function summarizeProgressTopics(items: ContextProgressTopic[]) {
  return items.map((item) => `${item.title}: ${item.summary}`).join(' · ');
}

function contextMatchesCluster(context: ContextSnapshot, cluster: RagCluster) {
  const contextTokens = new Set(tokenize(`${context.title} ${context.goal} ${context.goalItems.map((item) => item.title).join(' ')}`));
  const clusterTokens = tokenize(`${cluster.canonicalTitle} ${cluster.goalSnapshot} ${cluster.summary}`);
  const overlap = clusterTokens.filter((token) => contextTokens.has(token)).length;
  return overlap >= 2 || normalize(context.title) === normalize(cluster.canonicalTitle);
}

function isStrongClusterMatch(cluster: RagRetrieval['clusters'][number]) {
  return cluster.lexicalScore >= 0.32
    || (cluster.semanticScore ?? 0) >= 0.72
    || cluster.hybridScore >= 0.58;
}

function tokenize(value: string) {
  return normalize(value).split(/[^a-z0-9가-힣]+/).filter((token) => token.length >= 2);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
