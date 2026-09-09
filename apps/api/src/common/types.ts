export const NOTE_TYPES = [
  'idea',
  'decision',
  'task',
  'information',
  'project',
] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

export interface NoteAnalysis {
  type: NoteType;
  summary: string;
  firstAction: string;
  projectCandidate: boolean;
  projectReason?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  type: NoteType | null;
  summary: string | null;
  firstAction: string | null;
  projectCandidate: boolean;
  projectReason?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: string;
  firstAction: string;
  relatedNotes: Note[];
  createdAt: string;
}

export interface ProjectDraft {
  title: string;
  description: string;
  goal: string;
  firstAction: string;
}

export type AnalysisMode = 'gemini' | 'demo';
