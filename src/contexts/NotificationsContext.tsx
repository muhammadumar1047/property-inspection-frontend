'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/http';
import { notificationApi } from '@/lib/api/notification';

export type NotificationItem = {
  id: string | number;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
};

type NotificationsContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  addNotification: (n: NotificationItem) => void;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const hubRef = useRef<any | null>(null);

  // helper to increment unread
  const recalcUnread = (list: NotificationItem[]) => list.filter((n) => !n.read).length;

  const addNotification = (n: NotificationItem) => {
    setNotifications((prev) => {
      const next = [n, ...prev];
      setUnreadCount(recalcUnread(next));
      return next;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      return next;
    });
  };

  useEffect(() => {
    // Initial load of existing notifications
    (async () => {
      try {
        const raw = localStorage.getItem('user');
        const parsed = raw ? JSON.parse(raw) : null;
        const isSuperAdmin = !!parsed?.isSuperAdmin;
        const uid = parsed?.domainUserId ?? parsed?.userId ?? parsed?.UserId;
        // Skip loading notifications for super admins (e.g. AgencyManagement view)
        if (uid && !isSuperAdmin) {
          const list = await notificationApi.getForUser(uid);
          const mapped: NotificationItem[] = Array.isArray(list)
            ? list.map((n: any) => ({
                id: n.notificationRecipientId ?? n.id ?? n.notificationId ?? Math.random(),
                title: n.title ?? n.notificationTitle ?? 'Notification',
                message: n.message ?? n.notificationMessage ?? '',
                createdAt: n.createdAt ?? n.sentAt ?? n.CreatedAt,
                read: Boolean(n.isRead ?? n.read ?? n.IsRead),
              }))
            : [];
          mapped.sort((a, b) => {
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bt - at;
          });
          setNotifications(mapped);
          setUnreadCount(mapped.filter((x) => !x.read).length);
        }
      } catch {}
    })();

    debugger;
    let disposed = false;
    const start = async () => {
      try {
        // Load SignalR dynamically to avoid build-time module resolution issues
        const signalR = await import('@microsoft/signalr').then((m) => m).catch(() => null as any);
        if (!signalR) {
          console.warn('SignalR client not installed; skipping realtime notifications');
          return;
        }
        // Reuse a single connection across Fast Refresh/StrictMode mounts
        if (typeof window !== 'undefined' && (window as any).__pc360Hub) {
          hubRef.current = (window as any).__pc360Hub;
          return;
        }
        const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
        // Append userId to query so server can group the connection in OnConnectedAsync
        let uidParam = '';
        let userId = '';
        try {
          const raw = localStorage.getItem('user');
          const parsed = raw ? JSON.parse(raw) : null;
          const uid = parsed?.domainUserId ?? parsed?.userId ?? parsed?.UserId;
          if (uid !== undefined && uid !== null) {
            userId = uid;
            uidParam = `?userId=${encodeURIComponent(String(uid))}`;
          }
        } catch {}
        const cleanBase = baseURL.replace(/\/api$/, '');
        //const hubUrl = `${cleanBase}/notificationHub${uidParam}`;
      //const hubUrl = `https://localhost:7086/notificationHub?userId=${userId}`;
      debugger;
      const hubBaseUrl = process.env.NEXT_PUBLIC_SIGNALR_URL || "http://ec2-54-66-59-41.ap-southeast-2.compute.amazonaws.com:8080/notificationHub";
      const hubUrl = `${hubBaseUrl}?userId=${userId}`;

       
        const hub = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => {
              try {
                return localStorage.getItem('token') || '';
              } catch {
                return '';
              }
            },
            withCredentials: true,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        const handleInbound = (payload: any) => {
          const item: NotificationItem = {
            id: payload?.id ?? crypto.randomUUID?.() ?? Math.random(),
            title: payload?.title ?? 'Notification',
            message: payload?.message ?? '',
            createdAt: payload?.createdAt ?? new Date().toISOString(),
            read: false,
          };
          addNotification(item);
        };

        // Listen to common server event names
        hub.on('ReceiveNotification', handleInbound);
        hub.on('NotificationReceived', handleInbound);
        hub.on('Notify', handleInbound);
        hub.on('BroadcastNotification', handleInbound);

        // Tweak keepalive to reduce disconnects
        try {
          (hub as any).serverTimeoutInMilliseconds = 60000;
          (hub as any).keepAliveIntervalInMilliseconds = 15000;
        } catch {}
        await hub.start();
        if (typeof window !== 'undefined') {
          (window as any).__pc360Hub = hub;
        }
        hub.onclose(() => {
          console.info('Notifications hub closed');
        });
        // No explicit registration needed; hub uses userId query parameter
        if (disposed) {
          await hub.stop();
          return;
        }
        hubRef.current = hub;
      } catch (e) {
        console.error('SignalR connection failed:', e);
      }
    };
    start();
    return () => {
      disposed = true;
      // Keep the connection alive across Fast Refresh; stop on full unload only
      if (typeof window !== 'undefined') {
        const stopOnce = () => { try { hubRef.current?.stop(); } catch {} };
        window.addEventListener('beforeunload', stopOnce, { once: true });
      }
    };
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, addNotification }),
    [notifications, unreadCount]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};


