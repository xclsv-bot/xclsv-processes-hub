import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';

export type NotificationType = 
  | 'PROCESS_PUBLISHED'
  | 'PROCESS_UPDATED'
  | 'PERMISSION_GRANTED'
  | 'VERIFICATION_DUE'
  | 'VERIFICATION_OVERDUE'
  | 'COMMENT_ADDED'
  | 'OWNERSHIP_TRANSFERRED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

// In-memory store for notifications (use Redis or DB in production)
const notifications = new Map<string, Notification[]>();

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };

    const userNotifs = notifications.get(userId) || [];
    userNotifs.unshift(notification);
    
    // Keep only last 100 notifications per user
    if (userNotifs.length > 100) {
      userNotifs.pop();
    }
    
    notifications.set(userId, userNotifs);

    this.logger.log(`Notification created for ${userId}: ${type}`);
    return notification;
  }

  async getForUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const userNotifs = notifications.get(userId) || [];
    
    if (unreadOnly) {
      return userNotifs.filter(n => !n.read);
    }
    
    return userNotifs;
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifs = notifications.get(userId) || [];
    const notif = userNotifs.find(n => n.id === notificationId);
    
    if (notif) {
      notif.read = true;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifs = notifications.get(userId) || [];
    userNotifs.forEach(n => n.read = true);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifs = notifications.get(userId) || [];
    return userNotifs.filter(n => !n.read).length;
  }

  // Helper methods for common notifications
  async notifyProcessPublished(processId: string, processTitle: string, publisherId: string) {
    // Notify all users with permissions on this process
    const permissions = await prisma.processPermission.findMany({
      where: { processId },
      select: { userId: true },
    });

    for (const perm of permissions) {
      if (perm.userId !== publisherId) {
        await this.create(
          perm.userId,
          'PROCESS_PUBLISHED',
          'Process Published',
          `"${processTitle}" has been published.`,
          { processId },
        );
      }
    }
  }

  async notifyVerificationDue(processId: string, processTitle: string, ownerId: string, dueDate: Date) {
    await this.create(
      ownerId,
      'VERIFICATION_DUE',
      'Verification Due Soon',
      `"${processTitle}" needs verification by ${dueDate.toLocaleDateString()}.`,
      { processId, dueDate: dueDate.toISOString() },
    );
  }

  async notifyOwnershipTransferred(processId: string, processTitle: string, newOwnerId: string) {
    await this.create(
      newOwnerId,
      'OWNERSHIP_TRANSFERRED',
      'Ownership Transferred',
      `You are now the owner of "${processTitle}".`,
      { processId },
    );
  }
}
