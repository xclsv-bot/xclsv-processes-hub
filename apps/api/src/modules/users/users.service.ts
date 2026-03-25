import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma } from '@xclsv/database';

@Injectable()
export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async create(data: { name: string; email: string; role?: string }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: (data.role as any) || 'EDITOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: { name?: string; email?: string; role?: string }) {
    await this.findOne(id); // Ensure exists

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.role && { role: data.role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
