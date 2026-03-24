import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Permission, Role } from './permissions';
import { AuthorizationGuard } from './authorization.guard';
import { JwtAuthGuard } from '@/common/guards';

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';

/**
 * Require specific permissions to access a route
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(JwtAuthGuard, AuthorizationGuard),
    ApiBearerAuth(),
    ApiForbiddenResponse({ description: 'Insufficient permissions' }),
  );

/**
 * Require specific roles to access a route
 */
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Admin-only route shorthand
 */
export const AdminOnly = () =>
  RequirePermissions(Permission.ADMIN_ACCESS);

/**
 * Editor+ route shorthand (editors and admins)
 */
export const EditorOnly = () =>
  RequirePermissions(Permission.PROCESS_CREATE);
