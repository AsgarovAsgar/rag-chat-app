import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_TTL_MS } from './auth.constants';
import { AuthService, AuthUser } from './auth.service';
import type { AuthenticatedUser } from './authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const user = await this.authService.login(dto);
    const token = await this.jwtService.signAsync({ sub: user.id });

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_TTL_MS,
    });

    return user;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() current: AuthenticatedUser): Promise<AuthUser> {
    const user = await this.authService.findById(current.id);
    if (!user) {
      throw new NotFoundException('User no longer exists');
    }
    return user;
  }
}
