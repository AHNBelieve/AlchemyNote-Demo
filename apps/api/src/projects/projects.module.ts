import { Module } from '@nestjs/common';
import { NotesModule } from '../notes/notes.module';
import { ProjectToolController } from './project-tool.controller';
import { ProjectToolService } from './project-tool.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [NotesModule],
  controllers: [ProjectsController, ProjectToolController],
  providers: [ProjectsService, ProjectToolService],
})
export class ProjectsModule {}
