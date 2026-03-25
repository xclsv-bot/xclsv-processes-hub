import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Public } from '@/common/decorators';

class CreateUserDto {
  name: string;
  email: string;
  role?: string;
}

class UpdateUserDto {
  name?: string;
  email?: string;
  role?: string;
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
}
