import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(1, { message: '메모 내용을 입력해 주세요.' })
  @MaxLength(5000, { message: '메모는 5,000자 이하로 입력해 주세요.' })
  content!: string;
}
