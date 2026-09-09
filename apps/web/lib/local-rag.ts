import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { GoogleGenAI } from '@google/genai';
import type { ContextGoalItem, ContextProgressTopic } from '@/lib/living-context';

export interface MemoryExtraction {
  shouldStore: boolean;
  topicKey: string;
  canonicalTitle: string;
  summary: string;
  clusterSummary: string;
  durableFacts: string[];
  goalSignal?: string;
  stateSignal?: string;
  projectWorthiness: number;
}

export interface RagCluster {
  id: string;
  topicKey: string;
  canonicalTitle: string;
  summary: string;
  goalSnapshot: string;
  stateSnapshot: string;
  evidenceCount: number;
  userTurnCount: number;
  projectWorthiness: number;
  convertedContextId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RagClusterHit extends RagCluster {
  lexicalScore: number;
  semanticScore: number | null;
  hybridScore: number;
}

export interface RagMemoryHit {
  id: string;
  clusterId: string | null;
  summary: string;
  durableFacts: string[];
  goalSignal: string;
  stateSignal: string;
  createdAt: string;
  lexicalScore: number;
  semanticScore: number | null;
  hybridScore: number;
}

export interface RagRetrieval {
  mode: 'lexical' | 'hybrid';
  clusters: RagClusterHit[];
  memories: RagMemoryHit[];
}

interface ClusterRow {
  id: string;
  topic_key: string;
  canonical_title: string;
  summary: string;
  goal_snapshot: string;
  state_snapshot: string;
  evidence_count: number;
  user_turn_count: number;
  project_worthiness: number;
  embedding: string | null;
  converted_context_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryRow {
  id: string;
  cluster_id: string | null;
  original_content: string;
  summary: string;
  durable_facts: string;
  goal_signal: string;
  state_signal: string;
  embedding: string | null;
  created_at: string;
}

let database: DatabaseSync | null = null;

export async function retrieveRagMemory({
  ai,
  query,
  limit = 6,
}: {
  ai: GoogleGenAI;
  query: string;
  limit?: number;
}): Promise<RagRetrieval> {
  const db = getDatabase();
  const clusterRows = db.prepare(
    `SELECT * FROM rag_clusters ORDER BY updated_at DESC LIMIT 160`,
  ).all() as unknown as ClusterRow[];
  const memoryRows = db.prepare(
    `SELECT * FROM rag_memories ORDER BY created_at DESC LIMIT 420`,
  ).all() as unknown as MemoryRow[];

  let queryEmbedding: number[] | null = null;
  try {
    [queryEmbedding] = await embedTexts(ai, [query]);
  } catch (error) {
    console.error(
      '[AlchemyNote] RAG query embedding failed; continuing with lexical retrieval.',
      error instanceof Error ? error.message : error,
    );
  }

  const queryTokens = tokenize(query);
  const clusters = clusterRows
    .map((row) => {
      const document = [
        row.canonical_title,
        row.summary,
        row.goal_snapshot,
        row.state_snapshot,
      ].join(' ');
      const lexicalScore = lexicalSimilarity(queryTokens, tokenize(document));
      const vector = parseEmbedding(row.embedding);
      const semanticScore = queryEmbedding && vector
        ? cosineSimilarity(queryEmbedding, vector)
        : null;
      const recency = recencyScore(row.updated_at);
      return {
        ...toCluster(row),
        lexicalScore,
        semanticScore,
        hybridScore: hybridScore(lexicalScore, semanticScore, recency),
      };
    })
    .filter((item) => item.lexicalScore > 0 || (item.semanticScore ?? 0) >= 0.68)
    .sort((left, right) => right.hybridScore - left.hybridScore)
    .slice(0, limit);

  const memories = memoryRows
    .map((row) => {
      const document = [
        row.original_content,
        row.summary,
        row.durable_facts,
        row.goal_signal,
        row.state_signal,
      ].join(' ');
      const lexicalScore = lexicalSimilarity(queryTokens, tokenize(document));
      const vector = parseEmbedding(row.embedding);
      const semanticScore = queryEmbedding && vector
        ? cosineSimilarity(queryEmbedding, vector)
        : null;
      return {
        id: row.id,
        clusterId: row.cluster_id,
        summary: row.summary,
        durableFacts: parseStringArray(row.durable_facts),
        goalSignal: row.goal_signal,
        stateSignal: row.state_signal,
        createdAt: row.created_at,
        lexicalScore,
        semanticScore,
        hybridScore: hybridScore(lexicalScore, semanticScore, recencyScore(row.created_at)),
      };
    })
    .filter((item) => item.lexicalScore > 0 || (item.semanticScore ?? 0) >= 0.68)
    .sort((left, right) => right.hybridScore - left.hybridScore)
    .slice(0, limit * 2);

  return {
    mode: queryEmbedding ? 'hybrid' : 'lexical',
    clusters,
    memories,
  };
}

export async function saveRagTurn({
  ai,
  userContent,
  assistantContent,
  extraction,
  matchedClusterId,
  activeContextId,
}: {
  ai: GoogleGenAI;
  userContent: string;
  assistantContent: string;
  extraction: MemoryExtraction;
  matchedClusterId?: string;
  activeContextId?: string | null;
}) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const turnId = randomUUID();

