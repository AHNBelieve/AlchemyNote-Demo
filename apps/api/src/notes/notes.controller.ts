import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateNoteDto } from './create-note.dto';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Body() dto: CreateNoteDto) {
    return this.notesService.create(dto.content);
  }

  @Get()
  findAll() {
    return this.notesService.findAll();
  }
}
