export type NoteType = 'idea' | 'decision' | 'task' | 'information' | 'project';

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

export type AnalysisMode = 'gemini' | 'demo';

export interface NoteResponse {
  note: Note;
  analysisMode: AnalysisMode;
}

export interface ProjectResponse {
  project: Project;
  analysisMode: AnalysisMode;
}
