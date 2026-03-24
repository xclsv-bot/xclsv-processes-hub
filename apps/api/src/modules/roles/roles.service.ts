import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: Date;
}

// System roles that cannot be deleted
const SYSTEM_ROLES = ['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'];

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  async getAllRoles(): Promise<RoleDefinition[]> {
    const defaultRoles = await prisma.defaultRole.findMany({
      orderBy: { name: 'asc' },
    });

    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const countMap = new Map(roleCounts.map(r => [r.role, r._count.id]));

    return defaultRoles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      permissions: r.permissions as string[],
      isSystem: SYSTEM_ROLES.includes(r.name),
      userCount: countMap.get(r.name as any) || 0,
      createdAt: r.createdAt,
    }));
  }

  async getRole(roleId: string): Promise<RoleDefinition> {
    const role = await prisma.defaultRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const userCount = await prisma.user.count({
      where: { role: role.name as any },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions as string[],
      isSystem: SYSTEM_ROLES.includes(role.name),
      userCount,
      createdAt: role.createdAt,
    };
  }

  async createRole(name: string, permissions: string[], description?: string): Promise<RoleDefinition> {
    if (SYSTEM_ROLES.includes(name.toUpperCase())) {
      throw new BadRequestException('Cannot create role with system role name');
    }

    const existing = await prisma.defaultRole.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException('Role already exists');
    }

    const role = await prisma.defaultRole.create({
      data: {
        name,
        permissions,
        description,
      },
    });

    this.logger.log(`Role created: ${name}`);

    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions as string[],
      isSystem: false,
      userCount: 0,
      createdAt: role.createdAt,
    };
  }

  async updateRole(roleId: string, updates: { permissions?: string[]; description?: string }): Promise<RoleDefinition> {
    const role = await prisma.defaultRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updated = await prisma.defaultRole.update({
      where: { id: roleId },
      data: {
        permissions: updates.permissions ?? (role.permissions as string[]),
        description: updates.description ?? role.description,
      },
    });

    const userCount = await prisma.user.count({
      where: { role: updated.name as any },
    });

    this.logger.log(`Role updated: ${updated.name}`);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || undefined,
      permissions: updated.permissions as string[],
      isSystem: SYSTEM_ROLES.includes(updated.name),
      userCount,
      createdAt: updated.createdAt,
    };
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await prisma.defaultRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (SYSTEM_ROLES.includes(role.name)) {
      throw new BadRequestException('Cannot delete system role');
    }

    const userCount = await prisma.user.count({
      where: { role: role.name as any },
    });

    if (userCount > 0) {
      throw new BadRequestException('Cannot delete role with assigned users');
    }

    await prisma.defaultRole.delete({
      where: { id: roleId },
    });

    this.logger.log(`Role deleted: ${role.name}`);
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const validRoles = ['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'];
    if (!validRoles.includes(roleName)) {
      throw new BadRequestException('Invalid role');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: roleName as any },
    });

    this.logger.log(`User ${userId} assigned role ${roleName}`);
  }
}
