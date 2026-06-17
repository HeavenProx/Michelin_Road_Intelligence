import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

/** Corps attendu par POST /api/reviews. Clés critères alignées sur le front. */
export class CreateReviewDto {
  @IsString()
  tire!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  grip!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  durabilite!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  confort!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  anticrv!: number;

  @IsString()
  @MaxLength(2000)
  comment!: string;
}
