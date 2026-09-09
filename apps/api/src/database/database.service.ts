import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection!: DatabaseSync;

  onModuleInit() {
    const dataDirectory = join(process.cwd(), 'data');
    mkdirSync(dataDirectory, { recursive: true });

    this.connection = new DatabaseSync(join(dataDirectory, 'alchemynote.db'));
    this.connection.exec('PRAGMA journal_mode = WAL');
    this.connection.exec('PRAGMA foreign_keys = ON');

    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL,
        first_action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        type TEXT,
        summary TEXT,
        first_action TEXT,
        project_candidate INTEGER NOT NULL DEFAULT 0,
        project_reason TEXT,
        project_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notes_created_at
      ON notes(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_notes_project_id
      ON notes(project_id)
      WHERE project_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_projects_created_at
      ON projects(created_at DESC);
    `);
    this.connection.exec('PRAGMA optimize');
  }

  get db() {
    return this.connection;
  }

  onModuleDestroy() {
    this.connection?.close();
  }
}
