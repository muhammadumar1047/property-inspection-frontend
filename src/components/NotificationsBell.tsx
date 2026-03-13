'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import Modal from '@/components/ui/Modal';
import { notificationApi } from '@/lib/api/notification';

const NotificationsBell: React.FC = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const latest = useMemo(() => notifications.slice(0, 20), [notifications]);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<{
    id: string | number;
    title: string;
    message: string;
    createdAt?: string;
  } | null>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative" ref={popRef}>
      <button
        className="relative rounded-md p-2 hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] leading-4 rounded-full bg-red-600 text-white text-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-md shadow z-50">
          <div className="px-3 py-2 text-sm font-medium border-b flex items-center justify-between">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={async () => {
                  try {
                    const raw = localStorage.getItem('user');
                    const parsed = raw ? JSON.parse(raw) : null;
                    const uid = parsed?.domainUserId ?? parsed?.userId ?? parsed?.UserId;
                    if (uid) await notificationApi.markAllAsRead(uid);
                  } catch {}
                  markAllRead();
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          {latest.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No notifications</div>
          ) : (
            <ul className="max-h-80 overflow-auto divide-y">
              {latest.map((n, idx) => (
                <li
                  key={(n.id ?? idx) as any}
                  className="p-3 text-sm hover:bg-muted/40 cursor-pointer"
                  onClick={async () => {
                    // Attempt mark-as-read if the API id is a number
                    try {
                      const idNum = Number(n.id);
                      if (!Number.isNaN(idNum)) {
                        await notificationApi.markAsRead(idNum);
                      }
                    } catch {}
                    setSelected({ id: n.id, title: n.title, message: n.message, createdAt: n.createdAt });
                    setOpen(false);
                  }}
                >
                  <div className="font-medium line-clamp-1">{n.title}</div>
                  <div className="text-muted-foreground text-xs line-clamp-2">{n.message}</div>
                  <div className="text-muted-foreground text-[10px] mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Notification'}
        widthClassName="max-w-lg"
      >
        {selected && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">{selected.message}</div>
            <div className="pt-2 flex justify-end">
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationsBell;