  db.prepare(
    `INSERT INTO conversation_turns
      (id, user_content, assistant_content, active_context_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(turnId, userContent, assistantContent, activeContextId ?? null, now);

  if (!extraction.shouldStore) return { cluster: null, memoryId: null };

  const normalizedTopicKey = normalizeTopicKey(extraction.topicKey);
  const matchedCluster = matchedClusterId
    ? findClusterById(db, matchedClusterId)
    : null;
  const sameTopicCluster = findClusterByTopicKey(db, normalizedTopicKey);
  const existing = matchedCluster ?? sameTopicCluster;
  const canonicalTitle = sanitizeCanonicalTitle(
    extraction.canonicalTitle,
    normalizedTopicKey,
    userContent,
    existing?.canonical_title,
  );
  const clusterId = existing?.id ?? `cluster-${normalizedTopicKey}-${hashText(now).slice(0, 6)}`;
  const memoryId = randomUUID();
  const memoryDocument = [
    canonicalTitle,
    extraction.summary,
    extraction.durableFacts.join(' '),
    extraction.goalSignal ?? '',
    extraction.stateSignal ?? '',
  ].join('\n');

  let embedding: number[] | null = null;
  try {
    [embedding] = await embedTexts(ai, [memoryDocument]);
  } catch (error) {
    console.error(
      '[AlchemyNote] Memory embedding failed; memory remains lexically searchable.',
      error instanceof Error ? error.message : error,
    );
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    if (existing) {
      const nextSummary = extraction.clusterSummary || existing.summary;
      const nextGoal = extraction.goalSignal || existing.goal_snapshot;
      const nextState = extraction.stateSignal || existing.state_snapshot;
      const nextWorthiness = Math.max(
        existing.project_worthiness,
        clamp01(extraction.projectWorthiness),
      );
      db.prepare(
        `UPDATE rag_clusters
         SET canonical_title = ?, summary = ?, goal_snapshot = ?, state_snapshot = ?,
             evidence_count = evidence_count + 1,
             user_turn_count = user_turn_count + 1,
             project_worthiness = ?, embedding = COALESCE(?, embedding), updated_at = ?
         WHERE id = ?`,
      ).run(
        existing.user_turn_count <= 1 ? canonicalTitle : existing.canonical_title,
        nextSummary,
        nextGoal,
        nextState,
        nextWorthiness,
        embedding ? JSON.stringify(embedding) : null,
        now,
        existing.id,
      );
    } else {
      db.prepare(
        `INSERT INTO rag_clusters
          (id, topic_key, canonical_title, summary, goal_snapshot, state_snapshot,
           evidence_count, user_turn_count, project_worthiness, embedding,
           converted_context_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, NULL, ?, ?)`,
      ).run(
        clusterId,
        normalizedTopicKey,
        canonicalTitle,
        extraction.clusterSummary || extraction.summary,
        extraction.goalSignal ?? '',
        extraction.stateSignal ?? '',
        clamp01(extraction.projectWorthiness),
        embedding ? JSON.stringify(embedding) : null,
        now,
        now,
      );
    }

    db.prepare(
      `INSERT INTO rag_memories
        (id, cluster_id, turn_id, original_content, summary, durable_facts,
         goal_signal, state_signal, project_worthiness, embedding, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      memoryId,
      clusterId,
      turnId,
      userContent,
      extraction.summary,
      JSON.stringify(extraction.durableFacts),
      extraction.goalSignal ?? '',
      extraction.stateSignal ?? '',
      clamp01(extraction.projectWorthiness),
      embedding ? JSON.stringify(embedding) : null,
      now,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    cluster: findClusterById(db, clusterId)
      ? toCluster(findClusterById(db, clusterId)!)
      : null,
    memoryId,
  };
}

export async function recordContextGoalToggle({
  ai,
  context,
  goalItem,
}: {
  ai?: GoogleGenAI;
  context: {
    id: string;
    title: string;
    goal: string;
    currentState: string;
    goalItems: ContextGoalItem[];
    progressTopics: ContextProgressTopic[];
  };
  goalItem: ContextGoalItem;
}) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const turnId = randomUUID();
  const memoryId = randomUUID();
  const goalSnapshot = context.goalItems
    .map((item) => `${item.completed ? '[완료]' : '[진행 중]'} ${item.title}`)
    .join(' · ');
  const stateSnapshot = context.progressTopics
    .map((topic) => `${topic.title}: ${topic.summary}`)
    .join(' · ') || context.currentState;
  const actionSummary = goalItem.completed
    ? `사용자가 Goal “${goalItem.title}”을 완료로 체크했다.`
    : `사용자가 Goal “${goalItem.title}”을 다시 진행 중으로 변경했다.`;
  const memoryDocument = [context.title, actionSummary, goalSnapshot, stateSnapshot].join('\n');

