// Role-Based Access Control (RBAC) definitions

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum Permission {
  // Process permissions
  PROCESS_CREATE = 'process:create',
  PROCESS_READ = 'process:read',
  PROCESS_UPDATE = 'process:update',
  PROCESS_DELETE = 'process:delete',
  PROCESS_PUBLISH = 'process:publish',
  PROCESS_ARCHIVE = 'process:archive',
  PROCESS_MANAGE = 'process:manage',
  
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Comment permissions
  COMMENT_CREATE = 'comment:create',
  COMMENT_READ = 'comment:read',
  COMMENT_DELETE = 'comment:delete',
  
  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',
  
  // Role permissions
  ROLE_READ = 'role:read',
  ROLE_CREATE = 'role:create',
  ROLE_UPDATE = 'role:update',
  ROLE_DELETE = 'role:delete',
  ROLE_ASSIGN = 'role:assign',
}

// Role -> Permission mapping
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // Admin has all permissions
  
  [Role.MANAGER]: [
    Permission.PROCESS_CREATE,
    Permission.PROCESS_READ,
    Permission.PROCESS_UPDATE,
    Permission.PROCESS_DELETE,
    Permission.PROCESS_PUBLISH,
    Permission.PROCESS_ARCHIVE,
    Permission.PROCESS_MANAGE,
    Permission.USER_READ,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,
    Permission.COMMENT_DELETE,
    Permission.ROLE_READ,
    Permission.AUDIT_READ,
  ],
  
  [Role.EDITOR]: [
    Permission.PROCESS_CREATE,
    Permission.PROCESS_READ,
    Permission.PROCESS_UPDATE,
    Permission.PROCESS_PUBLISH,
    Permission.USER_READ,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,
    Permission.COMMENT_DELETE,
  ],
  
  [Role.VIEWER]: [
    Permission.PROCESS_READ,
    Permission.USER_READ,
    Permission.COMMENT_READ,
  ],
};

// Keep ROLE_PERMISSIONS for backward compatibility
export const ROLE_PERMISSIONS = RolePermissions;

export function hasPermission(role: Role, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
