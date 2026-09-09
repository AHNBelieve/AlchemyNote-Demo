import { Injectable } from '@nestjs/common';
import { Note, NoteAnalysis, ProjectDraft } from '../common/types';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class ProjectToolService {
  constructor(private readonly gemini: GeminiService) {}

  async createProjectFromNote(
    note: Note,
    analysis: NoteAnalysis,
  ): Promise<{
    draft: ProjectDraft;
    mode: 'gemini' | 'demo';
  }> {
    return this.gemini.createProjectDraft(note.content, analysis);
  }
}
