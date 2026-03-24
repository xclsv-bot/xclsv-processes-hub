// Role-Based Access Control (RBAC) definitions

export enum Role {
  ADMIN = 'ADMIN',
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
}

// Role -> Permission mapping
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // Admin has all permissions
  
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

export function hasPermission(role: Role, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
