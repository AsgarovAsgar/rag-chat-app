import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthService, AuthUser } from './auth.service';
import type { AuthenticatedUser } from './authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { SessionsService } from './sessions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
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
    const refreshToken = await this.sessionsService.issue(user.id);
    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    setAuthCookies(res, accessToken, refreshToken);
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

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof token !== 'string') {
      throw new UnauthorizedException('Not authenticated');
    }

    const { userId, refreshToken } = await this.sessionsService.rotate(token);
    const user = await this.authService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    const accessToken = await this.jwtService.signAsync({ sub: userId });
    setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof token === 'string') {
      await this.sessionsService.revokeFamily(token);
    }
    clearAuthCookies(res);
  }
}
