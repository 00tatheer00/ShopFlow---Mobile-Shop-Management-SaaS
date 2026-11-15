'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  PackageX,
  ExternalLink,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from '@/app/(dashboard)/actions/notifications';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLatestNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Quiet fail if offline
    }
  }, []);

  // Initial fetch and poll every 45s
  useEffect(() => {
    fetchLatestNotifications();
    const interval = setInterval(fetchLatestNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchLatestNotifications]);

  // Close dropdown on click outside or Esc
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchLatestNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    // 1. Mark as read immediately in optimistic state
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      startTransition(async () => {
        await markNotificationAsRead(notif.id);
      });
    }

    setIsOpen(false);

    // 2. Navigate straight to that product inventory and adjust stock
    if (notif.entity_type === 'product' && notif.entity_id) {
      router.push(`/products?adjustStock=${notif.entity_id}`);
    } else {
      router.push('/products');
    }
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsAsRead(unreadIds);
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
        aria-label="Open notifications"
        title="Inventory and stock notifications"
      >
        <Bell className="h-4.5 w-4.5" />

        {/* Unread Badge Count */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-2xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  All caught up!
                </p>
                <p className="text-[11px] text-muted-foreground">
                  All product inventory levels are healthy and above their thresholds.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isOut =
                  typeof notif.metadata?.stock_quantity === 'number' &&
                  notif.metadata.stock_quantity === 0;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 transition-colors cursor-pointer group ${
                      !notif.is_read
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : 'hover:bg-muted/50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`shrink-0 mt-0.5 rounded-lg p-2 flex items-center justify-center ${
                        isOut
                          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isOut ? (
                        <PackageX className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-1 text-[10px] text-primary font-semibold mt-1 group-hover:underline">
                        <span>Click to adjust stock</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

