import { IsString, MaxLength } from 'class-validator';

export class CreateBlogCommentDto {
  @IsString()
  @MaxLength(2000)
  content!: string;
}
