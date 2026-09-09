import { Controller, Param, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('notes')
export class ProjectToolController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post(':noteId/project')
  createFromNote(@Param('noteId') noteId: string) {
    return this.projectsService.createFromNote(noteId);
  }
}
