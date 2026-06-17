import { IsDateString, IsString } from 'class-validator';

export class ReplaceTyreDto {
  @IsString()
  modelGlobalId!: string;

  @IsDateString()
  mountedDate!: string;
}
