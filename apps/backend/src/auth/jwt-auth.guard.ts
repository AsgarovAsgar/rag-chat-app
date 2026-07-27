import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AccessTokenPayload {
  sub: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token: unknown = request.cookies?.[ACCESS_TOKEN_COOKIE];

    if (typeof token !== 'string') {
      throw new UnauthorizedException('Not authenticated');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
