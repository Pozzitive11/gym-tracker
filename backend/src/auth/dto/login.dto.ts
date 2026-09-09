import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'vlad@example.com' })
  // та сама нормалізація, що й у RegisterDto: інакше юзер, який зареєструвався
  // з нижнім регістром, не зміг би залогінитись, набравши email з великої
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
