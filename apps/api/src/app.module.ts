import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { GeminiModule } from './gemini/gemini.module';
import { NotesModule } from './notes/notes.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    GeminiModule,
    NotesModule,
    ProjectsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
