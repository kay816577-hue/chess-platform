import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

class CredentialsDto {
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}

  @Post('guest')
  async guest() {
    return this.auth.createGuest();
  }

  @Post('signup')
  async signup(@Body() body: CredentialsDto) {
    return this.auth.signup(body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: CredentialsDto) {
    return this.auth.login(body.username, body.password);
  }

  @Get('me')
  async me(@Headers('authorization') authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = authHeader.slice('Bearer '.length);
    const payload = this.auth.verify(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.auth.safeUser(user);
  }
}