  let embedding: number[] | null = null;
  if (ai) {
    try {
      [embedding] = await embedTexts(ai, [memoryDocument]);
    } catch (error) {
      console.error(
        '[AlchemyNote] Goal event embedding failed; the direct DB state remains lexically searchable.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const existing = findClusterByContext(db, context.id, context.title);
  const clusterId = existing?.id ?? `cluster-context-${hashText(`${context.id}-${now}`).slice(0, 10)}`;
  const topicKey = existing?.topic_key ?? `context-${normalizeTopicKey(context.id)}`;
  const clusterSummary = `${context.title} Context의 Goal 체크 상태와 병렬 진행 주제를 사용자가 직접 관리하고 있다.`;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO conversation_turns
        (id, user_content, assistant_content, active_context_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(turnId, actionSummary, '사용자가 직접 변경한 Context 상태를 로컬 RAG에 반영함.', context.id, now);

    if (existing) {
      db.prepare(
        `UPDATE rag_clusters
         SET canonical_title = ?, summary = ?, goal_snapshot = ?, state_snapshot = ?,
             evidence_count = evidence_count + 1, user_turn_count = user_turn_count + 1,
             project_worthiness = MAX(project_worthiness, 1),
             embedding = COALESCE(?, embedding), converted_context_id = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        context.title,
        clusterSummary,
        goalSnapshot,
        stateSnapshot,
        embedding ? JSON.stringify(embedding) : null,
        context.id,
        now,
        existing.id,
      );
    } else {
      db.prepare(
        `INSERT INTO rag_clusters
          (id, topic_key, canonical_title, summary, goal_snapshot, state_snapshot,
           evidence_count, user_turn_count, project_worthiness, embedding,
           converted_context_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?, ?)`,
      ).run(
        clusterId,
        topicKey,
        context.title,
        clusterSummary,
        goalSnapshot,
        stateSnapshot,
        embedding ? JSON.stringify(embedding) : null,
        context.id,
        now,
        now,
      );
    }

    db.prepare(
      `INSERT INTO rag_memories
        (id, cluster_id, turn_id, original_content, summary, durable_facts,
         goal_signal, state_signal, project_worthiness, embedding, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      memoryId,
      clusterId,
      turnId,
      actionSummary,
      actionSummary,
      JSON.stringify([actionSummary, `현재 Goal 체크리스트: ${goalSnapshot}`]),
      goalSnapshot,
      stateSnapshot,
      embedding ? JSON.stringify(embedding) : null,
      now,
    );

    db.prepare(`DELETE FROM context_goals WHERE context_id = ?`).run(context.id);
    const insertGoal = db.prepare(
      `INSERT INTO context_goals
        (context_id, goal_id, title, completed, created_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of context.goalItems) {
      insertGoal.run(
        context.id,
        item.id,
        item.title,
        item.completed ? 1 : 0,
        item.createdAt,
        item.completedAt ?? null,
        now,
      );
    }

    db.prepare(`DELETE FROM context_progress_topics WHERE context_id = ?`).run(context.id);
    const insertProgress = db.prepare(
      `INSERT INTO context_progress_topics
        (context_id, topic_id, title, summary, status, topic_updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const topic of context.progressTopics) {
      insertProgress.run(
        context.id,
        topic.id,
        topic.title,
        topic.summary,
        topic.status,
        topic.updatedAt,
        now,
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { clusterId, memoryId, savedAt: now };
}

export function getRagStats() {
  const db = getDatabase();
  const memory = db.prepare(`SELECT COUNT(*) AS count FROM rag_memories`).get() as unknown as { count: number };
  const clusters = db.prepare(`SELECT COUNT(*) AS count FROM rag_clusters`).get() as unknown as { count: number };
  const turns = db.prepare(`SELECT COUNT(*) AS count FROM conversation_turns`).get() as unknown as { count: number };
  return { memories: Number(memory.count), clusters: Number(clusters.count), turns: Number(turns.count) };
}

function getDatabase() {
  if (database) return database;
  const configuredDatabasePath = process.env.ALCHEMYNOTE_RAG_DB_PATH?.trim();
  const configuredDirectory = process.env.ALCHEMYNOTE_DATA_DIR?.trim();
  const dataDirectory = resolve(configuredDirectory || join(process.cwd(), 'data'));
  mkdirSync(dataDirectory, { recursive: true });
  const databasePath = configuredDatabasePath
    ? resolve(configuredDatabasePath)
    : join(dataDirectory, 'alchemynote-rag.db');
  database = new DatabaseSync(databasePath);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversation_turns (
      id TEXT PRIMARY KEY,
      user_content TEXT NOT NULL,
      assistant_content TEXT NOT NULL,
      active_context_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rag_clusters (
      id TEXT PRIMARY KEY,
      topic_key TEXT NOT NULL,
      canonical_title TEXT NOT NULL,
      summary TEXT NOT NULL,
      goal_snapshot TEXT NOT NULL DEFAULT '',
      state_snapshot TEXT NOT NULL DEFAULT '',
      evidence_count INTEGER NOT NULL DEFAULT 1,
      user_turn_count INTEGER NOT NULL DEFAULT 1,
      project_worthiness REAL NOT NULL DEFAULT 0,
      embedding TEXT,
      converted_context_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_clusters_topic_key
      ON rag_clusters(topic_key);
    CREATE INDEX IF NOT EXISTS idx_rag_clusters_updated_at
      ON rag_clusters(updated_at DESC);
    CREATE TABLE IF NOT EXISTS rag_memories (
      id TEXT PRIMARY KEY,
      cluster_id TEXT,
      turn_id TEXT NOT NULL,
      original_content TEXT NOT NULL,
      summary TEXT NOT NULL,
      durable_facts TEXT NOT NULL DEFAULT '[]',
      goal_signal TEXT NOT NULL DEFAULT '',
      state_signal TEXT NOT NULL DEFAULT '',
      project_worthiness REAL NOT NULL DEFAULT 0,
      embedding TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(cluster_id) REFERENCES rag_clusters(id),
      FOREIGN KEY(turn_id) REFERENCES conversation_turns(id)
    );
    CREATE INDEX IF NOT EXISTS idx_rag_memories_cluster_id
      ON rag_memories(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_rag_memories_created_at
      ON rag_memories(created_at DESC);
    CREATE TABLE IF NOT EXISTS context_goals (
      context_id TEXT NOT NULL,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (context_id, goal_id)
    );
    CREATE INDEX IF NOT EXISTS idx_context_goals_context_id
      ON context_goals(context_id);
    CREATE TABLE IF NOT EXISTS context_progress_topics (
      context_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      topic_updated_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (context_id, topic_id)
    );
    CREATE INDEX IF NOT EXISTS idx_context_progress_topics_context_id
      ON context_progress_topics(context_id);
  `);
  return database;
}

async function embedTexts(ai: GoogleGenAI, texts: string[]) {
  const model = process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
  const response = await ai.models.embedContent({
    model,
    contents: texts,
    config: {
      outputDimensionality: 768,
      ...(model === 'gemini-embedding-2' ? {} : { taskType: 'SEMANTIC_SIMILARITY' as const }),
    },
  });
  const embeddings = response.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error('Gemini returned an incomplete embedding batch.');
  }
  return embeddings.map((item) => item.values ?? []);
}

function findClusterById(db: DatabaseSync, id: string) {
  return db.prepare(`SELECT * FROM rag_clusters WHERE id = ?`).get(id) as unknown as ClusterRow | undefined;
}

function findClusterByTopicKey(db: DatabaseSync, topicKey: string) {
  return db.prepare(`SELECT * FROM rag_clusters WHERE topic_key = ?`).get(topicKey) as unknown as ClusterRow | undefined;
}

function findClusterByContext(db: DatabaseSync, contextId: string, contextTitle: string) {
  return db.prepare(
    `SELECT * FROM rag_clusters
     WHERE converted_context_id = ? OR canonical_title = ?
     ORDER BY CASE WHEN converted_context_id = ? THEN 0 ELSE 1 END, updated_at DESC
     LIMIT 1`,
  ).get(contextId, contextTitle, contextId) as unknown as ClusterRow | undefined;
}

function toCluster(row: ClusterRow): RagCluster {
  return {
    id: row.id,
    topicKey: row.topic_key,
    canonicalTitle: row.canonical_title,
    summary: row.summary,
    goalSnapshot: row.goal_snapshot,
    stateSnapshot: row.state_snapshot,
    evidenceCount: Number(row.evidence_count),
    userTurnCount: Number(row.user_turn_count),
    projectWorthiness: Number(row.project_worthiness),
    convertedContextId: row.converted_context_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeCanonicalTitle(
  value: string,
  topicKey: string,
  userContent: string,
  existingTitle?: string,
) {
  const title = compact(value).replace(/[.!?。]+$/g, '').slice(0, 48);
  const normalizedTitle = normalizeForComparison(title);
  const normalizedInput = normalizeForComparison(userContent);
  const isCopiedInput =
    normalizedTitle.length > 10 &&
    (normalizedInput.includes(normalizedTitle) || normalizedTitle.includes(normalizedInput));
  const looksLikeSentence = title.length > 32 || /(했어|할래|같아|한다|입니다|해봐|하겠다)$/.test(title);
  if (!title || isCopiedInput || looksLikeSentence) {
    return existingTitle || fallbackTitle(topicKey);
  }
  return title;
}

function fallbackTitle(topicKey: string) {
  if (/football|soccer|dribbl|축구|드리블/.test(topicKey)) return 'Football Development';
  if (/career|job|커리어|취업|이직/.test(topicKey)) return 'Career Direction';
  if (/english|language|영어/.test(topicKey)) return 'English Growth';
  if (/travel|trip|여행/.test(topicKey)) return 'Travel Plan';
  if (/health|fitness|운동|건강/.test(topicKey)) return 'Health & Fitness';
  return topicKey.split('-').filter(Boolean).slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Growing Context';
}

function normalizeTopicKey(value: string) {
  const key = compact(value).toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return key || 'general-growth';
}

function tokenize(value: string) {
  const tokens = new Set(
    compact(value).toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/(은|는|이|가|을|를|으로|로|에서|하고|인데|부터|까지|보다)$/g, ''))
      .filter((token) => token.length >= 2 && !stopWords.has(token)),
  );
  for (const group of semanticAliasGroups) {
    if (group.some((alias) => tokens.has(alias))) group.forEach((alias) => tokens.add(alias));
  }
  return tokens;
}

const stopWords = new Set(['그거', '이거', '요즘', '오늘', '내가', '나는', '우리', '하고', '있는', '같아', '싶어', '이번', '그리고', '그래서']);
const semanticAliasGroups = [
  ['축구', '리프팅', '헤딩', '드리블', '패스', '슈팅', '볼컨트롤', 'football', 'soccer'],
  ['영어', '회화', '토익', '단어', '발음', 'english'],
  ['여행', '항공', '숙소', '호텔', '일정', 'travel', 'trip'],
  ['커리어', '이직', '취업', '면접', '포트폴리오', 'career'],
];

function lexicalSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const cosineLike = intersection / Math.sqrt(left.size * right.size);
  const anchorBoost = [...left].filter((token) => right.has(token) && token.length >= 3).length;
  return clamp01(Math.max(cosineLike, anchorBoost >= 2 ? 0.58 : anchorBoost === 1 ? 0.32 : 0));
}

function hybridScore(lexical: number, semantic: number | null, recency: number) {
  if (semantic === null) return clamp01(lexical * 0.92 + recency * 0.08);
  return clamp01(lexical * 0.42 + semantic * 0.52 + recency * 0.06);
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dot / denominator : 0;
}

function recencyScore(value: string) {
  const ageHours = Math.max(0, (Date.now() - Date.parse(value)) / 3_600_000);
  return Math.exp(-ageHours / (24 * 30));
}

function parseEmbedding(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'number')
      ? parsed as number[]
      : null;
  } catch {
    return null;
  }
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function hashText(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
