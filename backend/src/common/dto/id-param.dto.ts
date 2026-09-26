import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Параметри шляху :id як DTO, а не рядок. Валідує його той самий глобальний
// ValidationPipe, що й тіла запитів (main.ts): «abc» дає 400 на межі, а не
// 500 від Postgres на касті в uuid. Swagger читає @ApiProperty і описує
// параметр шляху як uuid — окремий @ApiParam не потрібен
export class IdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}
