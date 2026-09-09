import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NoteRow, ProjectRow, toNote, toProject } from '../common/mappers';
import { AnalysisMode, NoteAnalysis, Project } from '../common/types';
import { DatabaseService } from '../database/database.service';
import { NotesService } from '../notes/notes.service';
import { ProjectToolService } from './project-tool.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly notesService: NotesService,
    private readonly projectTool: ProjectToolService,
  ) {}

  async createFromNote(noteId: string): Promise<{
    project: Project;
    analysisMode: AnalysisMode;
  }> {
    const note = this.notesService.findOne(noteId);

    if (note.projectId) {
      return { project: this.findOne(note.projectId), analysisMode: 'demo' };
    }

    if (!note.type || !note.summary || !note.firstAction) {
      throw new NotFoundException('분석이 완료된 메모를 찾을 수 없습니다.');
    }

    const analysis: NoteAnalysis = {
      type: note.type,
      summary: note.summary,
      firstAction: note.firstAction,
      projectCandidate: note.projectCandidate,
      projectReason: note.projectReason,
    };
    const { draft, mode } = await this.projectTool.createProjectFromNote(
      note,
      analysis,
    );

    const projectId = randomUUID();
    const createdAt = new Date().toISOString();
    this.database.db.exec('BEGIN IMMEDIATE');
    try {
      this.database.db
        .prepare(
          `INSERT INTO projects
           (id, title, description, goal, status, first_action, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          projectId,
          draft.title,
          draft.description,
          draft.goal,
          '시작 전',
          draft.firstAction,
          createdAt,
        );

      this.database.db
        .prepare('UPDATE notes SET project_id = ? WHERE id = ?')
        .run(projectId, noteId);
      this.database.db.exec('COMMIT');
    } catch (error) {
      this.database.db.exec('ROLLBACK');
      throw error;
    }

    return { project: this.findOne(projectId), analysisMode: mode };
  }

  findAll(): Project[] {
    const rows = this.database.db
      .prepare('SELECT * FROM projects ORDER BY created_at DESC')
      .all() as unknown as ProjectRow[];
    return rows.map((row) => this.hydrate(row));
  }

  findOne(id: string): Project {
    const row = this.database.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as ProjectRow | undefined;
    if (!row) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }
    return this.hydrate(row);
  }

  private hydrate(row: ProjectRow): Project {
    const noteRows = this.database.db
      .prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC')
      .all(row.id) as unknown as NoteRow[];
    return toProject(row, noteRows.map(toNote));
  }
}
