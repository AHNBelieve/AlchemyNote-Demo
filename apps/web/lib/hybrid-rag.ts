import type { GoogleGenAI } from '@google/genai';

export interface ProjectSearchRecord {
  id: string;
  title: string;
  description: string;
  goal: string;
  currentState: string;
  focus?: string;
  widgets: Array<{
    title: string;
    value?: string;
    current?: number;
    max?: number;
    unit?: string;
    items?: Array<{
      title: string;
      description?: string;
      status?: string;
      date?: string;
    }>;
  }>;
  nextActions?: Array<{
    title: string;
    detail?: string;
    completed?: boolean;
  }>;
  recentChanges?: Array<{
    title: string;
    createdAt?: string;
  }>;
}

export interface RetrievedProject<T extends ProjectSearchRecord> {
  project: T;
  document: string;
  lexicalScore: number;
  semanticScore: number | null;
  hybridScore: number;
  exactTitle: boolean;
  confident: boolean;
}

export interface RetrievalResult<T extends ProjectSearchRecord> {
  mode: 'none' | 'lexical' | 'hybrid';
  ranked: Array<RetrievedProject<T>>;
  best: RetrievedProject<T> | null;
}

const embeddingCache = new Map<string, number[]>();

export async function retrieveProjectContext<T extends ProjectSearchRecord>({
  ai,
  query,
  recentUserMessages,
  projects,
  activeProjectId,
}: {
  ai: GoogleGenAI | null;
  query: string;
  recentUserMessages: string[];
  projects: T[];
  activeProjectId?: string;
}): Promise<RetrievalResult<T>> {
  if (!projects.length) {
    return { mode: 'none', ranked: [], best: null };
  }

  const previousTurns = recentUserMessages
    .map(compactText)
    .filter((entry) => entry && entry !== compactText(query))
    .slice(-2);
  const currentTokens = tokenize(query);
  const historyTokens = tokenize(previousTurns.join(' '));
  const pronounContinuation = /^(그거|그건|그걸|이거|이건|이걸|그 프로젝트|이 프로젝트|아까|계속|그러면|그럼)/.test(
    compactText(query),
  );

  const lexicalRows = projects.map((project) => {
    const document = buildProjectDocument(project);
    const exactTitle = compactText(query)
      .toLowerCase()
      .includes(project.title.toLowerCase());
    const currentScore = weightedLexicalScore(currentTokens, project);
    const historyScore = weightedLexicalScore(historyTokens, project);
    const activeContinuationBoost =
      project.id === activeProjectId && pronounContinuation
        ? 0.16
        : project.id === activeProjectId && currentScore >= 0.2
          ? 0.12
          : 0;
    const lexicalScore = clamp01(
      currentScore * 0.82 + historyScore * 0.18 + activeContinuationBoost,
    );

    return {
      project,
      document,
      lexicalScore,
      semanticScore: null as number | null,
      hybridScore: lexicalScore,
      exactTitle,
      confident: exactTitle || lexicalScore >= 0.34,
    };
  });

  if (!ai) {
    return finishRanking('lexical', lexicalRows);
  }

  try {
    const semanticScores = await createSemanticScores(
      ai,
      [
        previousTurns.length
          ? `이전 대화 맥락: ${previousTurns.join(' / ')}`
          : '',
        `현재 사용자 메시지: ${compactText(query)}`,
      ]
        .filter(Boolean)
        .join('\n'),
      lexicalRows.map((row) => ({
        id: row.project.id,
        title: row.project.title,
        document: row.document,
      })),
    );

    const hybridRows = lexicalRows.map((row) => {
      const semanticScore = semanticScores.get(row.project.id) ?? null;
      const semanticComponent = semanticScore ?? 0;
      const hybridScore = clamp01(
        row.lexicalScore * 0.42 + semanticComponent * 0.58,
      );
      const semanticOnlyMatch =
        semanticComponent >= 0.76 ||
        (semanticComponent >= 0.68 && row.lexicalScore >= 0.12);

      return {
        ...row,
        semanticScore,
        hybridScore,
        confident:
          row.exactTitle ||
          row.lexicalScore >= 0.34 ||
          hybridScore >= 0.5 ||
          semanticOnlyMatch,
      };
    });

    return finishRanking('hybrid', hybridRows);
  } catch (error) {
    console.error(
      '[AlchemyNote] Semantic retrieval failed; using lexical retrieval.',
      error instanceof Error ? error.message : error,
    );
    return finishRanking('lexical', lexicalRows);
  }
}

