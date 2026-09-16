import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { REFRESH_TTL_MS } from './auth.constants.js';
import { DRIZZLE, type Db } from '../db/db.module.js';
import { sessions, users, type User } from '../db/schema.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

// код помилки Postgres на порушення UNIQUE-обмеження
const PG_UNIQUE_VIOLATION = '23505';
const EMAIL_TAKEN = 'Такий email вже зареєстрований';

// Drizzle загортає помилку драйвера, тож код лежить або на самій помилці,
// або в .cause. Перевіряємо обидва місця
function isUniqueViolation(error: unknown): boolean {
  const codes = [error, (error as { cause?: unknown })?.cause].map(
    (e) => (e as { code?: string } | undefined)?.code,
  );
  return codes.includes(PG_UNIQUE_VIOLATION);
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password } = dto;

    const passwordHash = await hash(password);

    let savedUser: User;
    try {
      // returning() обов'язковий: без нього INSERT нічого не віддає, а нам
      // потрібен id, який проставила база
      [savedUser] = await this.db
        .insert(users)
        .values({ email, passwordHash })
        .returning();
    } catch (error) {
      // окремої перевірки «чи є вже такий email» немає навмисно: вона не давала б
      // гарантії (між нею і вставкою є проміжок, а сам хеш займає ~100 мс), тож
      // два одночасні запити з однаковим email обидва її пройшли б. UNIQUE від
      // бази — єдина справжня перевірка, і другий запит має отримати 409, а не 500
      if (isUniqueViolation(error)) {
        throw new ConflictException(EMAIL_TAKEN);
      }
      throw error;
    }

    return await this.buildAuthResponse(savedUser);
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const isPasswordCorrect = await verify(user.passwordHash, password);
    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    return await this.buildAuthResponse(user);
  }

  async findUserById(userId: string) {
    // перелічуємо колонки явно: passwordHash не має покидати сервіс.
    // Раніше це робив @Exclude на класі-сутності, але сутностей більше немає —
    // Drizzle повертає звичайні об'єкти, і серіалізатор Nest над ними безсилий
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async refresh(token: string) {
    const { sessionId } = await this.verifyRefreshToken(token);

    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    // єдина перевірка в усьому потоці, що ходить у базу. Підпис і exp відкликати
    // неможливо — вони зафіксовані в момент видачі. Рядок можна.
    // Немає рядка = юзер вийшов або сесію вбили
    if (!session) throw new UnauthorizedException();

    // payload refresh-токена містить лише sessionId — хто саме цей юзер,
    // знає тільки рядок сесії. Це навмисно: payload читається відкрито
    const accessPayload = { sub: session.userId };

    return { accessToken: await this.jwtService.signAsync(accessPayload) };
  }

  async logout(token: string | undefined) {
    const payload = await this.verifyRefreshToken(token).catch(() => null);
    if (!payload) return;

    await this.db.delete(sessions).where(eq(sessions.id, payload.sessionId));
  }

  private async verifyRefreshToken(token: string | undefined) {
    if (!token) throw new UnauthorizedException();

    // читаємо ДО try: усередині нього getOrThrow спіймався б catch'ем нижче,
    // і відсутня змінна оточення виглядала б як невалідний токен
    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    try {
      return await this.jwtService.verifyAsync<{ sessionId: string }>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async buildAuthResponse(user: User) {
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      })
      .returning();

    const accessPayload = { sub: user.id };
    const refreshPayload = { sessionId: session.id };

    return {
      accessToken: await this.jwtService.signAsync(accessPayload),
      refreshToken: await this.jwtService.signAsync(refreshPayload, {
        // окремий секрет: інакше access-токен пройшов би перевірку на /auth/refresh
        // і навпаки, бо для verifyAsync вони були б нерозрізненні
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TTL_MS / 1000, // число = секунди
      }),
    };
  }
}
