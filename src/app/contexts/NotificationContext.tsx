import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface AppNotification {
  _id: string;
  id?: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SOCKET_CANDIDATES = [
  (import.meta as any).env?.VITE_SOCKET_URL as string | undefined,
  'http://localhost:5000',
  'http://localhost:5001',
].filter(Boolean) as string[];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let currentIndex = 0
    const token = localStorage.getItem('smartqueue_token') || undefined
    let newSocket = io(SOCKET_CANDIDATES[currentIndex], {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    })

    newSocket.on('connect_error', () => {
      if (currentIndex < SOCKET_CANDIDATES.length - 1) {
        currentIndex++;
        newSocket.close();
        const t = localStorage.getItem('smartqueue_token') || undefined
        newSocket = io(SOCKET_CANDIDATES[currentIndex], {
          transports: ['websocket'],
          auth: t ? { token: t } : undefined,
        });
      }
    });

    newSocket.on('connect', () => {
      const uid = user.id || (user as any)._id
      if (uid) newSocket.emit('join_user', uid)
    });

    newSocket.on('notification', (newNotif: AppNotification) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast based on type
      if (newNotif.type === 'ticket_called') {
        toast.success(newNotif.title, { description: newNotif.message, duration: 8000 });
      } else {
        toast.info(newNotif.title, { description: newNotif.message });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
