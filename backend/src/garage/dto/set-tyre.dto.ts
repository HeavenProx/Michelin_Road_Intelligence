import { IsDateString, IsIn, IsInt, IsString } from 'class-validator';

export class SetTyreDto {
  @IsInt()
  bikeId!: number;

  @IsIn(['FRONT', 'REAR'])
  position!: 'FRONT' | 'REAR';

  @IsString()
  modelGlobalId!: string;

  @IsDateString()
  mountedDate!: string;
}
