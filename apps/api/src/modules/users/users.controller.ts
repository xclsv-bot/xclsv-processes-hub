import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { Public } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll() {
    const users = await this.usersService.findAll();
    return { data: users };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return { data: user };
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return { data: user };
  }

  @Put(':id')
  @Public()
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return { data: user };
  }

  // Invite endpoints
  @Post(':id/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate invite link for existing user' })
  async generateInvite(@Param('id') id: string) {
    const result = await this.usersService.generateInvite(id);
    return { data: result };
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new user and generate invite' })
  async inviteUser(@Body() dto: CreateUserDto) {
    const result = await this.usersService.inviteUser(dto);
    return { data: result };
  }

  @Get('invite/:token')
  @Public()
  @ApiOperation({ summary: 'Validate invite token' })
  async validateInvite(@Param('token') token: string) {
    const result = await this.usersService.validateInvite(token);
    return { data: result };
  }

  @Post('invite/:token/accept')
  @Public()
  @ApiOperation({ summary: 'Accept invite and set password' })
  async acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ) {
    const result = await this.usersService.acceptInvite(token, dto.password);
    return { data: result };
  }
}
