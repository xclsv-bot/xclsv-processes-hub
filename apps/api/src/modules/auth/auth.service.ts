import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, LoginResponseDto, RegisterDto, RefreshTokenDto } from './dto';

// Temporary in-memory store (will be replaced with Prisma)
const users = new Map<string, any>();
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    // Check if user exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === dto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Create user
    const user = {
      id: uuidv4(),
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
      role: 'VIEWER', // Default role
      department: dto.department,
      createdAt: new Date(),
    };

    users.set(user.id, user);
    this.logger.log(`User registered: ${user.email}`);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // Find user
    const user = Array.from(users.values()).find((u) => u.email === dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateTokens(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<LoginResponseDto> {
    const tokenData = refreshTokens.get(dto.refreshToken);
    
    if (!tokenData || tokenData.expiresAt < new Date()) {
      refreshTokens.delete(dto.refreshToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = users.get(tokenData.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete old refresh token
    refreshTokens.delete(dto.refreshToken);

    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    refreshTokens.delete(refreshToken);
  }

  async validateUser(userId: string): Promise<any> {
    return users.get(userId);
  }

  private generateTokens(user: any): LoginResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();
    const expiresIn = 900; // 15 minutes in seconds

    // Store refresh token (7 days)
    refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
