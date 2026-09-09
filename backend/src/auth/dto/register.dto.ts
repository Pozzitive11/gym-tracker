import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'vlad@example.com' })
  // нормалізація на межі системи: UNIQUE у Postgres порівнює байти, тож
  // 'Vlad@Mail.com' і 'vlad@mail.com' пройшли б як два різні акаунти.
  // trim не косметика — пробіл у кінці з мобільної клавіатури це класика.
  // Працює лише за transform: true у глобальному ValidationPipe
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  // MaxLength(72) прибрано: це було обмеження bcrypt, який мовчки обрізав
  // усе довше. argon2 такого ліміту не має
  @ApiProperty({ minLength: 8, example: 'correct-horse-battery' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
