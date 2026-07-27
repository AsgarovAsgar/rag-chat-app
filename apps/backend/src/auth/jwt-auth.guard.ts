import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';

interface AccessTokenPayload {
  sub: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
