import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  AnalysisMode,
  NOTE_TYPES,
  NoteAnalysis,
  ProjectDraft,
} from '../common/types';

const analysisSchema = z.object({
  type: z.enum(NOTE_TYPES),
  summary: z.string().min(1).max(300),
  firstAction: z.string().min(1).max(300),
  projectCandidate: z.boolean(),
  projectReason: z.string().max(300).optional(),
});

const projectSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  goal: z.string().min(1).max(300),
  firstAction: z.string().min(1).max(300),
});

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly allowFallback: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey =
      this.config.get<string>('GEMINI_API_KEY') ??
      this.config.get<string>('GOOGLE_API_KEY') ??
      '';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.allowFallback =
      this.config.get<string>('ALLOW_DEMO_FALLBACK', 'true') !== 'false';
  }

  async analyzeNote(content: string): Promise<{
    analysis: NoteAnalysis;
    mode: AnalysisMode;
  }> {
    const prompt = `
당신은 정리되지 않은 한국어 또는 영어 메모를 실행 가능한 형태로 정돈하는 분석기입니다.

다음 기준으로 메모를 분석하세요.
- type: idea, decision, task, information, project 중 하나
- summary: 원문의 핵심만 담은 1~2문장
- firstAction: 사용자가 5~30분 안에 바로 할 수 있는 작고 구체적인 행동 하나
- projectCandidate: 여러 단계와 명확한 결과물이 필요한 생각이면 true
- projectReason: 프로젝트 후보일 때만 짧은 이유

추상적인 응원이나 조언은 피하고, 입력에 없는 사실을 만들지 마세요.

메모:
${content}
    `.trim();

    if (this.apiKey) {
      try {
        const analysis = await this.generateStructured(
          prompt,
          {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: [...NOTE_TYPES] },
              summary: { type: 'STRING' },
              firstAction: { type: 'STRING' },
              projectCandidate: { type: 'BOOLEAN' },
              projectReason: { type: 'STRING' },
            },
            required: ['type', 'summary', 'firstAction', 'projectCandidate'],
          },
          analysisSchema,
        );

        return {
          analysis: {
            ...analysis,
            projectReason: analysis.projectReason || undefined,
          },
          mode: 'gemini',
        };
      } catch (error) {
        this.logger.warn(
          `Gemini analysis failed; using demo fallback. ${this.errorMessage(error)}`,
        );
      }
    }

    if (!this.allowFallback) {
      throw new ServiceUnavailableException(
        'Gemini 분석을 사용할 수 없습니다. GEMINI_API_KEY를 확인해 주세요.',
      );
    }

    return { analysis: this.fallbackAnalysis(content), mode: 'demo' };
  }

  async createProjectDraft(
    content: string,
    analysis: NoteAnalysis,
  ): Promise<{ draft: ProjectDraft; mode: AnalysisMode }> {
    const prompt = `
다음 메모와 분석 결과를 작은 프로젝트 카드로 구조화하세요.
- title: 짧고 구체적인 프로젝트 이름
- description: 무엇을 하려는지 한 문장
- goal: 완료 상태가 보이는 한 문장
- firstAction: 5~30분 안에 실행할 수 있는 첫 행동 하나
범위를 키우거나 입력에 없는 기능을 추가하지 마세요.

원문: ${content}
분석 요약: ${analysis.summary}
추천 첫 행동: ${analysis.firstAction}
    `.trim();

    if (this.apiKey) {
      try {
        const draft = await this.generateStructured(
          prompt,
          {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              goal: { type: 'STRING' },
              firstAction: { type: 'STRING' },
            },
            required: ['title', 'description', 'goal', 'firstAction'],
          },
          projectSchema,
        );
        return { draft, mode: 'gemini' };
      } catch (error) {
        this.logger.warn(
          `Gemini project structuring failed; using demo fallback. ${this.errorMessage(error)}`,
        );
      }
    }

    if (!this.allowFallback) {
      throw new ServiceUnavailableException(
        'Gemini 프로젝트 생성을 사용할 수 없습니다. GEMINI_API_KEY를 확인해 주세요.',
      );
    }

    return {
      draft: {
        title: this.makeTitle(content),
        description: analysis.summary,
        goal: `${this.makeTitle(content)}의 가장 작은 완성본을 만든다.`,
        firstAction: analysis.firstAction,
      },
      mode: 'demo',
    };
  }

  private async generateStructured<T>(
    prompt: string,
    responseSchema: Record<string, unknown>,
    validator: z.ZodType<T>,
  ): Promise<T> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    const payload = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Gemini HTTP ${response.status}`);
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return validator.parse(JSON.parse(text));
  }

  private fallbackAnalysis(content: string): NoteAnalysis {
    const normalized = content.toLowerCase();
    const projectWords = [
      '프로젝트',
      '서비스',
      '앱',
      '만들고',
      '만들어',
      '완성',
      '출시',
      'project',
      'build',
      'launch',
    ];
    const decisionWords = ['고민', '결정', '선택', '할지', 'decision', 'whether'];
    const taskWords = ['해야', '하기', '필요', 'todo', 'need to', 'must'];
    const projectCandidate = projectWords.some((word) => normalized.includes(word));

    const type = projectCandidate
      ? 'project'
      : decisionWords.some((word) => normalized.includes(word))
        ? 'decision'
        : taskWords.some((word) => normalized.includes(word))
          ? 'task'
          : 'idea';

    const compact = content.replace(/\s+/g, ' ').trim();
    const summary =
      compact.length > 120 ? `${compact.slice(0, 117).trim()}…` : compact;

    const firstActions = {
      project: '완성하고 싶은 결과를 한 문장으로 쓰고, 꼭 필요한 기능 3개만 적어보세요.',
      decision: '결정 기준 3개를 적고 각 기준의 우선순위를 1~3으로 표시해보세요.',
      task: '이 일을 20분 안에 끝낼 수 있는 가장 작은 단계로 나눠 첫 단계부터 시작해보세요.',
      idea: '이 생각을 검증할 수 있는 가장 작은 실험을 3줄로 적어보세요.',
      information: '이 정보가 필요한 상황과 다음에 확인할 항목을 한 줄씩 적어보세요.',
    } as const;

    return {
      type,
      summary,
      firstAction: firstActions[type],
      projectCandidate,
      projectReason: projectCandidate
        ? '명확한 결과물을 향해 여러 단계로 진행할 수 있는 생각입니다.'
        : undefined,
    };
  }

  private makeTitle(content: string) {
    const compact = content.replace(/\s+/g, ' ').trim();
    const title = compact.split(/[.!?。\n]/)[0].slice(0, 32).trim();
    return title || '새 프로젝트';
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
