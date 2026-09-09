import { Note, NoteType, Project } from './types';

export interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  type: NoteType | null;
  summary: string | null;
  first_action: string | null;
  project_candidate: number;
  project_reason: string | null;
  project_id: string | null;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: string;
  first_action: string;
  created_at: string;
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    type: row.type,
    summary: row.summary,
    firstAction: row.first_action,
    projectCandidate: Boolean(row.project_candidate),
    projectReason: row.project_reason ?? undefined,
    projectId: row.project_id ?? undefined,
  };
}

export function toProject(row: ProjectRow, relatedNotes: Note[]): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goal: row.goal,
    status: row.status,
    firstAction: row.first_action,
    relatedNotes,
    createdAt: row.created_at,
  };
}
