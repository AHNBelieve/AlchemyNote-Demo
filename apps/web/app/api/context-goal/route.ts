import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordContextGoalToggle } from '@/lib/local-rag';

export const runtime = 'nodejs';

const progressStatuses = ['not_started', 'in_progress', 'improving', 'blocked', 'completed'] as const;

const requestSchema = z.object({
  changedGoalId: z.string().min(1).max(100),
  context: z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(80),
    goal: z.string().max(1200),
    currentState: z.string().max(1800),
    goalItems: z.array(z.object({
      id: z.string().min(1).max(100),
      title: z.string().trim().min(1).max(180),
      completed: z.boolean(),
      createdAt: z.string().max(64),
      completedAt: z.string().max(64).optional(),
    })).min(1).max(12),
    progressTopics: z.array(z.object({
      id: z.string().min(1).max(100),
      title: z.string().trim().min(1).max(100),
      summary: z.string().trim().min(1).max(500),
      status: z.enum(progressStatuses),
      updatedAt: z.string().max(64),
    })).max(12),
  }),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Goal 상태 형식을 확인해 주세요.' }, { status: 400 });
  }

  const goalItem = parsed.data.context.goalItems.find(
    (item) => item.id === parsed.data.changedGoalId,
  );
  if (!goalItem) {
    return NextResponse.json({ message: '변경할 Goal을 찾지 못했어요.' }, { status: 404 });
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : undefined;

  try {
    const saved = await recordContextGoalToggle({
      ai,
      context: parsed.data.context,
      goalItem,
    });
    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    console.error(
      '[AlchemyNote] Failed to persist a user-controlled Goal change.',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { message: 'Goal 변경을 로컬 RAG에 저장하지 못했어요.' },
      { status: 500 },
    );
  }
}
