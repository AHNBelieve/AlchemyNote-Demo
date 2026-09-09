import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AnalysisMode, Note } from '../common/types';
import { NoteRow, toNote } from '../common/mappers';
import { DatabaseService } from '../database/database.service';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class NotesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly gemini: GeminiService,
  ) {}

  async create(content: string): Promise<{
    note: Note;
    analysisMode: AnalysisMode;
  }> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const normalizedContent = content.trim();

    this.database.db
      .prepare(
        `INSERT INTO notes (id, content, created_at)
         VALUES (?, ?, ?)`,
      )
      .run(id, normalizedContent, createdAt);

    const { analysis, mode } = await this.gemini.analyzeNote(normalizedContent);

    this.database.db
      .prepare(
        `UPDATE notes
         SET type = ?, summary = ?, first_action = ?, project_candidate = ?, project_reason = ?
         WHERE id = ?`,
      )
      .run(
        analysis.type,
        analysis.summary,
        analysis.firstAction,
        analysis.projectCandidate ? 1 : 0,
        analysis.projectReason ?? null,
        id,
      );

    return { note: this.findOne(id), analysisMode: mode };
  }

  findAll(): Note[] {
    const rows = this.database.db
      .prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT 50')
      .all() as unknown as NoteRow[];
    return rows.map(toNote);
  }

  findOne(id: string): Note {
    const row = this.database.db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(id) as NoteRow | undefined;

    if (!row) {
      throw new NotFoundException('메모를 찾을 수 없습니다.');
    }

    return toNote(row);
  }
}