export function buildProjectDocument(project: ProjectSearchRecord) {
  const widgetFacts = project.widgets.flatMap((widget) => [
    [
      widget.title,
      widget.value,
      widget.current !== undefined
        ? `${widget.current}${widget.max !== undefined ? `/${widget.max}` : ''}${widget.unit ?? ''}`
        : '',
    ].filter(Boolean).join(': '),
    ...(widget.items ?? []).map((item) =>
      [item.title, item.description, item.status, item.date]
        .filter(Boolean)
        .join(' · '),
    ),
  ]);
  const nextActions = (project.nextActions ?? []).map((action) =>
    [action.title, action.detail, action.completed ? '완료' : '진행 예정']
      .filter(Boolean)
      .join(' · '),
  );
  const changes = (project.recentChanges ?? []).map((change) => change.title);

  return [
    `Context: ${project.title}`,
    `Description: ${project.description}`,
    `Goal: ${project.goal}`,
    `Current state: ${project.currentState}`,
    project.focus ? `Focus: ${project.focus}` : '',
    widgetFacts.length ? `Known facts: ${widgetFacts.join(' | ')}` : '',
    nextActions.length ? `Next actions: ${nextActions.join(' | ')}` : '',
    changes.length ? `Recent changes: ${changes.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 7000);
}

function finishRanking<T extends ProjectSearchRecord>(
  mode: RetrievalResult<T>['mode'],
  rows: Array<RetrievedProject<T>>,
): RetrievalResult<T> {
  const ranked = [...rows].sort((a, b) => b.hybridScore - a.hybridScore);
  const top = ranked[0] ?? null;
  const runnerUp = ranked[1];
  const hasClearLead =
    !runnerUp || top.hybridScore - runnerUp.hybridScore >= 0.035;
  const best = top?.confident && hasClearLead ? top : null;

  return { mode, ranked, best };
}

async function createSemanticScores(
  ai: GoogleGenAI,
  query: string,
  documents: Array<{ id: string; title: string; document: string }>,
) {
  const model =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
  const missingDocuments = documents.filter(
    (document) => !embeddingCache.has(cacheKey(model, document)),
  );
  const inputs = [
    query,
    ...missingDocuments.map(
      (document) => `검색 대상 Context “${document.title}”\n${document.document}`,
    ),
  ];
  const isEmbedding2 = model === 'gemini-embedding-2';
  const response = await ai.models.embedContent({
    model,
    contents: inputs,
    config: {
      outputDimensionality: 768,
      ...(isEmbedding2 ? {} : { taskType: 'SEMANTIC_SIMILARITY' }),
    },
  });
  const embeddings = response.embeddings ?? [];
  const queryEmbedding = embeddings[0]?.values;

  if (!queryEmbedding?.length || embeddings.length !== inputs.length) {
    throw new Error('Gemini Embedding returned an incomplete vector set.');
  }

  missingDocuments.forEach((document, index) => {
    const values = embeddings[index + 1]?.values;
    if (values?.length) {
      embeddingCache.set(cacheKey(model, document), values);
    }
  });

  return new Map(
    documents.map((document) => {
      const vector = embeddingCache.get(cacheKey(model, document));
      return [document.id, vector ? cosineSimilarity(queryEmbedding, vector) : 0];
    }),
  );
}

function cacheKey(
  model: string,
  document: { id: string; document: string },
) {
  return `${model}:${document.id}:${hashText(document.document)}`;
}

function weightedLexicalScore(
  queryTokens: Set<string>,
  project: ProjectSearchRecord,
) {
  if (!queryTokens.size) return 0;

  const detailText = [
    ...project.widgets.flatMap((widget) => [
      widget.title,
      widget.value ?? '',
      ...(widget.items ?? []).flatMap((item) => [
        item.title,
        item.description ?? '',
        item.status ?? '',
      ]),
    ]),
    ...(project.nextActions ?? []).flatMap((action) => [
      action.title,
      action.detail ?? '',
    ]),
    ...(project.recentChanges ?? []).map((change) => change.title),
  ].join(' ');

  const weightedScore =
    tokenSimilarity(queryTokens, tokenize(project.title)) * 0.3 +
      tokenSimilarity(queryTokens, tokenize(project.description)) * 0.18 +
      tokenSimilarity(queryTokens, tokenize(project.goal)) * 0.15 +
      tokenSimilarity(queryTokens, tokenize(project.currentState)) * 0.2 +
      tokenSimilarity(queryTokens, tokenize(project.focus ?? '')) * 0.07 +
      tokenSimilarity(queryTokens, tokenize(detailText)) * 0.1;
  const documentTokens = tokenize(buildProjectDocument(project));
  const anchoredMatches = [...queryTokens].filter(
    (token) => documentTokens.has(token) && (/^\d/.test(token) || token.length >= 3),
  ).length;
  const anchorScore =
    anchoredMatches >= 2 ? 0.52 : anchoredMatches === 1 ? 0.29 : 0;

  return clamp01(Math.max(weightedScore * 1.8, anchorScore));
}

function tokenSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / Math.sqrt(left.size * right.size);
}

function tokenize(value: string) {
  const stopWords = new Set([
    '그거',
    '이거',
    '요즘',
    '오늘',
    '내가',
    '나는',
    '우리',
    '하고',
    '있는',
    '같아',
    '싶어',
    '정도',
    '이번',
    '그리고',
    '그래서',
  ]);
  const tokens = new Set(
    compactText(value)
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, ' ')
      .split(/\s+/)
      .map((token) =>
        token.replace(
          /(은|는|이|가|을|를|으로|로|에서|에게|하고|인데|까지|부터|처럼|보다)$/g,
          '',
        ),
      )
      .map((token) =>
        token.replace(/^(\d[\d,.]*)(?:%|퍼센트|개|회|명|원|kg|분|시간|페이지|권|km)$/i, '$1'),
      )
      .filter((token) => token.length >= 2 && !stopWords.has(token)),
  );

  const semanticAliasGroups = [
    ['축구', '리프팅', '헤딩', '드리블', '패스', '슈팅', '볼컨트롤'],
    ['영어', '회화', '토익', '단어', '발음'],
    ['여행', '항공', '숙소', '호텔', '일정'],
    ['커리어', '이직', '취업', '면접', '포트폴리오'],
  ];
  for (const group of semanticAliasGroups) {
    if (group.some((alias) => tokens.has(alias))) {
      group.forEach((alias) => tokens.add(alias));
    }
  }

  return tokens;
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || !left.length) return 0;
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

function hashText(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
