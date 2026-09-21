import { query } from '../../config/db.js';

export interface NotificationItem {
  id: string;
  distributorId?: string;
  title: string;
  message: string;
  type: 'COMMISSION' | 'ENROLLMENT' | 'ORDER' | 'RANK' | 'SYSTEM' | 'GENERAL';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export class NotificationService {
  private static demoNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'Weekly Binary Commission Credited',
      message: '₹22,400.00 has been credited to your e-Wallet for matching volume in Week 38.',
      type: 'COMMISSION',
      isRead: false,
      actionUrl: '/wallet',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'notif-2',
      title: 'New Associate Enrolled in Left Leg',
      message: 'Deepak Verma enrolled under your Left Leg (BC 001). Member ID: 1861001.',
      type: 'ENROLLMENT',
      isRead: false,
      actionUrl: '/network',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'notif-3',
      title: 'Product Catalog Update: Electronics & Smart Living',
      message: 'New Smart Kitchen Air Fryer (40 BV) is now in stock at distributor wholesale rates.',
      type: 'ORDER',
      isRead: true,
      actionUrl: '/shop',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  static async getNotifications(memberId?: string): Promise<{ unreadCount: number; notifications: NotificationItem[] }> {
    try {
      const sql = `
        SELECT n.*
        FROM notifications n
        JOIN distributors d ON n.distributor_id = d.id
        WHERE d.member_id = $1 OR $1 IS NULL
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      const res = await query(sql, [memberId || null]);
      if (res && res.rows.length > 0) {
        const notifications = res.rows.map((r: any) => ({
          id: r.id,
          distributorId: r.distributor_id,
          title: r.title,
          message: r.message,
          type: r.type,
          isRead: r.is_read,
          actionUrl: r.action_url,
          createdAt: r.created_at
        }));
        const unreadCount = notifications.filter(n => !n.isRead).length;
        return { unreadCount, notifications };
      }
    } catch (e) {
      // Fallback
    }

    const unreadCount = this.demoNotifications.filter(n => !n.isRead).length;
    return { unreadCount, notifications: this.demoNotifications };
  }

  static async markAsRead(id: string): Promise<boolean> {
    try {
      await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [id]);
    } catch (e) {
      // Fallback
    }

    const item = this.demoNotifications.find(n => n.id === id);
    if (item) item.isRead = true;
    return true;
  }

  static async markAllAsRead(memberId?: string): Promise<boolean> {
    try {
      await query(
        `UPDATE notifications SET is_read = TRUE WHERE distributor_id IN (SELECT id FROM distributors WHERE member_id = $1 OR $1 IS NULL)`,
        [memberId || null]
      );
    } catch (e) {
      // Fallback
    }

    this.demoNotifications.forEach(n => (n.isRead = true));
    return true;
  }

  static async createNotification(
    distributorId: string,
    title: string,
    message: string,
    type: 'COMMISSION' | 'ENROLLMENT' | 'ORDER' | 'RANK' | 'SYSTEM' | 'GENERAL' = 'GENERAL',
    actionUrl?: string
  ): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      distributorId,
      title,
      message,
      type,
      isRead: false,
      actionUrl,
      createdAt: new Date().toISOString()
    };

    try {
      await query(
        `INSERT INTO notifications (distributor_id, title, message, type, action_url) VALUES ($1, $2, $3, $4, $5)`,
        [distributorId, title, message, type, actionUrl || null]
      );
    } catch (e) {
      // Fallback
    }

    this.demoNotifications.unshift(newNotif);
    return newNotif;
  }
}
