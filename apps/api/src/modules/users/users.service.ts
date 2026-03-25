import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { prisma } from '@xclsv/database';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
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

  /**
   * Generate an invite link for a user
   */
  async generateInvite(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const inviteToken = this.generateInviteToken();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken,
        inviteExpiresAt,
      },
    });

    return {
      inviteToken,
      inviteUrl: `/invite/${inviteToken}`,
      expiresAt: inviteExpiresAt,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  /**
   * Validate an invite token
   */
  async validateInvite(token: string) {
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        inviteExpiresAt: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid invite link');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired');
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      hasPassword: !!user.passwordHash,
    };
  }

  /**
   * Accept an invite and set password
   */
  async acceptInvite(token: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid invite link');
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiresAt: null,
        isActive: true,
      },
    });

    return { success: true, email: user.email };
  }

  /**
   * Create user and generate invite in one step
   */
  async inviteUser(data: { name: string; email: string; role?: string }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const inviteToken = this.generateInviteToken();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: (data.role as any) || 'EDITOR',
        inviteToken,
        inviteExpiresAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return {
      user,
      inviteToken,
      inviteUrl: `/invite/${inviteToken}`,
      expiresAt: inviteExpiresAt,
    };
  }
}
