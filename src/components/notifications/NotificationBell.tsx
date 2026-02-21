import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { role } = useAuth();
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_complaint':
        return '📝';
      case 'assignment':
        return '👷';
      case 'status_change':
        return '🔄';
      case 'completion':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNavigationTarget = (notification: { type: string; complaint_id: string | null }) => {
    const { type } = notification;

    if (role === 'citizen') {
      return '/my-complaints';
    }
    if (role === 'officer' || role === 'admin') {
      if (type === 'new_complaint' || type === 'status_change' || type === 'assignment') {
        return '/officer';
      }
      return '/dashboard';
    }
    if (role === 'worker') {
      return '/worker';
    }
    return '/dashboard';
  };

  const handleNotificationClick = (notification: Tables<'notifications'>) => {
    markAsRead(notification.id);
    const target = getNavigationTarget(notification);
    navigate(target);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex flex-col items-start gap-1 p-3 cursor-pointer',
                !notification.read && 'bg-primary/5'
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-center gap-2 w-full">
                <span>{getNotificationIcon(notification.type)}</span>
                <span className="font-medium text-sm flex-1">{notification.title}</span>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
