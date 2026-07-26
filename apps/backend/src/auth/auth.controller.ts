import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, AuthUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthUser> {
    return this.authService.register(dto);
  }
}
