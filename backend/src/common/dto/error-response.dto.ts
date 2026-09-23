import { ApiProperty } from '@nestjs/swagger';

// Форма тіла помилки Nest (HttpException.createBody). Одна на всі контролери:
// Swagger реєструє схеми за іменем класу, тож два класи з однаковим іменем
// мовчки перезаписують один одного
export class ErrorResponseDto {
  @ApiProperty()
  statusCode: number;

  // Зазвичай рядок (помилки коду, бази, 500). Масивом буває лише 400 від
  // ValidationPipe: по рядку на кожне порушене правило
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  // Немає, коли виняток кинули без повідомлення (new NotFoundException())
  // і в 500 для непередбачених помилок
  @ApiProperty({ required: false })
  error?: string;
}
