import { ApiProperty } from '@nestjs/swagger';

export class ExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Жим лежачи' })
  name: string;

  // Клієнту не потрібен чужий userId — лише ознака «моя» для позначки в
  // каталозі
  @ApiProperty({ description: 'Вписана юзером, а не з системного каталогу' })
  isMine: boolean;
}
