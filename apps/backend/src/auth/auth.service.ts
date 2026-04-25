import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';

const ADJECTIVES = [
  'Swift', 'Daring', 'Silent', 'Clever', 'Brave', 'Sly', 'Bold', 'Wise',
  'Royal', 'Noble', 'Mystic', 'Stormy', 'Sunny', 'Iron', 'Golden', 'Shadow',
];
const ANIMALS = [
  'Knight', 'Rook', 'Bishop', 'Pawn', 'Queen', 'Falcon', 'Tiger', 'Wolf',
  'Owl', 'Hawk', 'Panda', 'Otter', 'Fox', 'Bear', 'Lynx', 'Raven',
];

function randomUsername(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${a}${b}${n}`;
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

export interface JwtPayload {
  sub: string;
  username: string;
  guest: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async createGuest() {
    for (let i = 0; i < 5; i++) {
      const username = randomUsername();
      const exists = await this.prisma.user.findUnique({ where: { username } });
      if (exists) continue;
      const user = await this.prisma.user.create({
        data: {
          id: `g_${nanoid(10)}`,
          username,
          isGuest: true,
        },
      });
      const token = this.sign(user.id, user.username, true);
      return { token, user: this.safeUser(user) };
    }
    throw new Error('Could not allocate guest username');
  }

  async signup(username: string, password: string) {
    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('Username must be 3-24 chars, alphanumeric/_/-');
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new BadRequestException('Password must be 8-128 characters');
    }
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new ConflictException('Username taken');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: `u_${nanoid(12)}`,
        username,
        passwordHash,
        isGuest: false,
      },
    });
    const token = this.sign(user.id, user.username, false);
    return { token, user: this.safeUser(user) };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const token = this.sign(user.id, user.username, false);
    return { token, user: this.safeUser(user) };
  }

  sign(userId: string, username: string, guest: boolean): string {
    const payload: JwtPayload = { sub: userId, username, guest };
    return this.jwt.sign(payload);
  }

  verify(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token);
    } catch (err) {
      this.logger.warn(`JWT verify failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  safeUser(u: { id: string; username: string; rating: number; isGuest: boolean }) {
    return { id: u.id, username: u.username, rating: u.rating, isGuest: u.isGuest };
  }
}
