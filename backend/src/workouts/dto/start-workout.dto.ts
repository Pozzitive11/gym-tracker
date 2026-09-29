import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartWorkoutDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUIDv7, генерує клієнт — повтор запиту не створить друге тренування',
  })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid', description: 'День програми, який тренуємо' })
  @IsUUID()
  programDayId: string;
}
